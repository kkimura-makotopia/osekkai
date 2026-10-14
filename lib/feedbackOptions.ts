// おせっかい（フィードバック）の種類・入力項目の共有定義
export const FB_TYPE_OPTIONS = ['intro', 'feedback', 'advice', 'other'] as const
export type FbType = (typeof FB_TYPE_OPTIONS)[number]

export const FB_LABELS: Record<string, string> = {
  intro: '知人の紹介',
  feedback: 'サービスの紹介',
  advice: 'ナレッジの共有',
  other: 'その他',
}

export const FB_COLORS: Record<string, string> = {
  intro: 'bg-blue-500/20 text-blue-400',
  feedback: 'bg-emerald-500/20 text-emerald-400',
  advice: 'bg-purple-500/20 text-purple-400',
  other: 'bg-slate-500/20 text-slate-300',
}

export interface FbField { key: string; label: string; textarea?: boolean; required?: boolean; placeholder?: string }

// 種類ごとの入力項目（いずれも冒頭は「お相手の課題」。url は任意）
export const FB_FIELDS: Record<string, FbField[]> = {
  intro: [
    { key: 'problem', label: 'お相手の課題', textarea: true, required: true, placeholder: '相手が抱えている課題' },
    { key: 'company', label: '紹介したい企業の会社名', required: true, placeholder: '例：株式会社XX' },
    { key: 'name', label: '紹介したい企業に所属する担当者名', required: true, placeholder: '例：おせっかい 太郎' },
    { key: 'reason', label: '紹介理由', textarea: true, required: true, placeholder: 'なぜこの方を紹介したいか' },
  ],
  feedback: [
    { key: 'problem', label: 'お相手の課題', textarea: true, required: true, placeholder: '相手が抱えている課題' },
    { key: 'service', label: '紹介したい会社（サービス）名', required: true, placeholder: '例：株式会社XX（サービス名）' },
    { key: 'reason', label: '紹介理由', textarea: true, required: true, placeholder: 'なぜこのサービスを紹介したいか' },
    { key: 'url', label: 'URL', placeholder: 'https://...' },
  ],
  advice: [
    { key: 'problem', label: 'お相手の課題', textarea: true, required: true, placeholder: '相手が抱えている課題' },
    { key: 'knowledge', label: 'ナレッジ内容', textarea: true, required: true, placeholder: '共有したい知見・ノウハウ' },
    { key: 'url', label: '参考URL', placeholder: 'https://...' },
  ],
  other: [
    { key: 'problem', label: 'お相手の課題', textarea: true, required: true, placeholder: '相手が抱えている課題' },
    { key: 'content', label: '内容', textarea: true, required: true, placeholder: '協業提案やコミュニティ・交流会のお誘い等' },
  ],
}

// 入力内容を 1 本の content 文字列に組み立て（【ラベル】値 を改行連結）
export const buildFeedbackContent = (type: string, fields: Record<string, string>) =>
  (FB_FIELDS[type] ?? [])
    .map(d => ({ label: d.label, val: (fields[d.key] ?? '').trim() }))
    .filter(x => x.val)
    .map(x => `【${x.label}】${x.val}`)
    .join('\n')

// URL 以外の項目がすべて埋まっているか
export const allFeedbackFieldsFilled = (type: string, fields: Record<string, string>) =>
  (FB_FIELDS[type] ?? []).filter(f => f.key !== 'url').every(f => (fields[f.key] ?? '').trim() !== '')
