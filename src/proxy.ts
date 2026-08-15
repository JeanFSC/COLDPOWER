import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { authConfig, isAuthConfigured } from "@/lib/env";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { isStaffRole } from "@/lib/roles";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isAccountRoute = createRouteMatcher(["/cuenta(.*)"]);

async function hasPersistedStaffAccess(userId: string) {
  try {
    const [record] = await getDb().select({ role: users.role, roleCode: users.roleCode, status: users.status }).from(users).where(eq(users.id, userId)).limit(1);
    if (!record || record.status !== "ACTIVE") return false;
    const persistedRole = record.roleCode ?? (record.role === "admin" ? "admin" : "customer");
    return isStaffRole(persistedRole);
  } catch (error) {
    console.error("ColdPower: middleware no pudo verificar acceso persistido", error);
    return false;
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
      if (isAdminRoute(req)) {
        const { userId, redirectToSignIn } = await authFn();
        if (!userId) return redirectToSignIn({ returnBackUrl: getReturnBackUrl(req) });
        if (!(await hasPersistedStaffAccess(userId))) return NextResponse.redirect(new URL("/", req.url));
      } else if (isAccountRoute(req)) {
        const { userId, redirectToSignIn } = await authFn();
        if (!userId) return redirectToSignIn({ returnBackUrl: getReturnBackUrl(req) });
      }
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
