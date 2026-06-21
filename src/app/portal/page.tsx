import Link from "next/link";
import { redirect } from "next/navigation";

import { PortalFrame } from "@/components/PortalFrame";
import { getPortalContext } from "@/lib/auth";
import { formatBmtAmount, getBmtPortalStatus } from "@/lib/bmt";
import { countPublishedPortalContent, listPublishedPortalContent } from "@/lib/repository";
import type { PortalContent } from "@/lib/types";

function displayName(walletAddress: string, name: string | null) {
  return name || `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
}

function contentSummary(count: number, latest: PortalContent | undefined) {
  if (!count || !latest) {
    return "未掲載";
  }
  return `${count}件 / 最新: ${latest.title}`;
}

export default async function PortalPage() {
  const context = await getPortalContext();
  if (!context) {
    redirect("/");
  }

  const name = displayName(context.session.walletAddress, context.member.displayName);
  const bmtStatus = await getBmtPortalStatus(context.session.walletAddress);
  const latestNotices = listPublishedPortalContent("notice", 1);
  const latestResources = listPublishedPortalContent("resource", 1);
  const noticeCount = countPublishedPortalContent("notice");
  const resourceCount = countPublishedPortalContent("resource");
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
            <span>{contentSummary(noticeCount, latestNotices[0])}</span>
          </Link>
          <Link className="menu-card image-menu-card" href="/portal/library">
            <img src="/images/items.png" alt="" />
            <strong>ライブラリ</strong>
            <span>{contentSummary(resourceCount, latestResources[0])}</span>
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
            <p>認証状態: {context.isAdmin ? "管理ウォレット" : "トークン確認済み"}</p>
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
