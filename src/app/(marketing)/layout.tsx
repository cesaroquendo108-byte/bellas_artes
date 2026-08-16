import { PublicMarketingShell } from "@/components/social"
import { getOptionalUser } from "@/lib/auth"

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getOptionalUser()
  return <PublicMarketingShell authenticated={Boolean(user)}>{children}</PublicMarketingShell>
}
