import { describe, expect, it, vi } from "vitest";
import { clearAuthSession, getStoredAuthUser, saveAuthSession } from "./authStorage";

describe("authStorage", () => {
  it("persists the server roles and premium entitlement", () => {
    const user = { id: 7, username: "student", roles: ["ADMIN"], isPremium: true, premiumUntil: "2026-08-01T00:00:00.000Z" };
    saveAuthSession("signed-token", user);
    expect(localStorage.getItem("token")).toBe("signed-token");
    expect(getStoredAuthUser()).toEqual(user);
  });

  it("clears all compatibility session keys and notifies the app", () => {
    const listener = vi.fn();
    window.addEventListener("frame-school-auth-session", listener);
    saveAuthSession("signed-token", { id: 1 });
    clearAuthSession();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(localStorage.getItem("currentUser")).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener("frame-school-auth-session", listener);
  });
});
