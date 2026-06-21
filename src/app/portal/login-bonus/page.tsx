import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginBonusPanel } from "@/components/LoginBonusPanel";
import { PortalFrame } from "@/components/PortalFrame";
import { getMemberContext } from "@/lib/auth";

export default async function LoginBonusPage() {
  const context = await getMemberContext();
  if (!context) {
    redirect("/");
  }

  return (
    <PortalFrame title="ログインボーナス" walletAddress={context.session.walletAddress}>
      <LoginBonusPanel walletAddress={context.session.walletAddress} />
      <section className="focused-panel">
        <Link className="text-link" href="/portal">
          ポータルへ戻る
        </Link>
      </section>
    </PortalFrame>
  );
}
