import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const event = await prisma.communityEvent.findUnique({
    where: { id: params.id },
    include: {
      creator: { select: { id: true, fullName: true, name: true, company: true, image: true } },
      invitees: {
        include: { user: { select: { id: true, fullName: true, name: true, company: true, image: true } } },
      },
      feedbacks: {
        include: {
          fromUser: { select: { id: true, fullName: true, name: true, company: true, image: true } },
          toUser: { select: { id: true, fullName: true, name: true, company: true, image: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(event)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
