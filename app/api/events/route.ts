import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // 一覧では重い issuePdfData を返さない
  const events = await prisma.communityEvent.findMany({
    select: {
      id: true, title: true, heldAt: true, location: true, description: true,
      issuePdfName: true, createdBy: true, createdAt: true, updatedAt: true,
      creator: { select: { id: true, fullName: true, name: true, company: true, image: true } },
      invitees: {
        include: { user: { select: { id: true, fullName: true, name: true, company: true, image: true } } },
      },
      _count: { select: { feedbacks: true } },
    },
    orderBy: { heldAt: 'desc' },
  })
  return NextResponse.json(events)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, heldAt, location, description, inviteeIds, issuePdfData, issuePdfName } = await req.json()
  if (!title || !heldAt) return NextResponse.json({ error: 'title and heldAt required' }, { status: 400 })

  const event = await prisma.communityEvent.create({
    data: {
      title,
      heldAt: new Date(heldAt),
      location,
      description,
      createdBy: session.dbUserId,
      ...(issuePdfData !== undefined ? { issuePdfData } : {}),
      ...(issuePdfName !== undefined ? { issuePdfName } : {}),
      ...(Array.isArray(inviteeIds) && inviteeIds.length > 0
        ? { invitees: { create: inviteeIds.map((userId: string) => ({ userId })) } }
        : {}),
    },
    select: {
      id: true, title: true, heldAt: true, location: true, description: true, issuePdfName: true,
      creator: { select: { id: true, fullName: true, name: true, company: true, image: true } },
      invitees: {
        include: { user: { select: { id: true, fullName: true, name: true, company: true, image: true } } },
      },
    },
  })
  return NextResponse.json(event, { status: 201 })
}
