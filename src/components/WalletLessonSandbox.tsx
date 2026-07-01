"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getAddress } from "viem";

import {
  LESSON_FAUCET_NATIVE_AMOUNT,
  LESSON_FAUCET_TOKEN_AMOUNT,
  LESSON_GAS_FEE,
  LESSON_NATIVE_SYMBOL,
  LESSON_NETWORK_TEMPLATE,
  LESSON_SAMPLE_RECIPIENT,
  LESSON_STEPS,
  LESSON_TOKEN_SYMBOL,
  LESSON_TOKEN_TEMPLATE,
  acceptLessonSafety,
  addLessonNetwork,
  addLessonToken,
  attachLessonWallet,
  claimLessonFaucet,
  completeLesson,
  completeTokenSend,
  confirmLessonRecovery,
  createInitialLessonState,
  formatLessonAmount,
  getLessonStepIndex,
  getUnlockedLessonStepIndex,
  normalizeLessonAddress,
  normalizeStoredLessonState,
  setLessonActiveStep,
  type LessonState,
  type LessonStepId
} from "@/lib/wallet-lesson";

type Props = {
  walletAddress: string;
};

type Feedback = {
  kind: "success" | "error" | "note";
  text: string;
};

type PendingSend = {
  to: `0x${string}`;
  amount: number;
};

type NetworkForm = {
  name: string;
  chainId: string;
  rpcUrl: string;
  symbol: string;
  explorerUrl: string;
};

type TokenForm = {
  contractAddress: string;
  symbol: string;
  decimals: string;
};

const STORAGE_PREFIX = "web3comu.lesson0.wallet";
const LESSON_SAMPLE_SEND_AMOUNT = "10";

const DEFAULT_NETWORK_FORM: NetworkForm = {
  name: "",
  chainId: "",
  rpcUrl: "",
  symbol: "",
  explorerUrl: ""
};

const DEFAULT_TOKEN_FORM: TokenForm = {
  contractAddress: "",
  symbol: "",
  decimals: ""
};

const INITIAL_QUIZ = {
  recovery: false,
  address: false,
  gas: false,
  network: false,
  token: false
};

function storageKey(walletAddress: string) {
  return `${STORAGE_PREFIX}:${walletAddress.toLowerCase()}`;
}

function randomHex(byteLength: number): `0x${string}` {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `0x${hex}`;
}

function generateLessonAddress() {
  return getAddress(randomHex(20));
}

function generateTxHash() {
  return randomHex(32);
}

