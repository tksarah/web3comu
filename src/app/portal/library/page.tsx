import { redirect } from "next/navigation";

import { LinkedText } from "@/components/LinkedText";
import { PortalFrame } from "@/components/PortalFrame";
import { getPortalContext } from "@/lib/auth";
import { listPublishedPortalContent } from "@/lib/repository";

function formatContentDate(value: string | null) {
  if (!value) {
    return "未公開";
  }
  return new Date(value).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
}

export default async function LibraryPage() {
  const context = await getPortalContext();
  if (!context) {
    redirect("/");
  }

  const resources = listPublishedPortalContent("resource");

  return (
    <PortalFrame title="ライブラリ" walletAddress={context.session.walletAddress}>
      <section className="portal-content-list">
        {resources.length ? (
          resources.map((resource) => (
            <article className="pixel-panel portal-content-card" key={resource.id}>
              <div className="portal-content-head">
                <h2>{resource.title}</h2>
                {resource.pinned ? <span className="member-status-badge enabled">固定</span> : null}
              </div>
              <p className="content-meta">公開日: {formatContentDate(resource.publishedAt)}</p>
              {resource.body ? (
                <p className="portal-content-body">
                  <LinkedText text={resource.body} />
                </p>
              ) : null}
              {resource.url ? (
                <a className="pixel-button small" href={resource.url} rel="noreferrer" target="_blank">
                  ライブラリを開く
                </a>
              ) : null}
            </article>
          ))
        ) : (
          <section className="pixel-panel focused-panel">
            <h2>ライブラリはまだありません</h2>
            <p>公開されたライブラリリンクがここに表示されます。</p>
          </section>
        )}
      </section>
    </PortalFrame>
  );
}
