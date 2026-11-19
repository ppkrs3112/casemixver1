import { describe, expect, it } from "vitest";
import { DEFAULT_APPEARANCE, LOGO_LIMIT, validateLogo, normalizeAppearance } from "./appearance";
describe("Appearance settings rules", () => {
  it("hides starting accounts by default", () =>
    expect(DEFAULT_APPEARANCE.showAccounts).toBe(false));
  it("allows PNG and JPG up to 2MB", () => {
    expect(LOGO_LIMIT).toBe(2097152);
    expect(validateLogo({ type: "image/png", size: 2097152 })).toBeNull();
    expect(validateLogo({ type: "image/jpeg", size: 2097152 })).toBeNull();
    expect(validateLogo({ type: "image/png", size: 2097153 })).not.toBeNull();
  });
  it("rejects other logo formats", () =>
    expect(validateLogo({ type: "image/svg+xml", size: 100 })).not.toBeNull());
  it("keeps valid saved colors and rejects invalid colors", () => {
    expect(normalizeAppearance({ primary: "#C0267A" }).primary).toBe("#C0267A");
    expect(normalizeAppearance({ primary: "invalid" }).primary).toBe(DEFAULT_APPEARANCE.primary);
  });
});
