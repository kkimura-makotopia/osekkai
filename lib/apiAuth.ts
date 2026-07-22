import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export interface AuthUser { id: string; role: string; email: string }

export const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
export const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 })

/**
 * APIの認証・認可を一元化する。
 * - セッション（署名付きJWT）を検証（期限切れ/改ざんは getServerSession が弾く）
 * - さらに DB でユーザーの実在と有効性(isActive)を確認し、
 *   削除・無効化されたユーザーのトークンをここで失効させる（強制ログアウト相当）
 * - roles を渡すとロール（scope）を判定し、範囲外は 403 を返す
 *
 * 使い方:
 *   const auth = await requireAuth({ roles: ['admin'] })
 *   if ('error' in auth) return auth.error
 *   const { user } = auth
 */
export async function requireAuth(
  opts?: { roles?: readonly string[] }
): Promise<{ user: AuthUser } | { error: NextResponse }> {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return { error: unauthorized() }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.dbUserId },
    select: { id: true, role: true, email: true, isActive: true },
  })
  // 実在しない or 無効化 → トークン失効
  if (!dbUser || !dbUser.isActive) return { error: unauthorized() }

  if (opts?.roles && !opts.roles.includes(dbUser.role)) return { error: forbidden() }

  return { user: { id: dbUser.id, role: dbUser.role, email: dbUser.email } }
}

// ── ゲスト匿名化（サーバー側でデータそのものを匿名化して返す） ──
type MaybeUser = {
  id: string
  fullName?: string | null
  name?: string | null
  company?: string | null
  image?: string | null
  role?: string | null
} | null | undefined

// 閲覧者から見て対象ユーザーを隠すべきか（自分は常に可視／閲覧者ゲスト or 対象ゲストは匿名）
export function shouldHideUser(viewerRole: string, viewerId: string, target: { id: string; role?: string | null }): boolean {
  if (target.id === viewerId) return false
  return viewerRole === 'guest' || target.role === 'guest'
}

// 隠すべき場合、氏名・会社名・画像などの識別情報を落として返す
export function anonymizeUser<T extends MaybeUser>(viewerRole: string, viewerId: string, u: T): T {
  if (!u) return u
  if (!shouldHideUser(viewerRole, viewerId, u)) return u
  return { ...u, fullName: '匿名', name: null, company: null, image: null } as T
}
