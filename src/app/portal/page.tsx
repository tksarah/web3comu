import Link from "next/link";
import { redirect } from "next/navigation";

import { PortalFrame } from "@/components/PortalFrame";
import { getMemberContext } from "@/lib/auth";
import { formatBmtAmount, getBmtPortalStatus } from "@/lib/bmt";

function displayName(walletAddress: string, name: string | null) {
  return name || `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
}

export default async function PortalPage() {
  const context = await getMemberContext();
  if (!context) {
    redirect("/");
  }

  const name = displayName(context.session.walletAddress, context.member.displayName);
  const bmtStatus = await getBmtPortalStatus(context.session.walletAddress);
  const bmtBalanceLabel = bmtStatus ? formatBmtAmount(bmtStatus.balance) : "確認できません";
  const loginBonusLabel = bmtStatus
    ? bmtStatus.loginBonusClaimedToday
      ? "本日取得済み"
      : bmtStatus.canClaimLoginBonus
        ? "本日受け取り可能"
        : "本日は受け取り不可"
    : "1日1回のアイテム取得へ";

  return (
    <PortalFrame walletAddress={context.session.walletAddress}>
      <section className="portal-hero pixel-panel">
        <div>
          <h1>ようこそ、{name}</h1>
          <p>コミュニティメンバー専用の情報拠点です。</p>
        </div>
        <div className="crystal">◆</div>
      </section>

      <div className="portal-layout">
        <section className="portal-menu-grid" aria-label="ポータルメニュー">
          <Link className="menu-card image-menu-card" href="/portal/news">
            <img src="/images/info.png" alt="" />
            <strong>おしらせ</strong>
            <span>準備中</span>
          </Link>
          <Link className="menu-card image-menu-card" href="/portal/login-bonus">
            <img src="/images/treasure.png" alt="" />
            <strong>ログインボーナス</strong>
            <span>{loginBonusLabel}</span>
          </Link>
        </section>

        <aside className="portal-sidebar">
          <section className="pixel-panel status-panel">
            <h2>コミュニティステータス</h2>
            <p>認証状態: トークン確認済み</p>
            <p>BMT残高: {bmtBalanceLabel}</p>
            <p>ウォレット: {context.session.walletAddress}</p>
          </section>
          <section className="pixel-panel status-panel">
            <h2>今日のクエスト</h2>
            <p>ログインボーナスページへの導線を確認しましょう。</p>
            <Link className="pixel-button" href="/portal/login-bonus">
              今すぐ見る
            </Link>
          </section>
        </aside>
      </div>
    </PortalFrame>
  );
}
