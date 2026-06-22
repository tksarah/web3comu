import Link from "next/link";
import Image from "next/image";

const stages = [
  {
    label: "STAGE 1",
    title: "LiONのWeb3分科会を知る",
    image: "/images/guide-stage-01.png",
    width: 1536,
    height: 1024,
    alt: "ギルド受付でWeb3分科会について案内を受ける冒険者たち",
    body: "このポータルは、LiONにおけるWeb3分科会のコミュニティ入口です。学び、情報共有、実践のための仲間が集まる場所です。",
    action: "まずは自分がどのコミュニティに参加するのかを確認します。",
    cta: {
      label: "LiON公式サイトへ",
      href: "https://linuc.community/",
      external: true
    }
  },
  {
    label: "STAGE 2",
    title: "分科会の目的を理解する",
    image: "/images/guide-stage-02.png",
    width: 1536,
    height: 1024,
    alt: "光る作戦卓を囲んでWeb3分科会の目的を確認する冒険者たち",
    body: "Web3技術の教育と実践を通じて技術者の育成を促進し、トークンを活用したコミュニティ活性化の仕組みを構築しながら、メンバーのスキル向上と社会的価値の創出を目指します。",
    action: "技術を学ぶだけでなく、実際に動かし、価値を生み出す冒険だと捉えます。"
  },
  {
    label: "STAGE 3",
    title: "ウォレットを準備する",
    image: "/images/guide-stage-03.png",
    width: 1536,
    height: 1024,
    alt: "魔法の道具店でウォレットのような道具を選ぶ冒険者",
    body: "MetaMask、Trust Wallet、Rabby Walletなど、EVM対応ウォレットを用意します。ポータルへの接続やトークンの受け取りに使います。",
    action: "秘密鍵やリカバリーフレーズは誰にも共有せず、安全に保管します。"
  },
  {
    label: "STAGE 4",
    title: "Soneiumのネットワークを登録する",
    image: "/images/guide-stage-04.png",
    width: 1672,
    height: 941,
    alt: "二つのポータルゲートを調整してネットワーク登録を進める冒険者",
    body: "このコミュニティでは、Soneium MainnetとSoneium Minato Testnetを中心に扱います。ウォレットにネットワークを追加しておきます。",
    action: "実践用のMainnetと検証用のMinatoを使い分ける準備をします。公式情報を確認しながら、ウォレットへ手動で登録します。",
    cta: {
      label: "ネットワーク情報を見る",
      href: "https://docs.soneium.org/docs/builders/overview",
      external: true
    }
  },
  {
    label: "STAGE 5",
    title: "参加表明と招待トークン",
    image: "/images/guide-stage-05.png",
    width: 1536,
    height: 1024,
    alt: "プロジェクトリーダーから招待トークンを受け取る冒険者",
    body: "LiONに参加し、その中のWeb3分科会へ参加表明します。プロジェクトリーダーから招待トークンを受け取ることで、ポータル参加の準備が整います。",
    action: "分科会内の案内に従い、参加意思を伝えます。"
  },
  {
    label: "STAGE 6",
    title: "Faucetでガス代を受け取る",
    image: "/images/guide-stage-06.png",
    width: 1536,
    height: 1024,
    alt: "補給所でFaucetからガス代用トークンを受け取る冒険者",
    body: "Faucetからガス代用のトークンを取得します。オンチェーン操作やログインボーナスなどを試すための燃料になります。",
    action: "対象ウォレットでFaucetへ進み、必要なネットワークのトークンを受け取ります。",
    cta: {
      label: "Faucetへ進む",
      href: "/faucet"
    }
  }
];

export default function GuidePage() {
  return (
    <main className="guide-page">
      <section className="guide-hero" aria-labelledby="guide-title">
        <Image
          priority
          fill
          className="guide-hero-image"
          src="/images/guide-hero.png"
          alt="冒険の始まりをイメージしたWeb3ガイドのキービジュアル"
          sizes="(max-width: 720px) calc(100vw - 28px), 1180px"
        />
        <div className="guide-hero-copy">
          <p className="eyebrow">START GUIDE</p>
          <h1 id="guide-title">冒険をはじめる準備</h1>
          <p>
            Web3分科会のポータルへ入る前に、必要な装備と手順を確認しましょう。
            初めて訪れた方が迷わず参加できるように、準備の流れをステージ形式で案内します。
          </p>
        </div>
      </section>

      <section className="guide-intro pixel-panel" aria-label="このサイトについて">
        <p className="eyebrow">ABOUT THIS PORTAL</p>
        <h2>LiON Web3分科会のためのコミュニティポータル</h2>
        <p>
          LiONの中でWeb3技術を学び、実践し、情報共有や連携を進めるための場所です。
          ウォレットやトークンを使いながら、メンバー同士の活動を少しずつ広げていきます。
        </p>
      </section>

      <section className="stage-section" aria-labelledby="stage-title">
        <div className="guide-section-head">
          <p className="eyebrow">START STAGES</p>
          <h2 id="stage-title">冒険開始までの6ステージ</h2>
        </div>
        <div className="stage-grid">
          {stages.map((stage) => (
            <article className="stage-card pixel-panel" key={stage.label}>
              <Image
                className="stage-image"
                src={stage.image}
                alt={stage.alt}
                width={stage.width}
                height={stage.height}
                sizes="(max-width: 720px) calc(100vw - 48px), 581px"
              />
              <div className="stage-card-body">
                <span className="stage-label">{stage.label}</span>
                <h3>{stage.title}</h3>
                <p>{stage.body}</p>
                <strong>{stage.action}</strong>
                {stage.cta ? (
                  stage.cta.external ? (
                    <a className="stage-link-button" href={stage.cta.href} target="_blank" rel="noreferrer">
                      {stage.cta.label}
                    </a>
                  ) : (
                    <Link className="stage-link-button" href={stage.cta.href}>
                      {stage.cta.label}
                    </Link>
                  )
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-final pixel-panel" aria-labelledby="final-title">
        <p className="eyebrow">FINAL GATE</p>
        <h2 id="final-title">準備ができたらポータルへ</h2>
        <p>
          ウォレット、ネットワーク、招待トークン、ガス代の準備が整ったら、LPに戻ってウォレット接続を行います。
          そこからWeb3分科会のポータルへ進めます。
        </p>
        <div className="guide-cta-row">
          <Link className="pixel-button guide-return-button" href="/">
            LPへ戻る
          </Link>
        </div>
      </section>
    </main>
  );
}
