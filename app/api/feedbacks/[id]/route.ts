import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ALLOWED_TYPES = ['intro', 'advice', 'other', 'feedback'] as const
type AllowedType = (typeof ALLOWED_TYPES)[number]

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const existing = await prisma.feedback.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.fromUserId !== session.dbUserId && session.role !== 'admin') {
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
        fromUser: { select: { id: true, fullName: true, name: true, company: true, image: true } },
        toUser: { select: { id: true, fullName: true, name: true, company: true, image: true } },
      },
    })
    return NextResponse.json(updated)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('feedbacks PATCH failed', err)
    return NextResponse.json({ error: `更新に失敗: ${msg}` }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.feedback.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.fromUserId !== session.dbUserId && session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.feedback.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
