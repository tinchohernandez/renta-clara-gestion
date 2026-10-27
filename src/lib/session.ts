import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "owner" | "tenant";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return { user: null, roles: [] as Role[] };
      const { data: rows } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      return { user, roles: (rows ?? []).map((r) => r.role as Role) };
    },
  });
}

export async function signedUrl(path: string) {
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 600);
  if (error || !data) throw new Error("No se pudo abrir el archivo");
  window.open(data.signedUrl, "_blank");
}

export async function uploadDoc(file: File, folder: string) {
  const { data } = await supabase.auth.getUser();
  const ext = file.name.split(".").pop() || "bin";
  const path = `${data.user!.id}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  return path;
}
