import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('eventId')
  const userId = searchParams.get('userId')
  const feedbacks = await prisma.feedback.findMany({
    where: {
      ...(eventId ? { eventId } : {}),
      ...(userId ? { OR: [{ fromUserId: userId }, { toUserId: userId }] } : {}),
    },
    include: {
      fromUser: { select: { id: true, fullName: true, name: true, company: true, image: true } },
      toUser: { select: { id: true, fullName: true, name: true, company: true, image: true } },
      event: { select: { id: true, title: true, heldAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(feedbacks)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { toUserId, eventId, type, content } = await req.json()
  if (!toUserId || !type || !content)
    return NextResponse.json({ error: 'toUserId, type, content required' }, { status: 400 })
  const feedback = await prisma.feedback.create({
    data: { fromUserId: session.dbUserId, toUserId, eventId: eventId ?? null, type, content },
    include: {
      fromUser: { select: { id: true, fullName: true, name: true, company: true, image: true } },
      toUser: { select: { id: true, fullName: true, name: true, company: true, image: true } },
    },
  })
  return NextResponse.json(feedback, { status: 201 })
}
