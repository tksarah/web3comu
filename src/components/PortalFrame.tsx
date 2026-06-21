import Link from "next/link";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/LogoutButton";

type Props = {
  walletAddress: string;
  title?: string;
  children: ReactNode;
};

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function PortalFrame({ walletAddress, title, children }: Props) {
  return (
    <main className="portal-page">
      <header className="portal-topbar pixel-panel">
        <Link className="brand-mark" href="/portal">
          <span className="crest">◆</span>
          <span>Web3分科会コミュニティ</span>
        </Link>
        <nav className="portal-nav" aria-label="ポータルメニュー">
          <Link href="/portal">ホーム</Link>
          <Link href="/portal/news">お知らせ</Link>
          <Link href="/portal/events">イベント</Link>
          <Link href="/portal/library">資料庫</Link>
          <Link href="/members">メンバー</Link>
          <Link href="/mypage">マイページ</Link>
        </nav>
        <div className="wallet-chip">{shortAddress(walletAddress)}</div>
        <LogoutButton className="pixel-button small" />
      </header>
      {title ? <h1 className="page-title">{title}</h1> : null}
      {children}
    </main>
  );
}
