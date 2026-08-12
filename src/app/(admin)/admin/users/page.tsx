import { AdminUsers } from "@/components/admin/admin-users";
import { listAdminUsers } from "@/lib/admin/users";
import { requireAdmin } from "@/lib/auth";

export default async function AdminUsersPage() {
  const [{ user }, initialPage] = await Promise.all([
    requireAdmin(),
    listAdminUsers({ search: "", role: "all", plan: "all", access: "all", page: 1, pageSize: 20 }),
  ]);
  return <AdminUsers initialPage={initialPage} currentAdminId={user.id} />;
}
