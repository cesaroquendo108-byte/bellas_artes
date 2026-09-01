import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getAdminDashboardSnapshot } from "@/lib/admin/dashboard";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const snapshot = await getAdminDashboardSnapshot("24h");
  return <AdminDashboard initialSnapshot={snapshot} />;
}
