export type PermissionCheckResult = {
  ok: boolean;
  status: number;
  message: string;
};

export function requireAdminPermission(): PermissionCheckResult {
  // Placeholder: replace with real auth/session permission checks.
  return { ok: true, status: 200, message: "ok" };
}
