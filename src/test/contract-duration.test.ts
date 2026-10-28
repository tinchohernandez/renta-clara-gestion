import { describe, expect, it } from "vitest";
import { contractEndDate } from "@/lib/contract-duration";

describe("Contract duration in calendar months", () => {
  it("calculates the inclusive end date from the start and duration", () => {
    expect(contractEndDate("2026-11-01", 12)).toBe("2027-10-31");
    expect(contractEndDate("2026-10-15", "24")).toBe("2028-10-14");
    expect(contractEndDate("2026-10-15", 6)).toBe("2027-04-14");
  });

  it("handles month ends and leap years without overflowing into another month", () => {
    expect(contractEndDate("2026-01-31", 1)).toBe("2026-02-27");
    expect(contractEndDate("2028-01-31", 1)).toBe("2028-02-28");
    expect(contractEndDate("2028-02-29", 12)).toBe("2029-02-27");
  });

  it("requires a valid start date and a positive whole number of months", () => {
    for (const months of [undefined, "", 0, -1, 1.5, "abc"]) {
      expect(contractEndDate("2026-11-01", months)).toBe("");
    }
    expect(contractEndDate(undefined, 12)).toBe("");
    expect(contractEndDate("2026-02-30", 12)).toBe("");
  });
});