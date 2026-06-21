"use client";

import { FormEvent, useMemo, useState } from "react";

import type { PortalContent, PortalContentStatus, PortalContentType } from "@/lib/types";

type Props = {
  initialContents: PortalContent[];
};

type ContentForm = {
  type: PortalContentType;
  status: PortalContentStatus;
  title: string;
  body: string;
  url: string;
  pinned: boolean;
};

const contentTypeLabels: Record<PortalContentType, string> = {
  notice: "お知らせ",
  resource: "資料庫"
};

const contentStatusLabels: Record<PortalContentStatus, string> = {
  draft: "下書き",
  published: "公開"
};

function emptyForm(type: PortalContentType): ContentForm {
  return {
    type,
    status: "draft",
    title: "",
    body: "",
    url: "",
    pinned: false
  };
}

function formFromContent(content: PortalContent): ContentForm {
  return {
    type: content.type,
    status: content.status,
    title: content.title,
    body: content.body || "",
    url: content.url || "",
    pinned: content.pinned
  };
}

async function readError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || "リクエストに失敗しました。";
  } catch {
    return "リクエストに失敗しました。";
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return "未公開";
  }
  return new Date(value).toLocaleString("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo"
  });
}

export function AdminContentPanel({ initialContents }: Props) {
  const [contents, setContents] = useState(initialContents);
  const [activeType, setActiveType] = useState<PortalContentType>("notice");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ContentForm>(emptyForm("notice"));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredContents = useMemo(
    () => contents.filter((content) => content.type === activeType),
    [activeType, contents]
  );

  function resetForm(type = activeType) {
    setEditingId(null);
    setForm(emptyForm(type));
  }

  function selectType(type: PortalContentType) {
    setActiveType(type);
    resetForm(type);
    setMessage(null);
    setError(null);
  }

  async function refreshContents(type?: PortalContentType) {
    const response = await fetch(type ? `/api/admin/content?type=${type}` : "/api/admin/content");
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    const body = (await response.json()) as { contents: PortalContent[] };
    if (!type) {
      setContents(body.contents);
      return;
    }
    setContents((current) => [...current.filter((content) => content.type !== type), ...body.contents]);
  }

  async function saveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const response = await fetch(editingId ? `/api/admin/content/${editingId}` : "/api/admin/content", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    setSaving(false);
    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    setMessage(editingId ? "コンテンツを更新しました。" : "コンテンツを作成しました。");
    await refreshContents();
    resetForm(form.type);
  }

  function editContent(content: PortalContent) {
    setActiveType(content.type);
    setEditingId(content.id);
    setForm(formFromContent(content));
    setMessage(null);
    setError(null);
  }

  async function removeContent(content: PortalContent) {
    if (!window.confirm(`「${content.title}」を削除しますか？`)) {
      return;
    }

    setMessage(null);
    setError(null);
    const response = await fetch(`/api/admin/content/${content.id}`, { method: "DELETE" });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    setContents((current) => current.filter((item) => item.id !== content.id));
    if (editingId === content.id) {
      resetForm(content.type);
    }
    setMessage("コンテンツを削除しました。");
  }

  const isResource = form.type === "resource";

  return (
    <div className="admin-content-stack">
      <div className="content-admin-tabs" aria-label="コンテンツ種別">
        {(["notice", "resource"] as const).map((type) => (
          <button
            aria-pressed={activeType === type}
            className={activeType === type ? "active" : ""}
            key={type}
            type="button"
            onClick={() => selectType(type)}
          >
            {contentTypeLabels[type]}
          </button>
        ))}
      </div>

      <div className="admin-grid">
        <form className="pixel-panel admin-form admin-section-card" onSubmit={saveContent}>
          <div className="section-head compact">
            <h2>{editingId ? "編集" : "新規作成"}</h2>
            <span className={`status-badge ${form.status === "published" ? "enabled" : "disabled"}`}>
              {contentStatusLabels[form.status]}
            </span>
          </div>

          <label>
            <span>種別</span>
            <select
              value={form.type}
              onChange={(event) => {
                const nextType = event.target.value as PortalContentType;
                setActiveType(nextType);
                setForm({ ...form, type: nextType });
              }}
            >
              <option value="notice">お知らせ</option>
              <option value="resource">資料庫</option>
            </select>
          </label>

          <label>
            <span>公開状態</span>
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as PortalContentStatus })}
            >
              <option value="draft">下書き</option>
              <option value="published">公開</option>
            </select>
          </label>

          <label className="toggle-row">
            <input
              checked={form.pinned}
              type="checkbox"
              onChange={(event) => setForm({ ...form, pinned: event.target.checked })}
            />
            <span>一覧の上部に固定する</span>
          </label>

          <label>
            <span>タイトル</span>
            <input
              maxLength={160}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </label>

          <label>
            <span>{isResource ? "資料URL" : "URL（任意）"}</span>
            <input
              placeholder="https://..."
              value={form.url}
              onChange={(event) => setForm({ ...form, url: event.target.value })}
            />
          </label>

          <label>
            <span>{isResource ? "説明文（任意）" : "本文"}</span>
            <textarea
              rows={isResource ? 4 : 8}
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
            />
          </label>

          <p className="form-note">
            {isResource
              ? "資料庫はURLが必須です。PDFやGoogle Driveなど外部資料へのリンクを登録します。"
              : "お知らせは本文またはURLのどちらかが必須です。本文中のURLはポータル側でリンク表示します。"}
          </p>

          {message ? <p className="form-success">{message}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          <div className="wallet-login-actions">
            <button className="pixel-button" disabled={saving} type="submit">
              {saving ? "保存中..." : editingId ? "更新する" : "作成する"}
            </button>
            {editingId ? (
              <button className="pixel-button secondary" type="button" onClick={() => resetForm(form.type)}>
                新規作成へ戻る
              </button>
            ) : null}
          </div>
        </form>

        <section className="pixel-panel admin-members admin-section-card">
          <div className="section-head">
            <h2>{contentTypeLabels[activeType]}一覧</h2>
            <span className="status-badge">{filteredContents.length}件</span>
          </div>

          <div className="member-admin-list">
            {filteredContents.length ? (
              filteredContents.map((content) => (
                <article className="content-admin-row" key={content.id}>
                  <div className="content-admin-main">
                    <div className="content-admin-title">
                      <strong>{content.title}</strong>
                      {content.pinned ? <span className="member-status-badge enabled">固定</span> : null}
                      <span
                        className={`member-status-badge ${
                          content.status === "published" ? "enabled" : "muted"
                        }`}
                      >
                        {contentStatusLabels[content.status]}
                      </span>
                    </div>
                    <p className="content-meta">
                      公開日時: {formatDate(content.publishedAt)} / 更新日時: {formatDate(content.updatedAt)}
                    </p>
                    {content.body ? <p className="content-body-preview">{content.body}</p> : null}
                    {content.url ? (
                      <a className="content-url" href={content.url} rel="noreferrer" target="_blank">
                        {content.url}
                      </a>
                    ) : null}
                  </div>
                  <div className="member-actions">
                    <button className="member-action-button" type="button" onClick={() => editContent(content)}>
                      編集
                    </button>
                    <button
                      className="member-action-button secondary"
                      type="button"
                      onClick={() => removeContent(content)}
                    >
                      削除
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-state">まだコンテンツはありません。</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
