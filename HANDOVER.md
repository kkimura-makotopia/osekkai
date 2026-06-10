# おせっ会 (OSEKKAI) 引き継ぎ書

最終更新: 2026-06-10

---

## 1. プロジェクト概要

- **名称**: おせっ会 (OSEKKAI)
- **目的**: 経営課題を持ち寄り解決アクションを生む、完全招待制の経営者コミュニティ
- **公開URL**: https://osekkai.vercel.app
- **GitHub**: https://github.com/kkimura-makotopia/osekkai
- **本番DB**: Supabase (PostgreSQL)
- **ホスティング**: Vercel
- **メール**: Resend (`k.kimura@makotopia.com` から送信)

---

## 2. 技術スタック

| レイヤー | 技術 |
|---|---|
| フレームワーク | Next.js 14.2.16 (App Router) |
| 言語 | TypeScript |
| スタイル | Tailwind CSS（ブランドカラー `brand-navy` / `brand-sky` カスタム定義） |
| ORM | Prisma 7.7.0 |
| DB | PostgreSQL (Supabase) |
| 認証 | NextAuth.js + Google OAuth |
| メール | Resend SDK 4.0 |
| デプロイ | Vercel (auto-deploy on git push) |

---

## 3. 環境変数

`.env.local`（ローカル）と Vercel の Environment Variables 両方に以下が必要:

| Key | 用途 | 備考 |
|---|---|---|
| `DATABASE_URL` | Supabase 接続文字列 | Pooler URI (port 5432 か 6543) |
| `NEXTAUTH_URL` | 本番 URL | `https://osekkai.vercel.app` |
| `NEXTAUTH_SECRET` | JWT 署名キー | ローカル/本番別の値 |
| `GOOGLE_CLIENT_ID` | Google OAuth | |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | |
| `RESEND_API_KEY` | Resend API | `re_...` |
| `EMAIL_FROM` | 送信元 | `おせっ会 <k.kimura@makotopia.com>` |

### Google OAuth Redirect URI（追加済み）
```
https://osekkai.vercel.app/api/auth/callback/google
```

---

## 4. ロール構成

3ロール。`lib/auth.ts` の `BOOTSTRAP_ADMIN_EMAILS` で `k.kimura@makotopia.com` を起動時に自動 admin 化。

| ロール | 内部値 | 権限 |
|---|---|---|
| 運営管理者 | `admin` | 全機能。会員管理・交流会管理・おせっかい削除 |
| 正会員 | `member` | 標準ユーザー、メンバーの実名閲覧可 |
| ゲスト | `guest` | 承認待ち。他メンバーは匿名表示 |

新規 Google ログインユーザーは `guest` で作成され、運営が会員管理画面で昇格させる。

---

## 5. データモデル (`prisma/schema.prisma`)

主要モデル:

- `User` — プロフィール情報全般（後述の新規8+1項目を含む）
- `CommunityEvent` — 交流会
- `EventInvitee` — 交流会の招待者（多対多中間）
- `Feedback` — おせっかい本体
- `FeedbackComment` — おせっかいへのコメント
- `ReferralLink` — 紹介リンク（現UIからは到達不能だがDBには残置）

主要な `onDelete: Cascade` ルール:
- User削除 → 作成した交流会・送受信おせっかい・紹介リンク・コメントが全て cascade 削除
- Event削除 → 招待・おせっかい・コメントが cascade 削除

### User モデルのプロフィール項目一覧（公開/非公開区分）

`lib/publicFields.ts` の `PUBLIC_FIELDS` で公開項目を定義。他は非公開（自分と運営管理者のみ可視）。

**公開項目（おせっかい一覧で氏名クリック時に表示）:**
- `email`
- `fullName` (氏名)
- `company` (会社名)
- `jobTitle` (役職, dropdown / `lib/jobTitles.ts`)
- `industry` (業界, dropdown / `lib/industries.ts`)
- `employeeCount` (従業員数)
- `foundingYear` (設立年)
- `recentRevenue` (直近の確定している期の売上, dropdown / `REVENUE_RANGES`)
- `serviceUnitPrice` (サービス平均単価, テキスト)
- `bio` (自己紹介)
- `snsLinks` (SNS: X/Facebook/Webサイト)

**非公開項目:**
- `fiscalMonth` (決算月, 1-12)
- `targetRevenueScale` (メイン商材ターゲット売上規模, `REVENUE_RANGES`)
- `marketingChannels` (マーケチャネル, チェックボックス複数選択 / `MARKETING_CHANNELS`)
- `fullTimeEmployees` (正社員数, テキスト)
- `branchCount` (拠点数, テキスト)
- `operatingMargin` (営業利益率, dropdown / `OPERATING_MARGINS`)
- `serviceBreakdown` (売上構成比, 動的リスト `[{name,percentage}]`)
- `customerCount` (顧客数, テキスト)
- `revenueGrowth` (3年前からの売上成長率, dropdown / `REVENUE_GROWTH_RATES`)
- `revenueTarget3y` (3年後の売上目標, dropdown / `REVENUE_RANGES`)
- `referralTemplate` (旧紹介リンク用テンプレ、現UIからは削除)

