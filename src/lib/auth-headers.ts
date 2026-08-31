// Internal request headers proxy.ts (middleware) sets via
// NextResponse.next({ request: { headers } }) to hand the RSC render the
// staff-role lookup it already did for this same request. This is safe
// because Next.js exposes these only to the downstream render, not back to
// the client, and proxy.ts unconditionally overwrites them for every
// /admin(.*) request (matched userId comes from Clerk's own verified
// session, not from client input) — see requireAdmin() in lib/auth.ts for
// the consumer side, which never trusts a mismatched or missing header.
export const VERIFIED_USER_HEADER = "x-cp-verified-user";
export const VERIFIED_ROLE_HEADER = "x-cp-verified-role";
