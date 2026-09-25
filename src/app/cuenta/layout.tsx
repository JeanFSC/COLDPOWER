import { currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { AccountWorkspace } from "@/components/account/AccountWorkspace";
import { emptyAccountOverview, getAccountOverview } from "@/lib/account-overview";
import { requireUser } from "@/lib/auth";
import { getDevAuthUserId } from "@/lib/dev-auth-bypass";
import { isAuthConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function CuentaLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { userId, role } = await requireUser();
  const devAuthUserId = getDevAuthUserId((await headers()).get("host"));
  let overview = emptyAccountOverview(role);
  try {
    overview = await getAccountOverview(userId, role);
  } catch (error) {
    console.error("ColdPower: no se pudo cargar la navegación de cuenta", error);
  }

  let emailVerified = false;
  if (isAuthConfigured) {
    try {
      const clerkUser = await currentUser();
      emailVerified = clerkUser?.id === userId && clerkUser.primaryEmailAddress?.verification?.status === "verified";
    } catch (error) {
      console.warn("ColdPower: no se pudo verificar el correo de Clerk para la cuenta", error);
    }
  }

  return (
    <AccountWorkspace
      navigation={{
        profile: overview.profile,
        access: overview.access,
        counts: overview.counts,
        emailVerified,
        authEnabled: isAuthConfigured && !devAuthUserId,
      }}
    >
      {children}
    </AccountWorkspace>
  );
}
