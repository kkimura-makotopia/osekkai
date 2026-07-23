# おせっ会 (OSEKKAI) 引き継ぎ書

最終更新: 2026-07-24

> このファイルと `prisma/schema.prisma` を最初に読めば全体像を把握できます。
> 直近のやり取りは `git log --oneline -30` を参照してください。

---

## 1. プロジェクト概要

- **名称**: おせっ会 (OSEKKAI)
- **目的**: 経営課題を持ち寄り、解決アクション（アドバイス・成功事例・人脈/サービス紹介）を生む、完全招待制の経営者コミュニティ
- **公開URL**: https://osekkai.vercel.app
- **GitHub**: https://github.com/kkimura-makotopia/osekkai （main へ push で Vercel 自動デプロイ）
- **本番DB**: Supabase (PostgreSQL)
- **ホスティング**: Vercel
- **メール**: Resend (`k.kimura@makotopia.com` から送信)
- **AI**: Anthropic Claude（経営課題の解析）

---

## 2. 技術スタック

| レイヤー | 技術 |
|---|---|
| フレームワーク | Next.js 14.2.16 (App Router) |
| 言語 | TypeScript |
| スタイル | Tailwind CSS（`brand-navy` / `brand-sky` カスタムカラー） |
| UI | Radix UI, lucide-react（アイコン） |
| ORM | Prisma 7.7.0（`@prisma/adapter-pg` + `pg` プール） |
| DB | PostgreSQL (Supabase) |
| 認証 | NextAuth.js 4 + Google OAuth（JWTセッション） |
| メール | Resend SDK 4.0 |
| AI | `@anthropic-ai/sdk`（モデル `claude-sonnet-4-6`、tool useで構造化出力） |
| デプロイ | Vercel |

---

## 3. 環境変数

`.env.local`（ローカル、gitignore済）と Vercel の Environment Variables 両方に必要:

| Key | 用途 | 備考 |
|---|---|---|
| `DATABASE_URL` | Supabase 接続文字列 | Pooler URI（同時接続対策で6543推奨） |
| `NEXTAUTH_URL` | 本番 URL | `https://osekkai.vercel.app` |
| `NEXTAUTH_SECRET` | JWT署名/暗号鍵 | ローカル/本番別 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth | |
| `RESEND_API_KEY` | Resend API | `re_...` |
| `EMAIL_FROM` | 送信元 | `おせっ会 <k.kimura@makotopia.com>` |
| `ANTHROPIC_API_KEY` | **経営課題のAI解析** | `sk-ant-...`（未設定だとAI抽出がエラー） |

Google OAuth Redirect URI（追加済）: `https://osekkai.vercel.app/api/auth/callback/google`

---

## 4. ⚠️ DBマイグレーション運用（最重要・事故注意）

**Prisma migrate は使っていません。スキーマ変更は Supabase SQL Editor で手動実行**します。SQLは `prisma/migrations_manual/*.sql` に保存。

**手順（順序厳守）**:
1. スキーマ変更を含む場合は **先に Supabase で ALTER/CREATE を実行**
2. その後 `git push`（Vercelデプロイ）

> ❗ **順序を逆にすると本番が壊れます**。例: カラムをschemaに足して先にデプロイすると、`jwt`コールバックのユーザー取得クエリが存在しないカラムを参照して失敗し、**全員ログイン不可（error=Callback）**になります（過去に発生）。ADD COLUMN 等は後方互換なので**SQLを先に流せば安全**。

**未実行だと問題が出る主なSQL（新環境/未反映なら要確認）**:
- `2026-06-10_management_issues.sql` — issue_submissions / management_issues テーブル＋issue_mode enum
- `2026-06-11_add_request_type.sql` — management_issues.requestType
- `2026-07-01_issue_mode_manual.sql` — issue_mode に 'manual' 追加
- `2026-07-07_add_business_summary.sql` — users.businessSummary
- `2026-07-23_feedbacks_eventid_index.sql` — feedbacks(eventId) インデックス

Vercelビルド失敗時: **Use existing Build Cache のチェックを外して Redeploy**。

---

## 5. ロール構成

3ロール。`lib/auth.ts` の `BOOTSTRAP_ADMIN_EMAILS`（`k.kimura@makotopia.com`）を起動時に自動admin化。

