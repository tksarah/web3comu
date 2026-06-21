"use client";

import { useEffect, useRef, useState } from "react";
import { useAppKit, useAppKitState } from "@reown/appkit/react";
import { useAccount, useSignMessage, useSwitchChain } from "wagmi";

import { useAppKitRuntime } from "@/components/AppKitRuntimeProvider";
import { DEFAULT_CHAIN } from "@/lib/chains";

type LoginIntent = "member" | "admin";

type Props = {
  intent: LoginIntent;
  label: string;
  redirectTo: string;
  className?: string;
};

type Status = "idle" | "connecting" | "switching" | "signing" | "verifying";

function localizeApiError(message: string) {
  const map: Record<string, string> = {
    "NFT condition is not enabled.": "トークン条件が管理画面で有効化されていません。",
    "Token condition is not enabled.": "トークン条件が管理画面で有効化されていません。",
    "Required NFT was not found.": "必要なトークン保有を確認できませんでした。",
    "Required token was not found.": "必要なトークン保有を確認できませんでした。",
    "Wallet signature could not be verified.": "ウォレット署名を検証できませんでした。",
    "Login request expired. Please connect your wallet again.":
      "ログインリクエストの有効期限が切れました。もう一度ウォレット接続からやり直してください。",
    "Connected wallet is suspended.": "このウォレットは管理者により停止されています。",
    "This wallet is not configured as the administrator.": "このウォレットは管理者として設定されていません。",
    "This member account is suspended.": "このメンバーアカウントは停止されています。",
    "Wallet address is invalid.": "ウォレットアドレスの形式が正しくありません。",
    "Wallet address and signature are required.": "ウォレットアドレスと署名が必要です。"
  };

  return map[message] || message;
}

async function getResponseError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return localizeApiError(body.error || "リクエストに失敗しました。");
  } catch {
    return "リクエストに失敗しました。";
  }
}

async function requestNonce(address: string) {
  const nonceResponse = await fetch("/api/auth/nonce", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address })
  });

  if (!nonceResponse.ok) {
    throw new Error(await getResponseError(nonceResponse));
  }

  return (await nonceResponse.json()) as { message: string };
}

async function verifyLogin(address: string, signature: string, intent: LoginIntent) {
  const verifyResponse = await fetch("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, signature, intent })
  });

  if (!verifyResponse.ok) {
    throw new Error(await getResponseError(verifyResponse));
  }
}

function getStatusLabel(status: Status, label: string) {
  if (status === "connecting") {
    return "ウォレット接続中...";
  }
  if (status === "switching") {
    return "Soneiumへ切り替え中...";
  }
  if (status === "signing") {
    return "署名待ち...";
  }
  if (status === "verifying") {
    return "トークン確認中...";
  }

  return label;
}

function WalletLoginInner({ intent, label, redirectTo, className }: Props) {
  const { open } = useAppKit();
  const appKitState = useAppKitState();
  const { address, chainId, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pendingLogin, setPendingLogin] = useState(false);
  const [modalWasOpen, setModalWasOpen] = useState(false);
  const loginStartedRef = useRef(false);

  function resetPendingLogin() {
    setPendingLogin(false);
    setModalWasOpen(false);
    setStatus("idle");
  }

  async function finishLogin(walletAddress: string) {
    if (loginStartedRef.current) {
      return;
    }

    loginStartedRef.current = true;
    setError(null);

    try {
      if (chainId !== DEFAULT_CHAIN.id) {
        setStatus("switching");
        await switchChainAsync({ chainId: DEFAULT_CHAIN.id });
      }

      const nonce = await requestNonce(walletAddress);

      setStatus("signing");
      const signature = await signMessageAsync({ message: nonce.message, account: walletAddress as `0x${string}` });

      setStatus("verifying");
      await verifyLogin(walletAddress, signature, intent);

      window.location.href = redirectTo;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "ウォレット接続または署名に失敗しました。";
      setError(localizeApiError(message));
      resetPendingLogin();
      loginStartedRef.current = false;
    }
  }

  async function connectWallet() {
    setError(null);
    setModalWasOpen(false);

    try {
      setStatus("connecting");
      setPendingLogin(true);
      await open({ view: isConnected && address ? "ProfileWallets" : "Connect", namespace: "eip155" });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "ウォレット選択画面を開けませんでした。";
      setError(message);
      resetPendingLogin();
    }
  }

  useEffect(() => {
    if (appKitState.open) {
      setModalWasOpen(true);
    }
  }, [appKitState.open]);

  useEffect(() => {
    if (!pendingLogin || !modalWasOpen || appKitState.open) {
      return;
    }

    if (!isConnected || !address) {
      resetPendingLogin();
      return;
    }

    finishLogin(address);
  }, [address, appKitState.open, isConnected, modalWasOpen, pendingLogin]);

  const busy = status !== "idle";

  return (
    <div className="wallet-login">
      <button className={className || "pixel-button"} type="button" disabled={busy} onClick={connectWallet}>
        {getStatusLabel(status, label)}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}

export function WalletLoginButton(props: Props) {
  const runtime = useAppKitRuntime();
  const [error, setError] = useState<string | null>(null);

  if (!runtime.ready) {
    const message = runtime.loading
      ? "ウォレット接続設定を読み込み中です..."
      : runtime.error || "ウォレット接続設定が完了していません。";

    return (
      <div className="wallet-login">
        <button
          className={props.className || "pixel-button"}
          type="button"
          disabled={runtime.loading}
          onClick={() => setError(message)}
        >
          {props.label}
        </button>
        {error || !runtime.loading ? <p className="form-error">{error || message}</p> : null}
      </div>
    );
  }

  return <WalletLoginInner {...props} />;
}
