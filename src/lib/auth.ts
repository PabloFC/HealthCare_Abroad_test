export type PermissionCheckResult = {
  ok: boolean;
  status: number;
  message: string;
};

export function requireAdminPermission(request: Request): PermissionCheckResult {
  // Minimal, explicit permission check for demo purposes.
  const adminHeader = request.headers.get("x-admin");
  const permissionHeader = request.headers.get("x-permission");

  if (adminHeader !== "true") {
    return { ok: false, status: 401, message: "Admin access required." };
  }

  if (permissionHeader !== "triage:write") {
    return { ok: false, status: 403, message: "Missing triage write permission." };
  }

  return { ok: true, status: 200, message: "ok" };
}