| ロール | 内部値 | 権限 |
|---|---|---|
| 運営管理者 | `admin` | 全機能 |
| 正会員 | `member` | 標準。実名閲覧・おせっかい/コメント/経営課題の作成可 |
| ゲスト | `guest` | 承認待ち。閲覧のみ。**他会員は匿名表示**（作成系すべて不可） |

- 新規Googleログインは `guest` で作成 → 運営が会員管理画面で昇格
- **ロール変更は再ログイン不要**：`jwt`コールバックが毎回DBから最新roleを取得。画面更新（またはタブ復帰）で反映
- **削除/無効化ユーザーは即失効**：APIは毎回DB実在チェック（401）＋クライアントは`SessionGuard`で自動signOut

---

## 6. データモデル (`prisma/schema.prisma`)

主要モデル:
- `User` — プロフィール全般。**`bio`=経歴・プロフィール / `businessSummary`=事業内容サマリ**（自己紹介を2分割）
- `CommunityEvent` — 交流会（旧 issuePdfData/minutesText/aiSummary カラムは残置だがAPIで返さない）
- `EventInvitee` — 交流会の招待者（多対多中間）
- `Feedback` — おせっかい本体（`@@index([eventId])`）
- `FeedbackComment` — おせっかいへのコメント
- `IssueSubmission` — 経営課題の提出単位（1ユーザー×1イベントでupsert。`@@unique([userId,eventId])`）
- `ManagementIssue` — 個々の経営課題（提出に2〜3件ぶら下がる）
- `ReferralLink` — （旧・未使用。モデルのみ残置）

`onDelete: Cascade`: User削除 → 作成イベント・送受信おせっかい・コメント・経営課題提出が cascade。

### 公開/非公開（`lib/publicFields.ts` の `PUBLIC_FIELDS`）
**公開**: fullName, company, jobTitle, industry, employeeCount, foundingYear, serviceUnitPrice, bio, businessSummary, snsLinks, email
**非公開**（自分と運営のみ）: fiscalMonth, targetRevenueScale, marketingChannels, fullTimeEmployees(数値), branchCount(数値), operatingMargin, serviceBreakdown, customerCount, revenueGrowth, revenueTarget3y, **recentRevenue（※途中で公開→非公開に変更）**
- 単価/顧客数はドロップダウン、正社員数/拠点数は数値入力（`lib/profileOptions.ts` に選択肢）

---

## 7. 経営課題 提出フォーム（今セッションの目玉機能）

**目的**: 正会員が経営課題を2〜3件提出 → おせっ会（4名テーブル）で発表 → 他の経営者からアドバイス・紹介を獲得。

### フロー（`/issues/new` ウィザード・5ステップ）
1. **イベント・形式**: 提出先イベント（本日以降のみ）＋入力形式を選択。既提出イベントには上書き警告。
2. **プロフィール**: マイページと同項目（共有コンポーネント `components/profile/ProfileFieldsForm.tsx`）。既存値を補完、保存でマイページにも反映。自己紹介/SNSは非表示。
3. **入力・AI解析**: 進捗バー付き。
4. **内容の確認・編集**: AI抽出をカード編集（最大3件）。💡「おせっかいを多く獲得するヒント」ポップアップ。
5. **提出する最新版を確認**: A4提出シート（`components/issues/SubmissionPreview.tsx`）で確認 → 運営に提出。
- 提出後も `/issues` → `/issues/[id]` で編集可（編集も確認画面を経て再提出）。タブ切替時の入力消失防止のため初期読込は `loadedRef` で一度だけ。

### 3つの入力形式（`Mode = 'text' | 'qa' | 'manual'`）
- **① テキスト形式**: 現状視点。自由記述 → AIが課題抽出
- **② 質疑応答形式**: 未来視点（3年後から逆算）。**15問**を1問ずつ回答（スキップ不可、各問にグレーの回答例）→ AI抽出
- **③ 自分で作成する**: AIなし。空カードに直接入力（issue_mode に 'manual' 追加済）

### AI（`lib/ai.ts`）
- `analyzeToIssues()` が Claude(`claude-sonnet-4-6`) を tool use で呼び、構造化課題を返す
- プロンプト方針: **評論禁止**。他の経営者から引き出す「質問・依頼」形に。**回答者を属性で絞り込まない**（誰でも答えられる余白）。プロフィール（非公開含む）を文脈に利用。

