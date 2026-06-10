import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const userSelect = { id: true, fullName: true, name: true, company: true, image: true, role: true }
const eventSelect = { id: true, title: true, heldAt: true }

function sanitizeIssues(raw: unknown) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(it => it && typeof it === 'object')
    .map((it: Record<string, unknown>, idx: number) => ({
      category: String(it.category ?? '').trim() || 'その他',
      hotTopic: it.hotTopic ? String(it.hotTopic).trim() : null,
      summary: String(it.summary ?? '').trim(),
      detail: it.detail ? String(it.detail).trim() : null,
      orderIndex: idx,
    }))
    .filter(it => it.summary)
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const submission = await prisma.issueSubmission.findUnique({
    where: { id: params.id },
    include: {
      user: { select: userSelect },
      event: { select: eventSelect },
      issues: { orderBy: { orderIndex: 'asc' } },
    },
  })
  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (submission.userId !== session.dbUserId && session.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json(submission)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const submission = await prisma.issueSubmission.findUnique({ where: { id: params.id } })
  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (submission.userId !== session.dbUserId && session.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { issues } = await req.json()
  const cleanIssues = sanitizeIssues(issues)
  if (cleanIssues.length === 0)
    return NextResponse.json({ error: '課題を1件以上入力してください' }, { status: 400 })

  await prisma.$transaction([
    prisma.managementIssue.deleteMany({ where: { submissionId: submission.id } }),
    prisma.issueSubmission.update({
      where: { id: submission.id },
      data: { issues: { create: cleanIssues } },
    }),
  ])

  const updated = await prisma.issueSubmission.findUnique({
    where: { id: submission.id },
    include: {
      user: { select: userSelect },
      event: { select: eventSelect },
      issues: { orderBy: { orderIndex: 'asc' } },
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const submission = await prisma.issueSubmission.findUnique({ where: { id: params.id } })
  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (submission.userId !== session.dbUserId && session.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.issueSubmission.delete({ where: { id: submission.id } })
  return NextResponse.json({ ok: true })
}
