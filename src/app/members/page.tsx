import { redirect } from "next/navigation";

import { PortalFrame } from "@/components/PortalFrame";
import { getMemberContext } from "@/lib/auth";
import { listPublicMembers } from "@/lib/repository";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default async function MembersPage() {
  const context = await getMemberContext();
  if (!context) {
    redirect("/");
  }

  const members = listPublicMembers();

  return (
    <PortalFrame title="メンバー" walletAddress={context.session.walletAddress}>
      <section className="member-directory">
        {members.length ? (
          members.map((member) => (
            <article className="member-card pixel-panel" key={member.walletAddress}>
              <div className="member-avatar">
                {member.profileImageFilename ? (
                  <img src={`/api/uploads/${member.profileImageFilename}`} alt="" />
                ) : (
                  <span>◎</span>
                )}
              </div>
              <div>
                <h2>{member.displayName || shortAddress(member.walletAddress)}</h2>
                <p className="wallet-text">{shortAddress(member.walletAddress)}</p>
                {member.bio ? <p>{member.bio}</p> : null}
                <div className="sns-row">
                  {member.xAccount ? <span>X: {member.xAccount}</span> : null}
                  {member.discordAccount ? <span>Discord: {member.discordAccount}</span> : null}
                  {member.telegramAccount ? <span>Telegram: {member.telegramAccount}</span> : null}
                </div>
              </div>
            </article>
          ))
        ) : (
          <section className="pixel-panel empty-state large">
            <h2>公開プロフィールはまだありません</h2>
            <p>マイページでプロフィールを公開すると、ここに表示されます。</p>
          </section>
        )}
      </section>
    </PortalFrame>
  );
}
