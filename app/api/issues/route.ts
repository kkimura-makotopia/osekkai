import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const userSelect = {
  id: true, fullName: true, name: true, company: true, image: true, role: true,
  industry: true, employeeCount: true, foundingYear: true, recentRevenue: true,
}
const eventSelect = { id: true, title: true, heldAt: true }

function sanitizeIssues(raw: unknown) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(it => it && typeof it === 'object')
    .map((it: Record<string, unknown>, idx: number) => ({
      category: String(it.category ?? '').trim() || 'その他',
      requestType: it.requestType ? String(it.requestType).trim() : null,
      summary: String(it.summary ?? '').trim(),
      detail: it.detail ? String(it.detail).trim() : null,
      orderIndex: idx,
    }))
    .filter(it => it.summary)
}

// 一覧。?scope=all は管理者のみ全件。それ以外は自分の提出のみ。
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const all = searchParams.get('scope') === 'all' && session.role === 'admin'

  const submissions = await prisma.issueSubmission.findMany({
    where: all ? {} : { userId: session.dbUserId },
    include: {
      user: { select: userSelect },
      event: { select: eventSelect },
      issues: { orderBy: { orderIndex: 'asc' } },
    },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(submissions)
}

// 提出（1ユーザー×1イベントで upsert。再提出は上書き）
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'guest') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { eventId, mode, sourceText, qaAnswers, issues } = await req.json()
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  if (mode !== 'text' && mode !== 'qa') return NextResponse.json({ error: 'invalid mode' }, { status: 400 })

  const cleanIssues = sanitizeIssues(issues)
  if (cleanIssues.length === 0)
    return NextResponse.json({ error: '課題を1件以上入力してください' }, { status: 400 })

  const userId = session.dbUserId
  const data = {
    mode,
    sourceText: mode === 'text' ? (sourceText ?? null) : null,
    qaAnswers: mode === 'qa' ? (qaAnswers ?? null) : null,
  }

  const existing = await prisma.issueSubmission.findUnique({
    where: { userId_eventId: { userId, eventId } },
  })

  let submission
  if (existing) {
    await prisma.$transaction([
      prisma.managementIssue.deleteMany({ where: { submissionId: existing.id } }),
      prisma.issueSubmission.update({
        where: { id: existing.id },
        data: { ...data, issues: { create: cleanIssues } },
      }),
    ])
    submission = await prisma.issueSubmission.findUnique({
      where: { id: existing.id },
      include: { event: { select: eventSelect }, issues: { orderBy: { orderIndex: 'asc' } } },
    })
  } else {
    submission = await prisma.issueSubmission.create({
      data: { userId, eventId, ...data, issues: { create: cleanIssues } },
      include: { event: { select: eventSelect }, issues: { orderBy: { orderIndex: 'asc' } } },
    })
  }

  return NextResponse.json(submission, { status: 201 })
}
