import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { analyzeToIssues } from '@/lib/ai'

// AI解析（保存はしない。レコメンドを返すだけ）
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'guest') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { mode, sourceText, qaAnswers } = await req.json()
  if (mode !== 'text' && mode !== 'qa')
    return NextResponse.json({ error: 'mode は text または qa' }, { status: 400 })

  if (mode === 'text' && (!sourceText || !String(sourceText).trim()))
    return NextResponse.json({ error: 'テキストを入力してください' }, { status: 400 })

  const qaPairs: { q: string; a: string }[] = Array.isArray(qaAnswers) ? qaAnswers : []
  if (mode === 'qa' && !qaPairs.some(x => x?.a && String(x.a).trim()))
    return NextResponse.json({ error: '質問に回答してください' }, { status: 400 })

  const profile = await prisma.user.findUnique({ where: { id: session.dbUserId } })
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  try {
    const issues = await analyzeToIssues({
      mode,
      profile: profile as unknown as Record<string, unknown>,
      sourceText,
      qaPairs,
    })
    return NextResponse.json({ issues })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI解析に失敗しました'
    console.error('[issues/analyze]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
