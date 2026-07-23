import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendCommentNotification } from '@/lib/email'
import { requireAuth, anonymizeUser } from '@/lib/apiAuth'

const userSel = { id: true, fullName: true, name: true, company: true, image: true, role: true }

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const { user } = auth

  const comments = await prisma.feedbackComment.findMany({
    where: { feedbackId: params.id },
    include: { user: { select: userSel } },
    orderBy: { createdAt: 'asc' },
  })
  const result = comments.map(c => ({ ...c, user: anonymizeUser(user.role, user.id, c.user) }))
  return NextResponse.json(result)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth({ roles: ['member', 'admin'] })
  if ('error' in auth) return auth.error
  const { user: me } = auth

  try {
    const { content } = await req.json()
    if (!content || !String(content).trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    // 元おせっかいと関連ユーザーを取得（通知用）
    const fb = await prisma.feedback.findUnique({
      where: { id: params.id },
      include: {
        fromUser: { select: { id: true, email: true, fullName: true, name: true } },
        toUser:   { select: { id: true, email: true, fullName: true, name: true } },
      },
    })
    if (!fb) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const meUser = await prisma.user.findUnique({
      where: { id: me.id },
      select: { id: true, fullName: true, name: true, role: true },
    })

    const created = await prisma.feedbackComment.create({
      data: { feedbackId: params.id, userId: me.id, content: String(content).trim() },
      include: { user: { select: userSel } },
    })

    const commenterName = meUser?.role === 'guest' ? '匿名' : (meUser?.fullName ?? meUser?.name ?? 'おせっ会メンバー')
    const excerpt = fb.content.length > 200 ? fb.content.slice(0, 200) + '…' : fb.content

    const notifyTargets = [fb.fromUser, fb.toUser]
      .filter(u => u.id !== me.id && !!u.email)
      .filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i)

    await Promise.allSettled(
      notifyTargets.map(u =>
        sendCommentNotification({
          to: u.email!,
          recipientName: u.fullName ?? u.name ?? 'おせっ会メンバー',
          commenterName,
          feedbackId: params.id,
          feedbackExcerpt: excerpt,
          commentContent: String(content).trim(),
        })
      )
    )

    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    console.error('comment POST failed:', err)
    return NextResponse.json({ error: '投稿に失敗しました' }, { status: 500 })
  }
}
