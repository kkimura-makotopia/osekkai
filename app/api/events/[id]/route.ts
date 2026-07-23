import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, anonymizeUser } from '@/lib/apiAuth'

const userSel = { id: true, fullName: true, name: true, company: true, image: true, role: true }

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const { user } = auth

  // 必要な列だけを取得（issuePdfData/minutesText/aiSummary などの重い列は返さない）
  const event = await prisma.communityEvent.findUnique({
    where: { id: params.id },
    select: {
      id: true, title: true, heldAt: true, location: true, description: true, createdBy: true,
      creator: { select: { id: true, fullName: true, name: true, company: true, image: true } },
      invitees: { select: { user: { select: userSel } } },
      feedbacks: {
        select: {
          id: true, type: true, content: true, createdAt: true, eventId: true,
          fromUser: { select: userSel },
          toUser: { select: userSel },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // ゲスト匿名化（おせっかいの from/to、招待者）
  const result = {
    ...event,
    invitees: event.invitees.map(iv => ({ ...iv, user: anonymizeUser(user.role, user.id, iv.user) })),
    feedbacks: event.feedbacks.map(f => ({
      ...f,
      fromUser: anonymizeUser(user.role, user.id, f.fromUser),
      toUser: anonymizeUser(user.role, user.id, f.toUser),
    })),
  }
  return NextResponse.json(result)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth({ roles: ['admin'] })
  if ('error' in auth) return auth.error

  try {
    await prisma.communityEvent.delete({ where: { id: params.id } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('event DELETE failed:', err)
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth({ roles: ['admin'] })
  if ('error' in auth) return auth.error
  const body = await req.json()

  const updated = await prisma.$transaction(async tx => {
    if (Array.isArray(body.inviteeIds)) {
      await tx.eventInvitee.deleteMany({ where: { eventId: params.id } })
      if (body.inviteeIds.length > 0) {
        await tx.eventInvitee.createMany({
          data: body.inviteeIds.map((userId: string) => ({ eventId: params.id, userId })),
          skipDuplicates: true,
        })
      }
    }
    return tx.communityEvent.update({
      where: { id: params.id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.location !== undefined ? { location: body.location } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.heldAt ? { heldAt: new Date(body.heldAt) } : {}),
        ...(body.issuePdfData !== undefined ? { issuePdfData: body.issuePdfData } : {}),
        ...(body.issuePdfName !== undefined ? { issuePdfName: body.issuePdfName } : {}),
      },
    })
  })

  return NextResponse.json(updated)
}
