'use client'
import Link from 'next/link'

export default function IssuesHelpPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/help" className="text-slate-400 hover:text-white text-sm">← 使い方トップへ戻る</Link>

      <div className="mb-8 mt-3">
        <h1 className="text-3xl font-bold text-white">経営課題提出フォームの使い方</h1>
        <p className="text-slate-400 mt-2 leading-relaxed">
          自社の経営課題を整理して提出するフォームです。提出した課題はおせっ会（4名テーブル）で発表し、
          他の経営者から<strong className="text-slate-200">アドバイス・成功事例・人脈やサービスの紹介</strong>を獲得することが目的です。<br />
          以下の流れで進みます。
        </p>
      </div>

      <div className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl p-6">
        <Step n={1} title="アプリにログイン">
          Googleアカウントでログインします。
        </Step>

        <Step n={2} title="ヘッダの「経営課題提出フォーム」をクリック">
          画面上部のメニューから <span className="text-brand-sky-400">経営課題提出フォーム</span> を開き、「+ 新規提出」を押します。
          <Shot src="/guide/2_issue-click.png" alt="ヘッダの経営課題提出フォームボタン" />
        </Step>

        <Step n={3} title="イベント・形式を選ぶ">
          提出先のイベントを選び、3つの入力形式から1つを選びます。
          <ul className="mt-2 space-y-1.5 text-slate-300">
            <li><strong className="text-white">① テキスト形式</strong>：現在視点で、事業の状況や悩みを自由に書いて課題を洗い出す</li>
            <li><strong className="text-white">② 質疑応答形式</strong>：3年後のあるべき姿から逆算する未来視点。質問に1問ずつ回答</li>
            <li><strong className="text-white">③ 自分で作成する</strong>：既に課題が明確な方向け。AIを使わず直接入力</li>
          </ul>
          <Shot src="/guide/3_issue-format.png" alt="イベント・形式の選択画面" />
        </Step>

        <Step n={4} title="プロフィールを入力する">
          マイページと同じ項目です。入力済みの内容は自動で補完され、ここで修正するとマイページにも反映されます。<br />
          <span className="text-slate-400 text-xs">※「非公開」マークの項目は他の会員には表示されず、課題解析の精度向上にのみ使われます。</span>
          <Shot src="/guide/4_issue-profile.png" alt="プロフィール入力画面" />
        </Step>

        <Step n={5} title="入力・AI解析">
          選んだ形式に沿って入力します。①テキスト・②質疑応答では「AIで課題を抽出する」を押すと、AIが課題を2〜3件にまとめます。
          <Shot src="/guide/5_issue-input.png" alt="入力・AI解析画面（テキスト形式の例）" />
        </Step>

        <Step n={6} title="内容の確認・編集">
          AIの提案はあくまで下書きです。<strong className="text-slate-200">タイトルや内容は自由に編集</strong>してください（課題は最大3件）。<br />
          右上の <span className="text-brand-sky-400">💡 おせっかいを多く獲得するヒント</span> も参考にしながら、一目で伝わる形に整えましょう。
          <Shot src="/guide/6_issue-edit.png" alt="内容の確認・編集画面" />
        </Step>

        <Step n={7} title="提出する" last>
          A4一枚のプレビューで最終確認し、「運営に提出する」を押して完了です。<br />
          <span className="text-slate-400 text-xs">※ 提出後も一覧からいつでも再編集できます（編集後も同じ確認画面を経て再提出します）。</span>
        </Step>
      </div>

      {/* ヒント */}
      <Section title="おせっかいを多く獲得するヒント" icon="💡">
        <ul className="space-y-2 text-sm text-slate-300">
          <Hint>AIレコメンドは参考程度にしていただき、言い回しなどは是非変更してください！</Hint>
          <Hint>発表時間は8分なので、課題は2〜3件を推奨しています！</Hint>
          <Hint>ターゲットを年商規模などで絞りすぎると、おせっかいが出にくくなる可能性が高いので、どんな会員でも理解しておせっかいができる文章を工夫してみてください！</Hint>
          <Hint>抽象的すぎると深掘りで時間が終了してしまいます。「代理店の管理工数が肥大化しているので代理店や店舗管理のTipsを知りたい」等の具体的な課題も織り交ぜると、おせっかいをもらいやすいです！</Hint>
          <Hint>直接的なクライアントの紹介依頼はNGですが、Tipsがある方や共催セミナーができる方などの紹介依頼は有効です！</Hint>
        </ul>
      </Section>

      <div className="flex gap-4 mt-2">
        <Link href="/issues/new" className="text-brand-sky-400 hover:text-brand-sky text-sm font-medium">経営課題を提出する →</Link>
        <Link href="/help" className="text-slate-400 hover:text-white text-sm">← 使い方トップ</Link>
      </div>
    </div>
  )
}

function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      className="mt-3 w-full rounded-xl border border-brand-navy-700"
    />
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl p-6 mt-6 mb-4">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </div>
  )
}

function Step({ n, title, children, last }: { n: number; title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-brand-sky text-white text-sm font-bold flex items-center justify-center shrink-0">
          {n}
        </div>
        {!last && <div className="w-px flex-1 bg-brand-navy-700 my-1" />}
      </div>
      <div className={`flex-1 ${last ? '' : 'pb-6'}`}>
        <h3 className="text-white font-semibold mb-1">{title}</h3>
        <div className="text-slate-300 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 leading-relaxed">
      <span className="text-brand-sky-400 shrink-0">・</span>
      <span>{children}</span>
    </li>
  )
}