### 課題の構造（`lib/issueOptions.ts`）
- `category`（`ISSUE_CATEGORIES`: 事業/マーケティング/営業/経営/組織/採用/財務/その他）
- `requestType`（**6種別**: 原因分析型/打ち手探索型/意思決定型/アイデア探索型/人脈紹介型/経営相談型。`REQUEST_TYPE_INFO` に定義・期待回答・例）
- `summary`（タイトル＝おせっ会で一目で分かる一文）／`detail`（背景・具体的に聞きたいこと/紹介依頼）
- ※`requestType` は文字列カラム。旧値（ヒアリング/依頼）が残っていても表示・編集可（編集画面で「旧・要変更」として選択肢に出す）

### 管理者側（`/admin/issues`）
- **提出単位（会社ごと）** と **課題単位（1件ずつ）** のタブ切替
- イベント/カテゴリ/会員（`?user=<id>`）で絞り込み
- チェックボックス＋全選択＋**「PDF化」**（選択提出を印刷ウィンドウでA4化→ブラウザでPDF保存）
- 会員管理の各行「経営課題」ボタンから `?user=` で該当会員の課題へ遷移

### 使い方ヘルプ
- `/help/issues`（7ステップ・スクショ入り。画像は `public/guide/2_issue-click.png`〜`6_issue-edit.png`）。`/help` からリンク。

---

## 8. おせっかい機能

### 種類（FB_TYPE_OPTIONS = intro / feedback / advice / other）
知人の紹介 / サービスの紹介 / ナレッジの共有 / その他

### 送信フォーム（`/events/[id]`「おせっかいを送る」）
- **種類ごとに入力項目が変化**（`FB_FIELDS`）。内容は `【ラベル】値` 形式で1本文に結合して保存:
  - 知人の紹介: 紹介したい企業の会社名* / 担当者名* / 紹介理由* / URL
  - サービスの紹介: 紹介したい会社（サービス）名* / 紹介理由* / URL
  - ナレッジの共有: お相手の課題* / ナレッジ内容* / 参考URL
  - その他: 自由入力
- **送信後は送り先を保持しフォームは開いたまま**（続けて送れる）
- 表示は `components/feedback/FeedbackContent.tsx`：**ラベルを【】強調・URLをリンク化**（一覧では長いURLを末尾…に短縮）。旧「ラベル：値」データも自動整形。

### コメント
- `/feedbacks/[id]` で投稿。投稿時に fromUser/toUser へ Resend メール通知（`lib/email.ts`、ゲスト投稿者は「匿名」）
- **ゲストはコメント不可**（UIは案内文＋API 403）

---

## 9. セキュリティ（今セッションで大幅強化）

### 認可の一元化: `lib/apiAuth.ts`
- `requireAuth({ roles? })` を**全APIルートで使用**。処理:
  1. セッション検証（NextAuthの暗号化JWE。exp/署名OK）
  2. **DBでユーザー実在＋isActive を確認** → 削除/無効化トークンを失効（401）
  3. `roles` 指定でスコープ判定（範囲外は403）
- `shouldHideUser()` / `anonymizeUser()` で**ゲスト向け氏名匿名化をサーバー側**で実施（feedbacks/events/comments の from/to）

### アクセスポリシー（要点）
- `GET /api/users`（会員一覧）= **管理者のみ**。`?me=1`（自分）は全ロール可
- `GET /api/users/[id]` = 会員1名の公開プロフィール（氏名クリックのポップアップ用。非公開対象は403）。一覧を配らずポップアップを維持する設計
- `GET /api/issues?scope=all` = 管理者のみ。会員は自分の提出のみ
- 作成系（おせっかい/コメント/経営課題/イベント作成）はロール制限。イベント系CRUDは管理者
- 詳細な権限表は Excel `API一覧` を参照（ユーザー保有）

### その他
- レスポンスヘッダ（`next.config.mjs`）: CSP / HSTS / X-Frame-Options(DENY) / X-Content-Type-Options / Referrer-Policy / Permissions-Policy
- セッション有効期限 **7日**（`lib/auth.ts`）
- 500エラーで**例外メッセージをクライアントに返さない**（汎用文言＋サーバーログ）
- SQLi/XSS面は小（Prisma・React・raw SQL/innerHTML/eval なし）

### 未対応（次の候補）
- APIレート制限（特に `POST /api/issues/analyze` のAIコスト）
- 監査ログ（ロール変更・削除の証跡）
- 入力スキーマ検証（zod等）・最大長
- RLS適用範囲（users/feedbacks等）と最小権限DBロール
- CSRFトークン（現状 SameSite=Lax が主防御）

