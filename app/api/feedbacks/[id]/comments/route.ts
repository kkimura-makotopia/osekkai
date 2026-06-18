import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendCommentNotification } from '@/lib/email'

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
  if (session.role === 'guest') return NextResponse.json({ error: 'ゲストはコメントできません' }, { status: 403 })

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

    // コメント投稿者（通知本文の差出人として使う）
    const me = await prisma.user.findUnique({
      where: { id: session.dbUserId },
      select: { id: true, fullName: true, name: true, role: true },
    })

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

    // 通知メール（fromUser と toUser に。コメント投稿者本人は除外）
    const commenterName = me?.role === 'guest' ? '匿名' : (me?.fullName ?? me?.name ?? 'おせっ会メンバー')
    const excerpt = fb.content.length > 200 ? fb.content.slice(0, 200) + '…' : fb.content

    const notifyTargets = [fb.fromUser, fb.toUser]
      .filter(u => u.id !== session.dbUserId && !!u.email)
      // 同じユーザーへの重複通知を避ける
      .filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i)

    // メール送信は非同期で投げっぱなし（コメント作成自体は成功させる）
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
    const msg = err instanceof Error ? err.message : String(err)
    console.error('comment POST failed:', err)
    return NextResponse.json({ error: `投稿に失敗: ${msg}` }, { status: 500 })
  }
}
