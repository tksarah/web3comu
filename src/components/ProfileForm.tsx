"use client";

import { ChangeEvent, FormEvent, useState } from "react";

import type { MemberProfile } from "@/lib/types";

type Props = {
  initialProfile: MemberProfile;
};

async function readError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || "保存に失敗しました。";
  } catch {
    return "保存に失敗しました。";
  }
}

export function ProfileForm({ initialProfile }: Props) {
  const [profile, setProfile] = useState(initialProfile);
  const [draftProfile, setDraftProfile] = useState(initialProfile);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  function startEdit() {
    setDraftProfile(profile);
    setMode("edit");
    setError(null);
    setMessage(null);
  }

  function cancelEdit() {
    setDraftProfile(profile);
    setMode("view");
    setError(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: draftProfile.displayName,
        email: draftProfile.email,
        xAccount: draftProfile.xAccount,
        discordAccount: draftProfile.discordAccount,
        telegramAccount: draftProfile.telegramAccount,
        bio: draftProfile.bio,
        profilePublic: draftProfile.profilePublic
      })
    });

    setBusy(false);
    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    const body = (await response.json()) as { profile: MemberProfile };
    setProfile(body.profile);
    setDraftProfile(body.profile);
    setMode("view");
    setMessage("プロフィールを保存しました。");
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch("/api/profile/image", {
      method: "POST",
      body: formData
    });

    setUploading(false);
    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    const body = (await response.json()) as { profile: MemberProfile };
    setProfile(body.profile);
    setDraftProfile(body.profile);
    setMessage("プロフィール画像を更新しました。");
  }

  const activeProfile = mode === "edit" ? draftProfile : profile;
  const imageUrl = activeProfile.profileImageFilename ? `/api/uploads/${activeProfile.profileImageFilename}` : null;
  const displayValue = (value: string | null) => value || "未設定";

  if (mode === "view") {
    return (
      <section className="profile-form profile-summary pixel-panel">
        <div className="profile-summary-header">
          <div className="profile-image-row">
            <div className="avatar-preview">
              {imageUrl ? <img src={imageUrl} alt="プロフィール画像" /> : <span>NO IMAGE</span>}
            </div>
            <div>
              <p className="eyebrow">Profile</p>
              <h2>{profile.displayName || "表示名未設定"}</h2>
              <p className="profile-wallet">{profile.walletAddress}</p>
            </div>
          </div>
          <button className="pixel-button small" type="button" onClick={startEdit}>
            編集
          </button>
        </div>

        <dl className="profile-detail-grid">
          <div>
            <dt>表示名</dt>
            <dd className={profile.displayName ? "" : "empty-value"}>{displayValue(profile.displayName)}</dd>
          </div>
          <div>
            <dt>メールアドレス</dt>
            <dd className={profile.email ? "" : "empty-value"}>{displayValue(profile.email)}</dd>
          </div>
          <div>
            <dt>X</dt>
            <dd className={profile.xAccount ? "" : "empty-value"}>{displayValue(profile.xAccount)}</dd>
          </div>
          <div>
            <dt>Discord</dt>
            <dd className={profile.discordAccount ? "" : "empty-value"}>{displayValue(profile.discordAccount)}</dd>
          </div>
          <div>
            <dt>Telegram</dt>
            <dd className={profile.telegramAccount ? "" : "empty-value"}>{displayValue(profile.telegramAccount)}</dd>
          </div>
          <div>
            <dt>公開状態</dt>
            <dd>
              {profile.forceProfilePrivate
                ? "管理者により非公開"
                : profile.profilePublic
                  ? "メンバー内で公開"
                  : "非公開"}
            </dd>
          </div>
        </dl>

        <div className="profile-bio-block">
          <h2>Bio</h2>
          <p className={profile.bio ? "" : "empty-value"}>{displayValue(profile.bio)}</p>
        </div>

        {profile.forceProfilePrivate ? (
          <p className="form-note">管理者により、このプロフィールは現在非公開に設定されています。</p>
        ) : null}
        {message ? <p className="form-success">{message}</p> : null}
      </section>
    );
  }

  return (
    <form className="profile-form pixel-panel" onSubmit={save}>
      <div className="profile-image-row">
        <div className="avatar-preview">
          {imageUrl ? <img src={imageUrl} alt="プロフィール画像" /> : <span>NO IMAGE</span>}
        </div>
        <label className="file-control">
          <span>{uploading ? "アップロード中..." : "画像を選択"}</span>
          <input accept="image/jpeg,image/png,image/webp" disabled={uploading} type="file" onChange={uploadImage} />
        </label>
      </div>

      <label>
        <span>表示名</span>
          <input
            maxLength={80}
            value={draftProfile.displayName || ""}
            onChange={(event) => setDraftProfile({ ...draftProfile, displayName: event.target.value })}
          />
        </label>
      <label>
        <span>メールアドレス</span>
        <input
          maxLength={180}
          type="email"
          value={draftProfile.email || ""}
          onChange={(event) => setDraftProfile({ ...draftProfile, email: event.target.value })}
        />
      </label>
      <div className="form-grid">
        <label>
          <span>X</span>
          <input
            maxLength={80}
            value={draftProfile.xAccount || ""}
            onChange={(event) => setDraftProfile({ ...draftProfile, xAccount: event.target.value })}
          />
        </label>
        <label>
          <span>Discord</span>
          <input
            maxLength={80}
            value={draftProfile.discordAccount || ""}
            onChange={(event) => setDraftProfile({ ...draftProfile, discordAccount: event.target.value })}
          />
        </label>
        <label>
          <span>Telegram</span>
          <input
            maxLength={80}
            value={draftProfile.telegramAccount || ""}
            onChange={(event) => setDraftProfile({ ...draftProfile, telegramAccount: event.target.value })}
          />
        </label>
      </div>
      <label>
        <span>Bio</span>
        <textarea
          maxLength={500}
          rows={5}
          value={draftProfile.bio || ""}
          onChange={(event) => setDraftProfile({ ...draftProfile, bio: event.target.value })}
        />
      </label>
      <label className="toggle-row">
        <input
          checked={draftProfile.profilePublic}
          type="checkbox"
          onChange={(event) => setDraftProfile({ ...draftProfile, profilePublic: event.target.checked })}
        />
        <span>プロフィールをメンバー内で公開する</span>
      </label>
      {profile.forceProfilePrivate ? (
        <p className="form-note">管理者により、このプロフィールは現在非公開に設定されています。</p>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}
      <div className="profile-action-row">
        <button className="pixel-button" disabled={busy} type="submit">
          {busy ? "保存中..." : "保存する"}
        </button>
        <button className="pixel-button secondary" disabled={busy} type="button" onClick={cancelEdit}>
          キャンセル
        </button>
      </div>
    </form>
  );
}