---

## 6. 主要ページ

| パス | 概要 |
|---|---|
| `/login` | Googleログイン |
| `/onboarding` | 初回登録（氏名・会社・役職・業界・従業員数を必須） |
| `/mypage` | プロフィール編集（デフォルトで編集モード開）|
| `/events` | 交流会一覧（ゲスト/正会員/管理者で挙動同じ） |
| `/events/[id]` | 交流会詳細（ゲストは `/events` にリダイレクト） |
| `/admin` | ダッシュボード（会員数・交流会・おせっかい件数） |
| `/admin/members` | 会員管理（ロール変更・物理削除） |
| `/admin/events` | 交流会管理（作成・編集・削除） |
| `/feedbacks` | おせっかい一覧（タブ・絞り込み3種） |
| `/feedbacks/[id]` | おせっかい詳細・コメント |
| `/help` | 使い方ヘルプ |

### `/help` （ヘッダの ? アイコン）に表示するセクション
- 権限について
- おせっかいを送る流れ
- プロフィールの編集
- その他（運営許可制の説明）

---

## 7. おせっかい機能

### Feedback 種類（FB_LABELS）
`FB_TYPE_OPTIONS = ['intro', 'feedback', 'advice', 'other']`

| 内部値 | 表示 | カラー |
|---|---|---|
| intro | 知人の紹介 | 青系 |
| feedback | サービスの紹介 | 緑系 |
| advice | ナレッジの共有 | 紫系 |
| other | その他 | グレー系 |

### おせっかい一覧 `/feedbacks` の絞り込み（3つすべてドロップダウン）
1. 種類 (`FbFilter`)
2. 交流会 (`eventFilter`)
3. おせっかいした人 (`senderFilter` — 表示中のおせっかいの fromUser から自動抽出)

### コメント
- スキーマ: `FeedbackComment` モデル
- 詳細ページ `/feedbacks/[id]` で投稿・閲覧
- 投稿時に **Resend で fromUser と toUser にメール通知**（投稿者本人は除外、ゲストは送信者表示で「匿名」）
- `lib/email.ts` の `sendCommentNotification` 経由
- メールには `${NEXTAUTH_URL}/feedbacks/${id}` への遷移ボタン

### 削除権限
- 自分の投稿は本人または管理者
- 管理者は全件削除可（API: `/api/feedbacks/[id]` DELETE）
- 管理者は全コメントを削除可（API: `/api/feedbacks/comments/[id]` DELETE）

---

## 8. ゲスト匿名化ルール

ゲストは認証待ちでメンバーの実名・詳細を見られないよう、`shouldHide(u)` で判定:

```ts
const shouldHide = (u) => {
  if (u.id === myId) return false        // 自分は常に表示
  return viewerIsGuest || u.role === 'guest'  // 閲覧者がゲスト OR 表示対象がゲスト
}
```

3画面のユーザー詳細ポップアップで適用:
- `/feedbacks/page.tsx`
- `/feedbacks/[id]/page.tsx`
- `/events/[id]/page.tsx`

`shouldHide` がtrueなら名前は「匿名」表示、クリック不可、ポップアップも開かない。

---

## 9. 交流会機能の最新仕様

- **PDFアップロード機能は削除済み**（旧 `issuePdfData` / `issuePdfName` カラムは残置）
- 開催日時のタイムゾーンずれを修正済み: クライアントで `new Date(form.heldAt).toISOString()` してから送信
- ゲストは `/events/[id]` にアクセスすると `/events` にリダイレクト
- 「おせっかいを送る」ボタンは青CTAボタン
- 招待者管理は管理者の create/edit フォームで複数選択

---

## 10. 公開フラグ表示（マイページ）

`lib/publicFields.ts` の `isPublicField(key)` で判定し、`<FieldLabel field="xxx">` 内でバッジ表示:

```tsx
<span className={isPublic ? 'bg-emerald-500/15 text-emerald-400 ...' : 'bg-slate-500/15 ...'}>
  {isPublic ? '公開' : '非公開'}
</span>
```

---

## 11. デザインテーマ

`tailwind.config.ts` のカスタムカラー:

```ts
brand: {
  navy: '#0A2540',           // ロゴの濃紺
  'navy-700': '#163A5F',
  'navy-800': '#0F2D4D',
  'navy-900': '#08203A',
  'navy-950': '#061A30',
  sky: '#1E9CE6',            // ロゴの明るいブルー
  'sky-400': '#3FB1F0',
  'sky-500': '#1E9CE6',
  'sky-600': '#0F87CC',
}
```

ロゴ画像: `public/osekkai-logo.png`

---

## 12. DNS / メール設定

ドメイン: `makotopia.com`（GMO Internet Group / お名前.com 管理）
DNS: お名前.com 標準DNS（`*.dnsv.jp`）

