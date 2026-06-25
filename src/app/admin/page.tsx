import { AdminDashboard } from "@/components/AdminDashboard";
import { AdminLogin } from "@/components/AdminLogin";
import { getAdminContext } from "@/lib/auth";
import {
  getNftConfig,
  listBadgeConfigs,
  listAdminFaucetClaims,
  listAdminMembers,
  listAdminPortalContent,
  listFaucetAllowlist,
  listFaucetSettings
} from "@/lib/repository";

export default async function AdminPage() {
  const admin = await getAdminContext();
  if (!admin) {
    return <AdminLogin />;
  }

  return (
    <AdminDashboard
      adminWallet={admin.session.walletAddress}
      initialFaucetAllowlist={listFaucetAllowlist()}
      initialFaucetClaims={listAdminFaucetClaims()}
      initialFaucetSettings={listFaucetSettings()}
      initialContents={listAdminPortalContent()}
      initialConfig={getNftConfig()}
      initialBadges={listBadgeConfigs()}
      initialMembers={listAdminMembers()}
    />
  );
}
