import { redirect } from "next/navigation";

import { PortalFrame } from "@/components/PortalFrame";
import { getPortalContext } from "@/lib/auth";

export default async function EventsPage() {
  const context = await getPortalContext();
  if (!context) {
    redirect("/");
  }

  return (
    <PortalFrame title="イベント" walletAddress={context.session.walletAddress}>
      <section className="pixel-panel focused-panel">
        <h2>イベントは準備中です</h2>
        <p>メンバー向けイベント情報をここに掲載予定です。</p>
      </section>
    </PortalFrame>
  );
}
