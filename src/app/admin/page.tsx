import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Panel admin | ColdPower",
  description: "Dashboard ejecutivo de ColdPower.",
};

export default async function AdminDashboardPage() {
  await requirePermission("dashboard.view");
  redirect("/admin/inicio");
}
