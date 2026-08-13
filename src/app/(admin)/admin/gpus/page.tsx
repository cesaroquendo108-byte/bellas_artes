import { redirect } from "next/navigation";

import { AdminVastGpus } from "@/components/admin/admin-vast-gpus";
import { getVastAdminServerConfig, isVastAdminOperator } from "@/lib/admin/vast-client";
import { getVastAdminOverview } from "@/lib/admin/vast-service";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminGpusPage() {
  const { profile } = await requireAdmin();
  if (!isVastAdminOperator(profile.email, getVastAdminServerConfig())) redirect("/admin");
  return <AdminVastGpus initialOverview={await getVastAdminOverview()} />;
}
