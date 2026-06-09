import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// 既定送信元（独自ドメイン未設定でも Resend のサンドボックスで送れる）
const DEFAULT_FROM = process.env.EMAIL_FROM ?? 'おせっ会 <onboarding@resend.dev>'

const BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

interface CommentNotifyParams {
  to: string                       // 通知先メール
  recipientName: string            // 通知先の名前（呼び出し用）
  commenterName: string            // コメント投稿者の表示名（ゲストなら「匿名」）
  feedbackId: string
  feedbackExcerpt: string          // 元おせっかいの抜粋
  commentContent: string           // コメント本文
}

// HTML エスケープ
const esc = (s: string) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const buildHtml = (p: CommentNotifyParams) => {
  const url = `${BASE_URL}/feedbacks/${p.feedbackId}`
  return `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f5f7fa;font-family:'Helvetica Neue',Arial,sans-serif;color:#0A2540;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:24px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="background:#0A2540;padding:18px 24px;color:#fff;font-weight:bold;font-size:16px;">
          おせっ会
        </td></tr>
        <tr><td style="padding:24px;">
          <p style="font-size:15px;margin:0 0 16px;">${esc(p.recipientName)} 様</p>
          <p style="font-size:14px;line-height:1.7;margin:0 0 16px;">
            あなたに関連するおせっかいに、<strong>${esc(p.commenterName)}</strong> さんから新しいコメントがつきました。
          </p>

          <div style="background:#f7f9fc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin:0 0 12px;">
            <p style="margin:0 0 4px;font-size:11px;color:#64748b;">元のおせっかい</p>
            <p style="margin:0;font-size:13px;color:#0A2540;white-space:pre-wrap;">${esc(p.feedbackExcerpt)}</p>
          </div>

          <div style="background:#eff8ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin:0 0 20px;">
            <p style="margin:0 0 4px;font-size:11px;color:#1E9CE6;">新しいコメント</p>
            <p style="margin:0;font-size:13px;color:#0A2540;white-space:pre-wrap;">${esc(p.commentContent)}</p>
          </div>

          <p style="text-align:center;margin:24px 0 8px;">
            <a href="${url}" style="display:inline-block;background:#1E9CE6;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;font-size:14px;">
              コメントを見る
            </a>
          </p>
          <p style="text-align:center;margin:0;font-size:12px;color:#64748b;">
            ボタンが開けない場合: <a href="${url}" style="color:#1E9CE6;">${esc(url)}</a>
          </p>
        </td></tr>
        <tr><td style="padding:12px 24px;background:#f7f9fc;font-size:11px;color:#94a3b8;text-align:center;">
          このメールは おせっ会 から自動送信されています。
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim()
}

const buildText = (p: CommentNotifyParams) => {
  const url = `${BASE_URL}/feedbacks/${p.feedbackId}`
  return `${p.recipientName} 様

あなたに関連するおせっかいに、${p.commenterName} さんから新しいコメントがつきました。

【元のおせっかい】
${p.feedbackExcerpt}

【新しいコメント】
${p.commentContent}

▼ コメントを見る
${url}

---
このメールは おせっ会 から自動送信されています。`
}

export async function sendCommentNotification(p: CommentNotifyParams): Promise<{ ok: boolean; reason?: string }> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY 未設定のため送信をスキップ')
    return { ok: false, reason: 'no api key' }
  }
  if (!p.to) return { ok: false, reason: 'no recipient' }

  try {
    const result = await resend.emails.send({
      from: DEFAULT_FROM,
      to: p.to,
      subject: `[おせっ会] ${p.commenterName} さんからコメントがつきました`,
      html: buildHtml(p),
      text: buildText(p),
    })
    if ('error' in result && result.error) {
      console.error('[email] resend error', result.error)
      return { ok: false, reason: String(result.error) }
    }
    return { ok: true }
  } catch (err) {
    console.error('[email] exception', err)
    return { ok: false, reason: err instanceof Error ? err.message : String(err) }
  }
}
