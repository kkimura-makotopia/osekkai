import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, anonymizeUser } from '@/lib/apiAuth'

const userSel = { id: true, fullName: true, name: true, company: true, image: true, role: true }

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const { user } = auth

  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('eventId')
  const userId = searchParams.get('userId')
  const feedbacks = await prisma.feedback.findMany({
    where: {
      ...(eventId ? { eventId } : {}),
      ...(userId ? { OR: [{ fromUserId: userId }, { toUserId: userId }] } : {}),
    },
    include: {
      fromUser: { select: userSel },
      toUser: { select: userSel },
      event: { select: { id: true, title: true, heldAt: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // ゲスト匿名化（サーバー側で識別情報を落とす）
  const result = feedbacks.map(f => ({
    ...f,
    fromUser: anonymizeUser(user.role, user.id, f.fromUser),
    toUser: anonymizeUser(user.role, user.id, f.toUser),
  }))
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth({ roles: ['member', 'admin'] })
  if ('error' in auth) return auth.error
  const { user } = auth

  const { toUserId, eventId, type, content } = await req.json()
  if (!toUserId || !type || !content)
    return NextResponse.json({ error: 'toUserId, type, content required' }, { status: 400 })
  const feedback = await prisma.feedback.create({
    data: { fromUserId: user.id, toUserId, eventId: eventId ?? null, type, content },
    include: {
      fromUser: { select: userSel },
      toUser: { select: userSel },
    },
  })
  return NextResponse.json(feedback, { status: 201 })
}
