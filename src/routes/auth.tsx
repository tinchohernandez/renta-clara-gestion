import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar — Administra" },
      { name: "description", content: "Ingresá a tu panel de inmobiliaria, inquilino o propietario." },
      { property: "og:title", content: "Ingresar — Administra" },
      { property: "og:description", content: "Ingresá a tu panel de inmobiliaria, inquilino o propietario." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("login");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message === "Invalid login credentials" ? "Email o contraseña incorrectos" : error.message);
    navigate({ to: "/panel" });
  }
  async function signup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/panel" } });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Te enviamos un email para confirmar tu cuenta.");
    setTab("login");
  }
  async function forgot(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Si el email existe, vas a recibir un enlace para cambiar la contraseña.");
  }

  const fields = (withPassword: boolean) => (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`email-${tab}`}>Email</Label>
        <Input id={`email-${tab}`} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {withPassword && (
        <div className="space-y-1.5">
          <Label htmlFor={`pass-${tab}`}>Contraseña</Label>
          <Input id={`pass-${tab}`} type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="font-display text-3xl font-bold text-primary">Administra</Link>
        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Ingresar</TabsTrigger>
              <TabsTrigger value="signup">Registrarme</TabsTrigger>
              <TabsTrigger value="forgot">Olvidé</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={login} className="mt-4 space-y-4">
                {fields(true)}
                <Button className="w-full" disabled={busy}>Ingresar</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signup} className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Usá el mismo email que registraste en la inmobiliaria: así tu cuenta se vincula automáticamente a tu contrato o propiedades.
                </p>
                {fields(true)}
                <Button className="w-full" disabled={busy}>Crear cuenta</Button>
              </form>
            </TabsContent>
            <TabsContent value="forgot">
              <form onSubmit={forgot} className="mt-4 space-y-4">
                {fields(false)}
                <Button className="w-full" disabled={busy}>Enviar enlace</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