Resend 用に追加済みのDNSレコード（**Verified**）:
- `send` MX → `feedback-smtp.ap-northeast-1.amazonses.com` (priority 10)
- `send` TXT → `v=spf1 include:amazonses.com ~all`
- `resend._domainkey` TXT → 公開鍵 (`p=MIGfMA0...`)
- `_dmarc` TXT → 既存の `v=DMARC1; p=none; rua=mailto:k.kimura@makotopia.com`

既存の Google Workspace の MX/SPF/DKIM/DMARC はそのまま残置。Resend はサブドメイン `send.makotopia.com` 経由なので競合なし。

---

## 13. デプロイ手順

### コード変更のみ:
```powershell
git add .
git commit -m "..."
git push origin main
```
→ Vercel が自動でビルド・デプロイ

### スキーマ変更を含む場合:
1. Supabase SQL Editor で必要な ALTER TABLE 実行
2. `git push` でコードを反映
3. Vercel ビルド完了を確認

Vercel ビルドが失敗する場合: **Use existing Build Cache のチェックを外して Redeploy**。

---

## 14. 最近のコミット履歴（参考）

直近の主な変更:
- 新プロフィール項目8つ＋3年後売上目標 追加、公開/非公開バッジ実装
- メールアドレスをユーザー詳細ポップアップに表示
- おせっかい一覧の絞り込みを3軸ドロップダウン化（種類・交流会・送信者）
- おせっかいへのコメント機能 + メール通知
- ヘッダ ? アイコンでヘルプページ表示
- ロゴ画像 + 全体カラーをブランドトーンに統一
- 経営課題 / アポリクエスト / 紹介リンク機能を削除（モデルは残置）
- 交流会の PDF 機能削除、datetime タイムゾーン修正
- 会員管理での物理削除（cascade FK）

---

## 15. 既知の制約・残課題

- `package.json` に `@anthropic-ai/sdk` が残置（コードから参照無し、削除可）
- 旧 `linkToken` / `ReferralLink` などのテーブルがDBに残っている
- `User.referralTemplate` カラムが残っているが現UIからは使われない
- 旧 `issuePdfData` / `issuePdfName` / `minutesText` / `aiSummary` カラムが `CommunityEvent` に残置
- 旧 `Feedback.linkToken` が残置
- マイページの「閉じる」(編集モード非編集時)の表示UIは現状ほぼ何も表示しない設計（編集モードを開放したまま運用が前提）

---

## 16. プロジェクト構成

```
.
├── app/
│   ├── admin/                  # 管理者画面
│   │   ├── events/             # 交流会管理
│   │   ├── members/            # 会員管理
│   │   └── page.tsx            # ダッシュボード
│   ├── api/                    # APIルート
│   │   ├── auth/               # NextAuth
│   │   ├── events/             # 交流会CRUD
│   │   ├── feedbacks/          # おせっかい+コメント
│   │   ├── users/              # ユーザーCRUD
│   │   └── referral/           # （旧）紹介リンク
│   ├── events/                 # 交流会画面
│   ├── feedbacks/              # おせっかい画面
│   ├── help/                   # 使い方
│   ├── invite/                 # （旧）招待リンク表示
│   ├── login/                  # ログイン
│   ├── mypage/                 # マイページ
│   ├── onboarding/             # 初回登録
│   ├── referral/               # （旧、未到達）
│   ├── layout.tsx              # 共通レイアウト + ProfileGuard
│   ├── page.tsx                # ルート（適切な画面へリダイレクト）
│   └── providers.tsx           # SessionProvider
├── components/
│   ├── auth/
│   │   ├── LoginClient.tsx     # ログインUI
│   │   └── ProfileGuard.tsx    # プロフィール未入力ガード
│   └── layout/
│       └── Navbar.tsx          # ヘッダ
├── lib/
│   ├── auth.ts                 # NextAuth設定 + BOOTSTRAP_ADMIN_EMAILS
│   ├── email.ts                # Resend経由のメール送信ユーティリティ
│   ├── industries.ts           # 業界選択肢
│   ├── jobTitles.ts            # 役職選択肢（会長/代表取締役/取締役/執行役員/CXO）
│   ├── prisma.ts               # Prisma Client
│   ├── profileOptions.ts       # 売上レンジ等の定数
│   ├── publicFields.ts         # 公開フィールド定数
│   └── utils.ts
├── prisma/
│   └── schema.prisma           # DBスキーマ
├── public/
│   └── osekkai-logo.png        # ロゴ
├── types/
│   └── next-auth.d.ts          # セッション型拡張
├── next.config.mjs
├── package.json
├── tailwind.config.ts          # ブランドカラー定義
└── tsconfig.json
```

---

## 17. 次のセッションへ

このファイル `HANDOVER.md` と `prisma/schema.prisma` を最初に読めば全体像を把握できます。
直近のやり取りは Git のコミット履歴 (`git log --oneline -20`) を参照してください。

**進行中のタスクは特になし**。すべての要望が一通り反映済みの状態です。

---

## 18. 連絡先

- 運営管理者アカウント: `k.kimura@makotopia.com`
- 送信元アドレス: 同上
