import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { authConfig, isAuthConfigured } from "@/lib/env";
import { getDevAuthUserId } from "@/lib/dev-auth-bypass";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { isStaffRole, type AppRole } from "@/lib/roles";
import { VERIFIED_ROLE_HEADER, VERIFIED_USER_HEADER } from "@/lib/auth-headers";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isAccountRoute = createRouteMatcher(["/cuenta(.*)"]);

async function resolveStaffAccess(userId: string): Promise<{ role: AppRole } | null> {
  try {
    const [record] = await getDb().select({ role: users.role, roleCode: users.roleCode, status: users.status }).from(users).where(eq(users.id, userId)).limit(1);
    if (!record || record.status !== "ACTIVE") return null;
    const persistedRole = record.roleCode ?? (record.role === "admin" ? "admin" : "customer");
    return isStaffRole(persistedRole) ? { role: persistedRole as AppRole } : null;
  } catch (error) {
    console.error("ColdPower: middleware no pudo verificar acceso persistido", error);
    return null;
  }
}

function getReturnBackUrl(req: Request) {
  const url = new URL(req.url);
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim();
  const requestHost = forwardedHost || req.headers.get("host")?.trim();
  const forwardedProtocol = req.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim();
  if (requestHost) {
    url.host = requestHost;
    // URL.host keeps the original port when the replacement host has none.
    // That would turn the public dev origin into https://dev.coldpower.pe:3000.
    const hostHasPort = requestHost.startsWith("[") ? requestHost.includes("]:") : /^.+:\d+$/.test(requestHost);
    if (!hostHasPort) url.port = "";
  }
  if (forwardedProtocol === "http" || forwardedProtocol === "https") url.protocol = `${forwardedProtocol}:`;
  return url.toString();
}

const middleware = isAuthConfigured
  ? clerkMiddleware(async (authFn, req) => {
      // Strip any client-supplied values for these headers unconditionally,
      // on every request, before any branching below. Only the admin branch
      // re-sets them, from a value it just computed itself. This guarantees
      // a client can never smuggle a fake verified-role header through a
      // route this proxy doesn't happen to special-case (present or future),
      // instead of relying on each branch below remembering to overwrite it.
      const requestHeaders = new Headers(req.headers);
      requestHeaders.delete(VERIFIED_USER_HEADER);
      requestHeaders.delete(VERIFIED_ROLE_HEADER);

      if ((isAdminRoute(req) || isAccountRoute(req)) && getDevAuthUserId(req.headers.get("host"))) {
        return NextResponse.next({ request: { headers: requestHeaders } });
      }
      if (isAdminRoute(req)) {
        const { userId, redirectToSignIn } = await authFn();
        if (!userId) return redirectToSignIn({ returnBackUrl: getReturnBackUrl(req) });
        const access = await resolveStaffAccess(userId);
        if (!access) return NextResponse.redirect(new URL("/", req.url));
        // Hand the already-verified role to the page render so requireAdmin()
        // doesn't repeat this same Neon lookup a second time per navigation.
        requestHeaders.set(VERIFIED_USER_HEADER, userId);
        requestHeaders.set(VERIFIED_ROLE_HEADER, access.role);
        return NextResponse.next({ request: { headers: requestHeaders } });
      } else if (isAccountRoute(req)) {
        const { userId, redirectToSignIn } = await authFn();
        if (!userId) return redirectToSignIn({ returnBackUrl: getReturnBackUrl(req) });
      }
      return NextResponse.next({ request: { headers: requestHeaders } });
    }, {
      signInUrl: authConfig.signInUrl,
      signUpUrl: authConfig.signUpUrl,
    })
  : () => NextResponse.next();

export default middleware;

export const config = {
  matcher: [
    "/((?!_next|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)",
    "/(api|trpc)(.*)",
  ],
};
