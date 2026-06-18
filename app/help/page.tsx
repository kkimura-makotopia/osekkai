'use client'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function HelpPage() {
  const { data: session } = useSession()
  const role = session?.role ?? 'guest'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">おせっ会の使い方</h1>
        <p className="text-slate-400 mt-2">
          経営課題を持ち寄り、解決アクションが生まれる招待制コミュニティです。
        </p>
      </div>

      {/* ロールについて */}
      <Section title="権限について" icon="👤">
        <div className="space-y-3 text-sm">
          <RoleRow label="運営管理者" color="bg-amber-500/20 text-amber-400 border-amber-500/30"
            desc="交流会の作成・編集・削除、会員管理、おせっかいの管理ができます。" />
          <RoleRow label="正会員" color="bg-blue-500/20 text-blue-400 border-blue-500/30"
            desc="交流会の閲覧と参加、おせっかいの送受信ができます。他のメンバーの実名が見えます。" />
          <RoleRow label="ゲスト" color="bg-slate-500/20 text-slate-300 border-slate-500/30"
            desc="運営の承認待ち状態です。閲覧はできますが、メンバーの実名は匿名表示になります。" />
        </div>
      </Section>

      {/* おせっかいフロー */}
      <Section title="おせっかいを送る流れ" icon="💬">
        <p className="text-slate-300 text-sm mb-4 leading-relaxed">
          「おせっかい」とは、参加者同士で価値を持ち寄り、つながりや学びを生み出す行為のこと。
          交流会で出会った相手に、紹介・知見・サービスなどを共有しましょう。
        </p>

        <Step n={1} title="交流会の詳細ページを開く">
          ヘッダの「交流会」から参加した交流会を選択します。<br />
          {role === 'guest' && <span className="text-amber-300">※ ゲストは詳細ページにアクセスできません。運営から承認されると閲覧可能になります。</span>}
        </Step>

        <Step n={2} title="「おせっかいを送る」ボタンを押す">
          画面右側の「おせっかい」セクション上部にあるボタンをクリックします。
        </Step>

        <Step n={3} title="送り先を選ぶ">
          交流会に招待されているメンバーから 1名 選択します。
        </Step>

        <Step n={4} title="種類を選ぶ">
          <ul className="mt-2 space-y-1.5 text-slate-300">
            <li><span className="inline-block bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full mr-2">知人の紹介</span>有用な人をご紹介する</li>
            <li><span className="inline-block bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full mr-2">サービスの紹介</span>関連するサービスやプロダクトを共有する</li>
            <li><span className="inline-block bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded-full mr-2">ナレッジの共有</span>経験や知見を伝える</li>
            <li><span className="inline-block bg-slate-500/20 text-slate-300 text-xs px-2 py-0.5 rounded-full mr-2">その他</span>上記に当てはまらない応援メッセージなど</li>
          </ul>
        </Step>

        <Step n={5} title="内容を書いて「送信」">
          相手にとって価値ある具体的な情報を記入し、送信します。<br />
          <span className="text-slate-400 text-xs">※ 後から自分の投稿は編集・削除できます。</span>
        </Step>

        <div className="mt-5 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-100">
          💡 受け取ったおせっかいは <strong>ヘッダ「おせっかい一覧」</strong> から閲覧できます。<br />
          他のメンバー同士のおせっかいも参考にできます（タブ切替）。
        </div>
      </Section>

      {/* 経営課題提出フォーム */}
      <Section title="経営課題提出フォームの使い方" icon="📝">
        <p className="text-slate-300 text-sm leading-relaxed mb-4">
          交流会で発表する経営課題を、AIと一緒に整理して提出できます。テキスト・質疑応答・自分で作成の3つの方法から選べます。
        </p>
        <Link href="/help/issues"
          className="inline-block bg-brand-sky hover:bg-brand-sky-400 text-white text-sm font-medium px-4 py-2 rounded-xl">
          詳しい使い方を見る →
        </Link>
      </Section>

      {/* プロフィール */}
      <Section title="プロフィールの編集" icon="✏️">
        <p className="text-slate-300 text-sm leading-relaxed">
          画面右上のアイコンをクリック → 「マイページ」から、氏名・会社名・役職・業界・従業員数・自己紹介・SNSリンクなどを編集できます。<br />
          プロフィールが充実していると、他のメンバーから紹介されやすくなります。
        </p>
      </Section>

      {/* 補足 */}
      <Section title="その他" icon="❓">
        <p className="text-slate-300 text-sm leading-relaxed">
          不明点や不具合のご報告は運営までご連絡ください。<br />
          完全招待制のため、新メンバーが会員になり本サイトを利用するためには運営の許可が必要です。
        </p>
        <div className="mt-4">
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">← ホームに戻る</Link>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </div>
  )
}

function RoleRow({ label, color, desc }: { label: string; color: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`text-xs px-2 py-1 rounded-full font-medium border shrink-0 ${color}`}>{label}</span>
      <p className="text-slate-300 leading-relaxed">{desc}</p>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 mb-4">
      <div className="w-7 h-7 rounded-full bg-brand-sky text-white text-sm font-bold flex items-center justify-center shrink-0">
        {n}
      </div>
      <div className="flex-1">
        <h3 className="text-white font-semibold mb-1">{title}</h3>
        <div className="text-slate-300 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}
