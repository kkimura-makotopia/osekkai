import Anthropic from '@anthropic-ai/sdk'
import { ISSUE_CATEGORIES, REQUEST_TYPES } from '@/lib/issueOptions'

// 使用モデル（変更する場合はこの1行のみ）
const MODEL = 'claude-sonnet-4-6'

export interface AiIssue {
  category: string
  requestType: string
  summary: string
  detail: string
}

export interface AnalyzeParams {
  mode: 'text' | 'qa'
  profile: Record<string, unknown>
  sourceText?: string
  qaPairs?: { q: string; a: string }[]
}

// プロフィールを読みやすいテキストに整形（空欄は省略）
const PROFILE_LABELS: Record<string, string> = {
  fullName: '氏名',
  company: '会社名',
  jobTitle: '役職',
  industry: '業界',
  employeeCount: '従業員数',
  foundingYear: '設立年',
  fullTimeEmployees: '正社員数',
  branchCount: '拠点数',
  fiscalMonth: '決算月',
  recentRevenue: '直近確定期の売上',
  targetRevenueScale: 'メイン商材のターゲット売上規模',
  operatingMargin: '営業利益率',
  serviceUnitPrice: 'サービス平均単価',
  customerCount: '顧客数',
  revenueGrowth: '3年前からの売上成長率',
  revenueTarget3y: '3年後の売上目標',
  bio: '自己紹介・事業内容',
}

function buildProfileContext(profile: Record<string, unknown>): string {
  const lines: string[] = []
  for (const [key, label] of Object.entries(PROFILE_LABELS)) {
    const v = profile[key]
    if (v === null || v === undefined || v === '') continue
    lines.push(`- ${label}: ${v}`)
  }
  // マーケチャネル
  const channels = profile.marketingChannels
  if (Array.isArray(channels) && channels.length) {
    lines.push(`- 利用中のマーケティングチャネル: ${channels.join(' / ')}`)
  }
  // 売上構成比
  const breakdown = profile.serviceBreakdown
  if (Array.isArray(breakdown) && breakdown.length) {
    const parts = (breakdown as { name?: string; percentage?: number }[])
      .filter(b => b && b.name)
      .map(b => `${b.name} ${b.percentage ?? 0}%`)
    if (parts.length) lines.push(`- 売上構成比: ${parts.join(' / ')}`)
  }
  return lines.length ? lines.join('\n') : '（プロフィール情報の入力なし）'
}

const SYSTEM_PROMPT = `あなたは経営者コミュニティのファシリテーターで、経営者へのヒアリングの達人です。

このコミュニティでは、経営者が自社の課題を定例会で「発表」し、参加している他の経営者から【具体的なアドバイス・成功事例・Tips】や【人脈・企業・サービスの紹介】を獲得します。

あなたの役割は、提供された経営者のプロフィールと本人の記述（自由記述または質疑応答）をもとに、本人が事業を前に進めるうえで本質的だと思われるボトルネックを見極め、それを「他の経営者に持っていく相談項目」に変換することです。

【最重要】評論・分析・指摘は絶対にしないでください。「〜が課題である」「〜が真因だ」といった解説口調は禁止です。代わりに、本人が他の経営者に投げかける【質問】や、紹介してほしい相手を頼む【お願い】の形にしてください。

各相談項目は次の2種類のいずれかです:
- ヒアリング: 他の経営者の知見・成功事例・Tips・やり方を教えてもらう相談
- 依頼: 特定の人・企業・サービスを紹介してもらう、または繋がりたいというお願い

各項目の構成:
- category: 課題カテゴリ（指定の選択肢から選ぶ）
- requestType: 「ヒアリング」か「依頼」
- summary: コミュニティで発表する見出しの一文。必ず質問・依頼の形にする。
  （良い例:「歩留まり分析などデータドリブンに施策決定することでの成功事例を知りたい」「3名以上の社労士事務所と繋がりが多いアライアンスパートナーを発見したい」「ストック型のビジネスモデルを構築するにあたり既存顧客へのクロスセルはどのように行っていますか？」）
- detail: 背景の説明（現状の具体的な数字・取り組み・これまで試したことをプロフィール情報も活かして記述）と、「具体的に何を聞きたいか／どんな相手を紹介してほしいか」を明確に書く。1〜3文。

スタイルのルール:
- 一文目から本人が一人称で語っているような自然な相談文にする（「〜したいです」「〜をお聞きしたいです」「〜と繋がりたいです」など）
- 抽象論・一般論を避け、本人の実際の状況（数字・チャネル・規模など）に即して具体的にする
- 解決策をこちらで断定しない。あくまで他の経営者から引き出すための問いかけにする
- 【特に重要】回答できる人を限定しないこと。「〜な経験のある方に」「同規模から急成長された経営者の方に」「同じ業界・単価帯でスケールさせた方に」のように、回答者を特定の属性で絞り込む書き方は禁止。その属性に当てはまらない経営者でも、自社・他社・知人の成功事例やアドバイス、紹介ができるよう「余白のある」聞き方にする。
  - 悪い例: 「IT・ソフトウェア領域で複数事業を持ちながらスケールさせた経験のある方に、リソース配分の判断軸や意思決定のタイミングについてお聞きしたいです。」
  - 良い例: 「自社や他社・知人の成功事例や、リソース配分の判断軸・意思決定のタイミングをお聞きしたいです。」
- 背景（現状の数字・状況）は具体的に書いてよいが、「聞きたいこと」の部分は誰でも答えられる開かれた問いにする。

参考にすべき良い見出しのトーン:
- 【マーケティング課題】【ヒアリング】歩留まり分析などデータドリブンに施策決定することでの成功事例を知りたい
- 【経営課題】【ヒアリング】代理店数が増え管理工数が大きくなってきているので代理店管理のTipsを知りたい
- 【採用課題】【依頼】営業人材を紹介してくれるエージェントを知りたい
- 【事業課題】【依頼】共催セミナーを実施できる企業を紹介してほしい

必ず日本語で、2〜3件、submit_issues ツールで回答してください。`

