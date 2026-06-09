import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const comments = await prisma.feedbackComment.findMany({
    where: { feedbackId: params.id },
    include: {
      user: { select: { id: true, fullName: true, name: true, company: true, image: true, role: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(comments)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { content } = await req.json()
    if (!content || !String(content).trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }
    // 元おせっかいの存在チェック
    const fb = await prisma.feedback.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!fb) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const created = await prisma.feedbackComment.create({
      data: {
        feedbackId: params.id,
        userId: session.dbUserId,
        content: String(content).trim(),
      },
      include: {
        user: { select: { id: true, fullName: true, name: true, company: true, image: true, role: true } },
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('comment POST failed:', err)
    return NextResponse.json({ error: `投稿に失敗: ${msg}` }, { status: 500 })
  }
}