function generateRecoveryCode() {
  return Array.from({ length: 6 }, (_, index) => {
    const segment = randomHex(2).slice(2).toUpperCase();
    return `L0-${String(index + 1).padStart(2, "0")}-${segment}`;
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour12: false
  });
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function sameUrl(left: string, right: string) {
  return left.trim().replace(/\/+$/, "").toLowerCase() === right.trim().replace(/\/+$/, "").toLowerCase();
}

function feedbackClass(kind: Feedback["kind"]) {
  if (kind === "success") {
    return "form-success";
  }
  if (kind === "error") {
    return "form-error";
  }
  return "form-note";
}

export function WalletLessonSandbox({ walletAddress }: Props) {
  const [state, setState] = useState<LessonState>(() => createInitialLessonState());
  const [hydrated, setHydrated] = useState(false);
  const [safeChecked, setSafeChecked] = useState(false);
  const [recoveryChecked, setRecoveryChecked] = useState(false);
  const [faucetTo, setFaucetTo] = useState("");
  const [sendTo, setSendTo] = useState<string>("");
  const [sendAmount, setSendAmount] = useState("");
  const [pendingSend, setPendingSend] = useState<PendingSend | null>(null);
  const [networkForm, setNetworkForm] = useState(DEFAULT_NETWORK_FORM);
  const [tokenForm, setTokenForm] = useState(DEFAULT_TOKEN_FORM);
  const [quiz, setQuiz] = useState(INITIAL_QUIZ);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [copied, setCopied] = useState(false);

  const lessonStorageKey = useMemo(() => storageKey(walletAddress), [walletAddress]);
  const unlockedStepIndex = getUnlockedLessonStepIndex(state);
  const activeStepIndex = getLessonStepIndex(state.activeStep);
  const walletPanelUnlocked = state.progress.recoveryConfirmed;
  const allQuizChecked = Object.values(quiz).every(Boolean);

  useEffect(() => {
    try {
      const stored = globalThis.localStorage.getItem(lessonStorageKey);
      if (stored) {
        const normalized = normalizeStoredLessonState(JSON.parse(stored));
        if (normalized) {
          setState(normalized);
        }
      } else {
        setState(createInitialLessonState());
      }
    } catch {
      setState(createInitialLessonState());
    } finally {
      setHydrated(true);
      setFeedback(null);
      setPendingSend(null);
      setFaucetTo("");
      setCopied(false);
    }
  }, [lessonStorageKey]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    globalThis.localStorage.setItem(lessonStorageKey, JSON.stringify(state));
  }, [hydrated, lessonStorageKey, state]);

  function goToStep(stepId: LessonStepId) {
    const index = getLessonStepIndex(stepId);
    if (index > unlockedStepIndex) {
      return;
    }
    setState((current) => setLessonActiveStep(current, stepId));
    setFeedback(null);
  }

  function acceptSafety() {
    if (!safeChecked) {
      setFeedback({ kind: "error", text: "学習用環境であることを確認してから進んでください。" });
      return;
    }
    setState((current) => acceptLessonSafety(current));
    setFeedback(null);
  }

  function createWallet() {
    const now = new Date().toISOString();
    setState((current) =>
      attachLessonWallet(current, {
        address: generateLessonAddress(),
        recoveryCode: generateRecoveryCode(),
        createdAt: now
      })
    );
    setFeedback(null);
  }

  function confirmRecovery() {
    if (!recoveryChecked) {
      setFeedback({ kind: "error", text: "学習用リカバリーコードを実ウォレットへ入力しないことを確認してください。" });
      return;
    }
    setState((current) => confirmLessonRecovery(current));
    setFeedback(null);
  }

  function claimFaucet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!state.wallet) {
      setFeedback({ kind: "error", text: "先に学習用ウォレットを作成してください。" });
      return;
    }
    if (!state.progress.tokenAdded) {
      setFeedback({ kind: "error", text: "先にネットワーク登録とトークン追加を完了してください。" });
      return;
    }
    if (state.progress.faucetClaimed) {
      setFeedback({ kind: "note", text: "Faucetはすでに受け取り済みです。" });
      return;
    }

    if (!faucetTo.trim()) {
      setFeedback({ kind: "error", text: "受け取り先アドレスを入力してください。" });
      return;
    }

    const normalizedTo = normalizeLessonAddress(faucetTo);
    if (!normalizedTo) {
      setFeedback({ kind: "error", text: "受け取り先は 0x から始まる正しいアドレスを入力してください。" });
      return;
    }
    if (normalizedTo.toLowerCase() !== state.wallet.address.toLowerCase()) {
      setFeedback({
        kind: "error",
        text: "受け取り先が右のウォレットアドレスと一致していません。コピーしたアドレスを貼り付けてください。"
      });
      return;
    }

    const now = new Date().toISOString();
    setState((current) =>
      claimLessonFaucet(current, {
        id: `faucet-${randomHex(6).slice(2)}`,
        hash: generateTxHash(),
        to: normalizedTo,
        createdAt: now
      })
    );
    setFeedback(null);
  }

  function previewSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingSend(null);

    if (!state.wallet) {
      setFeedback({ kind: "error", text: "送信前に学習用ウォレットを作成してください。" });
      return;
    }

    const normalizedTo = normalizeLessonAddress(sendTo);
    if (!normalizedTo) {
      setFeedback({ kind: "error", text: "宛先アドレスは 0x から始まる正しい形式で入力してください。" });
      return;
    }
    if (normalizedTo.toLowerCase() === state.wallet.address.toLowerCase()) {
      setFeedback({ kind: "error", text: "今回は自分以外のアドレスへ送信してみましょう。" });
      return;
    }

    const amount = Number(sendAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFeedback({ kind: "error", text: "送信数量は0より大きい数値で入力してください。" });
      return;
    }

    if (state.learningTokenBalance < amount) {
      setFeedback({
        kind: "error",
        text: `送信数量分の${LESSON_TOKEN_SYMBOL}が足りません。`
      });
      return;
    }

    if (state.nativeBalance < LESSON_GAS_FEE) {
      setFeedback({
        kind: "error",
        text: `ガス代分の${LESSON_NATIVE_SYMBOL}が足りません。`
      });
      return;
    }

    setPendingSend({ to: normalizedTo, amount });
    setFeedback({ kind: "note", text: "確認画面で宛先、数量、ガス代を見直してください。" });
  }

  function executeSend() {
    if (!pendingSend) {
      return;
    }
    const now = new Date().toISOString();
    setState((current) =>
      completeTokenSend(current, {
        id: `send-${randomHex(6).slice(2)}`,
        hash: generateTxHash(),
        to: pendingSend.to,
        amount: pendingSend.amount,
        createdAt: now
      })
    );
    setPendingSend(null);
    setFeedback(null);
  }

  function submitNetwork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const valid =
      networkForm.name.trim() === LESSON_NETWORK_TEMPLATE.name.trim() &&
      Number(networkForm.chainId) === LESSON_NETWORK_TEMPLATE.chainId &&
      sameUrl(networkForm.rpcUrl, LESSON_NETWORK_TEMPLATE.rpcUrl) &&
      networkForm.symbol.trim().toUpperCase() === LESSON_NETWORK_TEMPLATE.nativeCurrency.symbol.toUpperCase() &&
      sameUrl(networkForm.explorerUrl, LESSON_NETWORK_TEMPLATE.explorerUrl);

    if (!valid) {
      setFeedback({ kind: "error", text: "表示されているネットワーク情報と入力内容をもう一度見比べてください。" });
      return;
    }

    setState((current) => addLessonNetwork(current));
    setFeedback(null);
  }

  function submitToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedAddress = normalizeLessonAddress(tokenForm.contractAddress);
    const valid =
      normalizedAddress?.toLowerCase() === LESSON_TOKEN_TEMPLATE.contractAddress.toLowerCase() &&
      tokenForm.symbol.trim().toUpperCase() === LESSON_TOKEN_TEMPLATE.symbol &&
      Number(tokenForm.decimals) === LESSON_TOKEN_TEMPLATE.decimals;

    if (!valid) {
      setFeedback({ kind: "error", text: "トークン情報が一致していません。コントラクトアドレス、シンボル、小数桁を確認してください。" });
      return;
    }

    setState((current) => addLessonToken(current));
    setFeedback(null);
  }

  function finishLesson() {
    if (!allQuizChecked) {
      setFeedback({ kind: "error", text: "完了チェックをすべて確認してください。" });
      return;
    }
    setState((current) => completeLesson(current));
    setFeedback({ kind: "success", text: "Lesson 0を完了しました。実ウォレットへ進む準備が整いました。" });
  }

  function resetLesson() {
    globalThis.localStorage.removeItem(lessonStorageKey);
    setState(createInitialLessonState());
    setSafeChecked(false);
    setRecoveryChecked(false);
    setPendingSend(null);
    setFaucetTo("");
    setSendTo("");
    setSendAmount("");
    setNetworkForm(DEFAULT_NETWORK_FORM);
    setTokenForm(DEFAULT_TOKEN_FORM);
    setQuiz(INITIAL_QUIZ);
    setFeedback({ kind: "note", text: "Lesson 0の進捗をリセットしました。" });
  }

  async function copyWalletAddress() {
    if (!state.wallet) {
      return;
    }
    try {
      await navigator.clipboard.writeText(state.wallet.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setFeedback({ kind: "error", text: "クリップボードへコピーできませんでした。" });
    }
  }

  async function copyLessonValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback({ kind: "note", text: "コピーしました。" });
    } catch {
      setFeedback({ kind: "error", text: "クリップボードへコピーできませんでした。" });
    }
  }

  function renderCopyableTemplateRow(label: string, value: string) {
    return (
      <div className="wallet-template-row">
        <span>
          <span className="wallet-template-label">{label}:</span> {value}
        </span>
        <button
          aria-label={`${label}をコピー`}
          className="wallet-mini-button"
          type="button"
          onClick={() => copyLessonValue(value)}
        >
          コピー
        </button>
      </div>
    );
  }

  return (
    <section className="wallet-lesson-shell" aria-label="Lesson 0 ウォレット体験学習">
      <section className="pixel-panel wallet-lesson-hero">
        <div>
          <p className="eyebrow">LESSON 0</p>
          <h2>ブラウザ内だけでウォレットの基本操作を練習する</h2>
          <p>
            ここで作るウォレット、ネットワーク、トークン、履歴はすべて学習用です。MetaMaskなどの実ウォレット、
            実資産、実ブロックチェーンには接続しません。
          </p>
        </div>
        <button className="pixel-button secondary small" type="button" onClick={resetLesson}>
          最初からやり直す
        </button>
      </section>

      <div className="wallet-lesson-layout">
        <aside className="pixel-panel wallet-lesson-steps" aria-label="レッスンの進み具合">
          {LESSON_STEPS.map((step, index) => {
            const completed = index < unlockedStepIndex || (step.id === "complete" && state.progress.finalQuizConfirmed);
            const active = step.id === state.activeStep;
            const locked = index > unlockedStepIndex;
            return (
              <button
                aria-current={active ? "step" : undefined}
                className="wallet-lesson-step-button"
                data-active={active}
                data-complete={completed}
                disabled={locked}
                key={step.id}
                type="button"
                onClick={() => goToStep(step.id)}
              >
                <span>{step.label}</span>
                <strong>{step.title}</strong>
              </button>
            );
          })}
        </aside>

        <section className="pixel-panel wallet-lesson-workspace" aria-live="polite">
          <div className="wallet-lesson-workspace-head">
            <span className="wallet-lesson-step-index">
              STEP {Math.max(activeStepIndex, 0) + 1} / {LESSON_STEPS.length}
            </span>
            <strong>{LESSON_STEPS[Math.max(activeStepIndex, 0)]?.title}</strong>
          </div>
          {renderActiveStep()}
          {feedback ? <p className={feedbackClass(feedback.kind)}>{feedback.text}</p> : null}
        </section>

        <aside
          className={`pixel-panel wallet-sim-card ${walletPanelUnlocked ? "" : "locked"}`}
          aria-label="学習用ウォレット"
        >
          <div className="wallet-sim-header">
            <div className="wallet-sim-title">
              <img src="/images/wallet-small.svg" alt="" aria-hidden="true" />
              <div>
                <span>Lesson Wallet</span>
                <small>ブラウザ内シミュレーター</small>
              </div>
            </div>
            <strong className="wallet-sim-status">
              {walletPanelUnlocked ? (state.wallet ? shortAddress(state.wallet.address) : "未作成") : "準備中"}
            </strong>
          </div>

          {walletPanelUnlocked ? (
            <>
              <div className="wallet-sim-screen">
                <div className="wallet-sim-balance">
                  <span>Native Balance</span>
                  <strong className={state.progress.networkAdded ? undefined : "wallet-sim-balance-pending"}>
                    {state.progress.networkAdded
                      ? `${formatLessonAmount(state.nativeBalance)} ${LESSON_NATIVE_SYMBOL}`
                      : "ネットワーク未登録"}
                  </strong>
                </div>
                <div className="wallet-sim-row">
                  <span>Address</span>
                  <div className="wallet-sim-address-line">
                    <strong>{state.wallet ? state.wallet.address : "まだありません"}</strong>
                    {state.wallet ? (
                      <button className="wallet-mini-button" type="button" onClick={copyWalletAddress}>
                        {copied ? "コピー済み" : "コピー"}
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="wallet-sim-row">
                  <span>Network</span>
                  <strong>
                    {state.networks[0]
                      ? `${state.networks[0].name} (${state.networks[0].chainId})`
                      : "未登録"}
                  </strong>
                </div>
                <div className="wallet-token-list">
                  <span>Tokens</span>
                  {state.tokens.length ? (
                    state.tokens.map((token) => (
                      <div className="wallet-token-row" key={token.contractAddress}>
                        <strong>{token.symbol}</strong>
                        <span>{formatLessonAmount(token.balance)}枚</span>
                      </div>
                    ))
                  ) : (
                    <p>トークンはまだ表示されていません。</p>
                  )}
                </div>
              </div>
              <div className="wallet-history-list">
                <div className="wallet-history-head">
                  <strong>Activity</strong>
                  <span>履歴</span>
                </div>
                {state.transactions.length ? (
                  state.transactions.slice(0, 4).map((tx) => (
                    <article className="wallet-history-item" key={tx.id}>
                      <span className={`wallet-history-kind ${tx.type}`}>
                        {tx.type === "faucet" ? "受け取り" : "送信"}
                      </span>
                      <strong>
                        {formatLessonAmount(tx.amount)} {tx.tokenSymbol}
                      </strong>
                      <small>{formatDateTime(tx.createdAt)}</small>
                      <small>{shortAddress(tx.hash)}</small>
                    </article>
                  ))
                ) : (
                  <p>履歴はまだありません。</p>
                )}
              </div>
            </>
          ) : (
            <div className="wallet-sim-locked-screen">
              <img src="/images/wallet-small.svg" alt="" aria-hidden="true" />
              <strong>ウォレットはまだありません</strong>
              <p>STEP 3 が終わると、利用、確認可能になります。</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );

  function renderActiveStep() {
    switch (state.activeStep) {
      case "intro":
        return (
          <div className="wallet-lesson-step-panel">
            <h3>まずは安全な前提をそろえる</h3>
            <p>
              このページの操作は、実際のMetaMaskやブロックチェーンには送られません。学習用の残高と履歴だけを
              ブラウザに保存します。
            </p>
            <div className="wallet-warning-box">
              <strong>大切な約束</strong>
              <span>本物の秘密鍵、シードフレーズ、リカバリーフレーズをこのページへ入力しないでください。</span>
            </div>
            <label className="wallet-check-row">
              <input
                checked={safeChecked || state.progress.safeNoticeAccepted}
                type="checkbox"
                onChange={(event) => setSafeChecked(event.target.checked)}
              />
              <span>これは学習用で、実資産には使えないことを確認しました。</span>
            </label>
            <button className="pixel-button" type="button" onClick={acceptSafety}>
              次へ進む
            </button>
          </div>
        );
      case "create":
        return (
          <div className="wallet-lesson-step-panel">
            <h3>学習用ウォレットを作成する</h3>
            <p>
              ウォレットアドレスは、トークンを受け取るための公開IDです。何度でも作り直せる学習用アドレスを生成します。
            </p>
            {state.wallet ? (
              <div className="wallet-result-box success">
                <span>作成済みアドレス</span>
                <strong>{state.wallet.address}</strong>
              </div>
            ) : null}
            <button className="pixel-button" type="button" onClick={createWallet}>
              {state.wallet ? "別の学習用ウォレットを作る" : "ウォレットを作成"}
            </button>
          </div>
        );
      case "recovery":
        return (
          <div className="wallet-lesson-step-panel">
            <h3>学習用リカバリーコードを確認する</h3>
            <p>
              実ウォレットでは、復元用の言葉や秘密鍵を誰かに見せると資産を失う危険があります。ここでは形だけを学びます。
            </p>
            <div className="recovery-code-grid">
              {state.wallet?.recoveryCode.map((code) => (
                <code key={code}>{code}</code>
              ))}
            </div>
            <label className="wallet-check-row">
              <input
                checked={recoveryChecked || state.progress.recoveryConfirmed}
                type="checkbox"
                onChange={(event) => setRecoveryChecked(event.target.checked)}
              />
              <span>このコードを実ウォレットに入力せず、他人にも共有しません。</span>
            </label>
            <button className="pixel-button" disabled={!state.wallet} type="button" onClick={confirmRecovery}>
              確認して次へ
            </button>
          </div>
        );
      case "faucet":
        return (
          <div className="wallet-lesson-step-panel">
            <h3>Faucetからテスト用残高を受け取る</h3>
            <p>
              Fausetは、開発やテストのためにトークンを無償で取得する仕組みです。今回は、練習用ネットワークで使う少量のトークン、0.05 tETH と 100 LRN を受け取ります。
            </p>
            <form className="wallet-lesson-form" onSubmit={claimFaucet}>
              <label>
                受け取り先アドレス
                <input
                  placeholder="右のウォレットからコピーして貼り付け"
                  value={faucetTo}
                  onChange={(event) => setFaucetTo(event.target.value)}
                />
              </label>
              <p className="wallet-form-hint">
                右のLesson Walletに表示されているAddressをコピーして貼り付けます。
              </p>
              <button
                className="pixel-button"
                disabled={!state.wallet || !state.progress.tokenAdded || state.progress.faucetClaimed}
                type="submit"
              >
                {state.progress.faucetClaimed ? "受け取り済み" : "Faucetから受け取る"}
              </button>
            </form>
          </div>
        );
      case "send":
        return (
          <div className="wallet-lesson-step-panel">
            <h3>トークン送信を確認画面つきで体験する</h3>
            <p>
              送信では、宛先アドレス、数量、ガス代を必ず確認します。ここでは
              {LESSON_TOKEN_SYMBOL} を送信し、{LESSON_NATIVE_SYMBOL} をガス代として使います。
            </p>
            <div className="wallet-template-box">
              <strong>トークン送信先情報</strong>
              {renderCopyableTemplateRow("宛先アドレス", LESSON_SAMPLE_RECIPIENT)}
              <span>送信数量: {LESSON_SAMPLE_SEND_AMOUNT} {LESSON_TOKEN_SYMBOL}</span>
            </div>
            <form className="wallet-lesson-form" onSubmit={previewSend}>
              <label>
                宛先アドレス
                <input
                  placeholder="上の宛先アドレスをコピーして貼り付け"
                  value={sendTo}
                  onChange={(event) => setSendTo(event.target.value)}
                />
              </label>
              <label>
                送信数量 ({LESSON_TOKEN_SYMBOL})
                <input
                  min="0"
                  placeholder="上の送信数量を入力"
                  step="1"
                  type="number"
                  value={sendAmount}
                  onChange={(event) => setSendAmount(event.target.value)}
                />
              </label>
              <div className="wallet-result-box">
                <span>固定ガス代</span>
                <strong>
                  {LESSON_GAS_FEE} {LESSON_NATIVE_SYMBOL}
                </strong>
              </div>
              <button className="pixel-button" disabled={!state.progress.faucetClaimed} type="submit">
                確認画面へ
              </button>
            </form>
            {pendingSend ? (
              <div className="wallet-confirm-box">
                <h4>送信前の確認</h4>
                <dl>
                  <div>
                    <dt>宛先</dt>
                    <dd>{pendingSend.to}</dd>
                  </div>
                  <div>
                    <dt>数量</dt>
                    <dd>
                      {formatLessonAmount(pendingSend.amount)} {LESSON_TOKEN_SYMBOL}
                    </dd>
                  </div>
                  <div>
                    <dt>ガス代</dt>
                    <dd>
                      {LESSON_GAS_FEE} {LESSON_NATIVE_SYMBOL}
                    </dd>
                  </div>
                </dl>
                <button className="pixel-button" type="button" onClick={executeSend}>
                  送信する
                </button>
              </div>
            ) : null}
          </div>
        );
      case "network":
        return (
          <div className="wallet-lesson-step-panel">
            <h3>ネットワークを登録する</h3>
            <p>
              ウォレットは接続先ネットワークを切り替えて使います。Chain IDやRPC URLは、どのチェーンを見るかを決める情報です。
            </p>
            <div className="wallet-template-box">
              <strong>登録するネットワーク情報</strong>
              {renderCopyableTemplateRow("Name", LESSON_NETWORK_TEMPLATE.name)}
              {renderCopyableTemplateRow("Chain ID", String(LESSON_NETWORK_TEMPLATE.chainId))}
              {renderCopyableTemplateRow("RPC URL", LESSON_NETWORK_TEMPLATE.rpcUrl)}
              {renderCopyableTemplateRow("Symbol", LESSON_NETWORK_TEMPLATE.nativeCurrency.symbol)}
              {renderCopyableTemplateRow("Explorer", LESSON_NETWORK_TEMPLATE.explorerUrl)}
            </div>
            <form className="wallet-lesson-form" onSubmit={submitNetwork}>
              <div className="form-grid">
                <label>
                  ネットワーク名
                  <input
                    value={networkForm.name}
                    onChange={(event) => setNetworkForm({ ...networkForm, name: event.target.value })}
                  />
                </label>
                <label>
                  Chain ID
                  <input
                    inputMode="numeric"
                    value={networkForm.chainId}
                    onChange={(event) => setNetworkForm({ ...networkForm, chainId: event.target.value })}
                  />
                </label>
                <label>
                  RPC URL
                  <input
                    value={networkForm.rpcUrl}
                    onChange={(event) => setNetworkForm({ ...networkForm, rpcUrl: event.target.value })}
                  />
                </label>
                <label>
                  通貨シンボル
                  <input
                    value={networkForm.symbol}
                    onChange={(event) => setNetworkForm({ ...networkForm, symbol: event.target.value })}
                  />
                </label>
              </div>
              <label>
                ブロックエクスプローラーURL
                <input
                  value={networkForm.explorerUrl}
                  onChange={(event) => setNetworkForm({ ...networkForm, explorerUrl: event.target.value })}
                />
              </label>
              <button className="pixel-button" disabled={!state.progress.recoveryConfirmed} type="submit">
                ネットワークを登録
              </button>
            </form>
          </div>
        );
      case "token":
        return (
          <div className="wallet-lesson-step-panel">
            <h3>トークンをウォレットへ表示する</h3>
            <p>
              ウォレットに表示されないトークンは、コントラクトアドレス、シンボル、小数桁を登録すると見えるようになります。
            </p>
            <div className="wallet-template-box">
              <strong>登録するトークン情報</strong>
              {renderCopyableTemplateRow("Contract", LESSON_TOKEN_TEMPLATE.contractAddress)}
              {renderCopyableTemplateRow("Symbol", LESSON_TOKEN_TEMPLATE.symbol)}
              {renderCopyableTemplateRow("Decimals", String(LESSON_TOKEN_TEMPLATE.decimals))}
            </div>
            <form className="wallet-lesson-form" onSubmit={submitToken}>
              <label>
                コントラクトアドレス
                <input
                  value={tokenForm.contractAddress}
                  onChange={(event) => setTokenForm({ ...tokenForm, contractAddress: event.target.value })}
                />
              </label>
              <div className="form-grid">
                <label>
                  シンボル
                  <input
                    value={tokenForm.symbol}
                    onChange={(event) => setTokenForm({ ...tokenForm, symbol: event.target.value })}
                  />
                </label>
                <label>
                  小数桁
                  <input
                    inputMode="numeric"
                    value={tokenForm.decimals}
                    onChange={(event) => setTokenForm({ ...tokenForm, decimals: event.target.value })}
                  />
                </label>
              </div>
              <button className="pixel-button" disabled={!state.progress.networkAdded} type="submit">
                トークンを追加
              </button>
            </form>
          </div>
        );
      case "complete":
        return (
          <div className="wallet-lesson-step-panel">
            <h3>Lesson 0の完了チェック</h3>
            <p>最後に、ウォレット操作で必ず押さえるポイントを確認します。</p>
            <div className="wallet-quiz-list">
              <label className="wallet-check-row">
                <input
                  checked={quiz.recovery || state.progress.finalQuizConfirmed}
                  type="checkbox"
                  onChange={(event) => setQuiz({ ...quiz, recovery: event.target.checked })}
                />
                <span>リカバリー情報は誰にも共有しない。</span>
              </label>
              <label className="wallet-check-row">
                <input
                  checked={quiz.address || state.progress.finalQuizConfirmed}
                  type="checkbox"
                  onChange={(event) => setQuiz({ ...quiz, address: event.target.checked })}
                />
                <span>受け取りには自分のウォレットアドレスを使う。</span>
              </label>
              <label className="wallet-check-row">
                <input
                  checked={quiz.gas || state.progress.finalQuizConfirmed}
                  type="checkbox"
                  onChange={(event) => setQuiz({ ...quiz, gas: event.target.checked })}
                />
                <span>送信時は数量だけでなくガス代も必要になる。</span>
              </label>
              <label className="wallet-check-row">
                <input
                  checked={quiz.network || state.progress.finalQuizConfirmed}
                  type="checkbox"
                  onChange={(event) => setQuiz({ ...quiz, network: event.target.checked })}
                />
                <span>ネットワーク情報はChain IDやRPC URLを確認して登録する。</span>
              </label>
              <label className="wallet-check-row">
                <input
                  checked={quiz.token || state.progress.finalQuizConfirmed}
                  type="checkbox"
                  onChange={(event) => setQuiz({ ...quiz, token: event.target.checked })}
                />
                <span>トークンが表示されない時はコントラクトアドレスを確認する。</span>
              </label>
            </div>
            <button
              className="pixel-button"
              disabled={!state.progress.sendCompleted || (!allQuizChecked && !state.progress.finalQuizConfirmed)}
              type="button"
              onClick={finishLesson}
            >
              {state.progress.finalQuizConfirmed ? "Lesson 0 完了済み" : "Lesson 0を完了する"}
            </button>
          </div>
        );
    }
  }
}