function buildUserMessage(p: AnalyzeParams): string {
  const profileBlock = buildProfileContext(p.profile)
  let inputBlock = ''
  if (p.mode === 'text') {
    inputBlock = `## 経営者による現状の記述\n${p.sourceText ?? ''}`
  } else {
    const qa = (p.qaPairs ?? [])
      .filter(x => x.a && x.a.trim())
      .map((x, i) => `Q${i + 1}. ${x.q}\nA${i + 1}. ${x.a}`)
      .join('\n\n')
    inputBlock = `## 質疑応答\n${qa}`
  }
  return `## 経営者のプロフィール\n${profileBlock}\n\n${inputBlock}\n\n上記をもとに、本質的な経営課題を2〜3件抽出してください。`
}

const issueTool: Anthropic.Tool = {
  name: 'submit_issues',
  description: 'コミュニティで発表する相談項目を2〜3件、構造化して返す',
  input_schema: {
    type: 'object',
    properties: {
      issues: {
        type: 'array',
        minItems: 2,
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: [...ISSUE_CATEGORIES],
              description: '課題カテゴリ',
            },
            requestType: {
              type: 'string',
              enum: [...REQUEST_TYPES],
              description: 'ヒアリング（知見を聞く）か 依頼（紹介してもらう）',
            },
            summary: { type: 'string', description: 'コミュニティで発表する見出しの一文（質問・依頼の形）' },
            detail: { type: 'string', description: '背景と、具体的に聞きたいこと／紹介してほしいこと' },
          },
          required: ['category', 'requestType', 'summary', 'detail'],
        },
      },
    },
    required: ['issues'],
  },
}

export async function analyzeToIssues(p: AnalyzeParams): Promise<AiIssue[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY が設定されていません。環境変数を設定してください。')
  }

  const client = new Anthropic({ apiKey })
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    tools: [issueTool],
    tool_choice: { type: 'tool', name: 'submit_issues' },
    messages: [{ role: 'user', content: buildUserMessage(p) }],
  })

  const toolUse = msg.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
  )
  if (!toolUse) throw new Error('AIから有効な応答が得られませんでした。')

  const input = toolUse.input as { issues?: AiIssue[] }
  const issues = Array.isArray(input.issues) ? input.issues : []
  if (!issues.length) throw new Error('AIが課題を抽出できませんでした。入力内容を見直してください。')

  return issues.map(i => ({
    category: String(i.category ?? 'その他'),
    requestType: String(i.requestType ?? 'ヒアリング'),
    summary: String(i.summary ?? ''),
    detail: String(i.detail ?? ''),
  }))
}
