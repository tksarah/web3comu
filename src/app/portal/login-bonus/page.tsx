import { redirect } from "next/navigation";

import { LoginBonusPanel } from "@/components/LoginBonusPanel";
import { PortalFrame } from "@/components/PortalFrame";
import { getPortalContext } from "@/lib/auth";

export default async function LoginBonusPage() {
  const context = await getPortalContext();
  if (!context) {
    redirect("/");
  }

  return (
    <PortalFrame title="ログインボーナス" walletAddress={context.session.walletAddress}>
      <LoginBonusPanel walletAddress={context.session.walletAddress} />
    </PortalFrame>
  );
}
