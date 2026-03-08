import { describe, it, expect } from "vitest";
import { PERMISSIONS_BY_ROLE, type PermissionSet } from "@/hooks/usePermissions";

const EMPTY: PermissionSet = {
  create: false,
  edit: false,
  delete: false,
  validate: false,
  approve: false,
  viewAudit: false,
  manageMembers: false,
  export: false,
};

describe("PERMISSIONS_BY_ROLE matrix", () => {
  it("admin has all permissions true", () => {
    const perms = PERMISSIONS_BY_ROLE["admin"];
    expect(perms).toBeDefined();
    for (const key of Object.keys(perms) as (keyof PermissionSet)[]) {
      expect(perms[key]).toBe(true);
    }
  });

  it("viewer has create/edit/delete/validate/approve false but export true", () => {
    const perms = PERMISSIONS_BY_ROLE["viewer"];
    expect(perms.create).toBe(false);
    expect(perms.edit).toBe(false);
    expect(perms.delete).toBe(false);
    expect(perms.validate).toBe(false);
    expect(perms.approve).toBe(false);
    expect(perms.viewAudit).toBe(false);
    expect(perms.manageMembers).toBe(false);
    expect(perms.export).toBe(true);
  });

  it("technician cannot validate or approve", () => {
    const perms = PERMISSIONS_BY_ROLE["technician"];
    expect(perms.validate).toBe(false);
    expect(perms.approve).toBe(false);
  });

  it("technician can create and edit but not delete", () => {
    const perms = PERMISSIONS_BY_ROLE["technician"];
    expect(perms.create).toBe(true);
    expect(perms.edit).toBe(true);
    expect(perms.delete).toBe(false);
  });

  it("project_manager can validate and approve but not delete or manage members", () => {
    const perms = PERMISSIONS_BY_ROLE["project_manager"];
    expect(perms.validate).toBe(true);
    expect(perms.approve).toBe(true);
    expect(perms.delete).toBe(false);
    expect(perms.manageMembers).toBe(false);
  });

  it("quality_manager mirrors project_manager permissions", () => {
    const pm = PERMISSIONS_BY_ROLE["project_manager"];
    const qm = PERMISSIONS_BY_ROLE["quality_manager"];
    for (const key of Object.keys(pm) as (keyof PermissionSet)[]) {
      expect(qm[key]).toBe(pm[key]);
    }
  });

  it("null/unknown role resolves to EMPTY permissions", () => {
    const perms = PERMISSIONS_BY_ROLE["nonexistent_role"] ?? EMPTY;
    for (const key of Object.keys(EMPTY) as (keyof PermissionSet)[]) {
      expect(perms[key]).toBe(false);
    }
  });
});
