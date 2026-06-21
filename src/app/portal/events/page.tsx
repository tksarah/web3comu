import Link from "next/link";
import { redirect } from "next/navigation";

import { PortalFrame } from "@/components/PortalFrame";
import { getMemberContext } from "@/lib/auth";

export default async function EventsPage() {
  const context = await getMemberContext();
  if (!context) {
    redirect("/");
  }

  return (
    <PortalFrame title="イベント" walletAddress={context.session.walletAddress}>
      <section className="pixel-panel focused-panel">
        <h2>イベントは準備中です</h2>
        <p>メンバー向けイベント情報をここに掲載予定です。</p>
        <Link className="pixel-button" href="/portal">
          ホームへ戻る
        </Link>
      </section>
    </PortalFrame>
  );
}
