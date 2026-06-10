import Anthropic from '@anthropic-ai/sdk'
import { ISSUE_CATEGORIES } from '@/lib/issueOptions'

// 使用モデル（変更する場合はこの1行のみ）
const MODEL = 'claude-sonnet-4-6'

export interface AiIssue {
  category: string
  hotTopic: string
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

const SYSTEM_PROMPT = `あなたは経験豊富な経営コンサルタントです。経営者が抱える「事業が停滞しているボトルネック（本質的な経営課題）」を発見することがあなたの役割です。

提供された経営者のプロフィール情報と、本人による記述（自由記述または質疑応答）をもとに、本質的な経営課題を2〜3件抽出してください。

抽出時の評価軸:
1. 表面的な症状ではなく、その背後にある「本質的な課題（真因）」を捉える
2. 解決した場合に売上・利益へ与える「インパクトの大きさ」を考慮し、インパクトの大きい課題を優先する
3. マーケティング・営業・組織・財務など多岐にわたる領域を横断的に検討する
4. 経営者本人が「言語化できていない可能性のある課題」も、根拠があれば積極的に指摘する

各課題は次の要素で構成してください:
- category: 課題カテゴリ（必ず指定された選択肢から選ぶ）
- hotTopic: その課題を一言で表す短いキャッチコピー（15文字程度）
- summary: 課題の概要（1〜2文、80文字程度）
- detail: 課題の詳細。なぜそれが本質的なのか、放置した場合のリスク、想定されるインパクトを具体的に記述（200〜400文字）

必ず日本語で、submit_issues ツールを使って構造化された形で回答してください。`

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
  description: '抽出した経営課題を2〜3件、構造化して返す',
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
            hotTopic: { type: 'string', description: '課題を一言で表すキャッチコピー' },
            summary: { type: 'string', description: '課題の概要（1〜2文）' },
            detail: { type: 'string', description: '課題の詳細（真因・リスク・インパクト）' },
          },
          required: ['category', 'hotTopic', 'summary', 'detail'],
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
    hotTopic: String(i.hotTopic ?? ''),
    summary: String(i.summary ?? ''),
    detail: String(i.detail ?? ''),
  }))
}
