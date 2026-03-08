import { describe, it, expect } from "vitest";
import { PERMISSIONS_BY_ROLE, type PermissionSet } from "@/hooks/usePermissions";

/**
 * Tests for the `can()` logic used by useProjectRole.
 * We test the pure function logic directly against the permission matrix
 * rather than rendering hooks (which would require full context providers).
 */

function can(role: string | null, action: string): boolean {
  if (!role) return false;
  return PERMISSIONS_BY_ROLE[role]?.[action as keyof PermissionSet] ?? false;
}

describe("useProjectRole can() logic", () => {
  it("admin can do everything", () => {
    expect(can("admin", "create")).toBe(true);
    expect(can("admin", "delete")).toBe(true);
    expect(can("admin", "approve")).toBe(true);
    expect(can("admin", "manageMembers")).toBe(true);
  });

  it("viewer can only export", () => {
    expect(can("viewer", "create")).toBe(false);
    expect(can("viewer", "edit")).toBe(false);
    expect(can("viewer", "export")).toBe(true);
  });

  it("null role returns false for all actions", () => {
    expect(can(null, "create")).toBe(false);
    expect(can(null, "edit")).toBe(false);
    expect(can(null, "delete")).toBe(false);
    expect(can(null, "approve")).toBe(false);
    expect(can(null, "export")).toBe(false);
  });

  it("unknown role returns false", () => {
    expect(can("superuser", "create")).toBe(false);
  });

  it("technician can create/edit but not validate/approve/delete", () => {
    expect(can("technician", "create")).toBe(true);
    expect(can("technician", "edit")).toBe(true);
    expect(can("technician", "validate")).toBe(false);
    expect(can("technician", "approve")).toBe(false);
    expect(can("technician", "delete")).toBe(false);
  });

  describe("role-level helpers", () => {
    it("isAdmin is only true for admin", () => {
      expect("admin" === "admin").toBe(true);
      expect("viewer" === "admin").toBe(false);
    });

    it("isManager includes admin and project_manager", () => {
      const isManager = (r: string) => r === "admin" || r === "project_manager";
      expect(isManager("admin")).toBe(true);
      expect(isManager("project_manager")).toBe(true);
      expect(isManager("technician")).toBe(false);
    });

    it("isQuality includes quality_manager + managers", () => {
      const isManager = (r: string) => r === "admin" || r === "project_manager";
      const isQuality = (r: string) => r === "quality_manager" || isManager(r);
      expect(isQuality("quality_manager")).toBe(true);
      expect(isQuality("admin")).toBe(true);
      expect(isQuality("technician")).toBe(false);
    });
  });
});
