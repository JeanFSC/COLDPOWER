import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getAdminLandingPath } from "@/lib/admin-landing";

export const metadata: Metadata = {
  title: "Panel admin | ColdPower",
  description: "Dashboard ejecutivo de ColdPower.",
};

export default async function AdminDashboardPage() {
  const actor = await requireAdmin();
  redirect(getAdminLandingPath(actor.role));
}
