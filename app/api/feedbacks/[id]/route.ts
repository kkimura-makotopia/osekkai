import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, anonymizeUser } from '@/lib/apiAuth'

const ALLOWED_TYPES = ['intro', 'advice', 'other', 'feedback'] as const
type AllowedType = (typeof ALLOWED_TYPES)[number]

const userSel = { id: true, fullName: true, name: true, company: true, image: true, role: true }

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const { user } = auth

  const fb = await prisma.feedback.findUnique({
    where: { id: params.id },
    include: {
      fromUser: { select: userSel },
      toUser: { select: userSel },
      event: { select: { id: true, title: true, heldAt: true } },
    },
  })
  if (!fb) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    ...fb,
    fromUser: anonymizeUser(user.role, user.id, fb.fromUser),
    toUser: anonymizeUser(user.role, user.id, fb.toUser),
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const { user } = auth

  try {
    const existing = await prisma.feedback.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.fromUserId !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    if (body.type !== undefined && !ALLOWED_TYPES.includes(body.type)) {
      return NextResponse.json({ error: '不正な種類です' }, { status: 400 })
    }
    if (body.content !== undefined && !String(body.content).trim()) {
      return NextResponse.json({ error: '内容は必須です' }, { status: 400 })
    }

    const updated = await prisma.feedback.update({
      where: { id: params.id },
      data: {
        ...(body.type !== undefined ? { type: body.type as AllowedType } : {}),
        ...(body.content !== undefined ? { content: String(body.content).trim() } : {}),
      },
      include: {
        fromUser: { select: userSel },
        toUser: { select: userSel },
      },
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('feedbacks PATCH failed', err)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const { user } = auth

  const existing = await prisma.feedback.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.fromUserId !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.feedback.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