---

## 10. 管理者ダッシュボード（`/admin`）

- 会員数（ロール別）、交流会数、おせっかい数、**経営課題登録数**
- **平均年商規模 / 平均従業員数 / 役職別割合 / 経営課題カテゴリ割合 / 企業年商別おせっかい数**
- **分析系6指標は運営スタッフ（姓: 木村・間宮・堤・眞嶋）とゲストを除外**して算出（`EXCLUDED_SURNAMES` + `isExcluded`）。会員数バナー等の合計は全員分。
- 年商レンジは代表値（万円）に変換して平均（`REVENUE_MID_MAN`）。※概算。

---

## 11. パフォーマンス（交流会で30-40人同時接続対策）

- 済: `GET /api/events/[id]` を `select` 明示にして重い列（issuePdfData等）を返さない／`feedbacks(eventId)` インデックス
- 次の候補: 送信後の全体再取得(reload)を楽観的更新に／DATABASE_URLを6543プーラーに／Vercel実行リージョンを東京(ap-northeast-1)に／レート制限

---

## 12. デザインテーマ

`tailwind.config.ts`: `brand.navy`(#0A2540)系 / `brand.sky`(#1E9CE6)系。ロゴ `public/osekkai-logo.png`（ログイン画面は白カード上に配置して視認性確保）。

---

## 13. プロジェクト構成（抜粋）

```
app/
├── admin/{page.tsx, members, events, issues}   # ダッシュボード/会員/交流会/経営課題(管理)
├── api/
│   ├── auth/[...nextauth]
│   ├── users/{route.ts, [id]/route.ts}         # GET一覧=admin, ?me=1=自分, [id]=公開プロフィール
│   ├── events/{route.ts, [id]/route.ts}
│   ├── feedbacks/{route, [id], [id]/comments, comments/[id]}
│   └── issues/{route.ts, [id]/route.ts, analyze/route.ts}
├── events/[id]                                  # 交流会詳細＋おせっかい送信
├── feedbacks/{page, [id]}                       # おせっかい一覧/詳細
├── issues/{page, new, [id]}                     # 経営課題 一覧/ウィザード/詳細編集
├── help/{page, issues}
├── mypage, onboarding, login, providers.tsx     # providersにSessionGuard
components/
├── auth/{LoginClient, ProfileGuard}
├── profile/ProfileFieldsForm.tsx                # マイページ/ウィザード共有
├── issues/{IssueCardsEditor, SubmissionPreview}
├── feedback/FeedbackContent.tsx                 # 【】強調＋URLリンク化
└── layout/Navbar.tsx
lib/{auth, apiAuth, ai, email, prisma, publicFields, profileOptions, issueOptions, industries, jobTitles}
prisma/{schema.prisma, migrations_manual/*.sql}
public/{osekkai-logo.png, guide/*.png}
```

（削除済: 旧 `/referral`・`/invite` ページ、`/api/referral` 系）

---

## 14. 直近コミット（参考）

`git log --oneline -30` を参照。今セッションの主な流れ:
経営課題機能の実装 → UX調整（種別/質問/ヒント/A4確認/スクロール等）→ recentRevenue非公開化・自己紹介2分割 → 会員管理(受/出・従業員数・売上規模・経営課題ボタン・CSV) → ロールバッジ削除・おせっかい項目構造化 → 【】表示・URLリンク → タブ復帰の入力保持 → セキュリティ(requireAuth・匿名化・強制ログアウト・課題単位タブ) → アクセスポリシー改定(users一覧admin限定・users/[id]追加・referral削除) → パフォーマンス(events select・index) → セキュリティヘッダ・例外サニタイズ・セッション7日・ログイン文言/ロゴ → ダッシュボード分析指標（スタッフ/ゲスト除外）。

---

## 15. 次のセッションへ / 進行中タスク

- **進行中の未完タスクは特になし**（依頼は一通り反映済み）。
- 着手時はまず「4. DBマイグレーション運用」を確認（未反映SQLがあれば先にSupabaseで実行）。
- セキュリティの中位項目（レート制限・監査ログ・入力検証・RLS）は未対応。必要になれば着手。

## 16. 連絡先
- 運営管理者アカウント / 送信元: `k.kimura@makotopia.com`
