import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'

// 初期管理者（ログイン時に admin へ自動昇格）
const BOOTSTRAP_ADMIN_EMAILS = ['k.kimura@makotopia.com']

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: ['openid', 'email', 'profile'].join(' '),
          access_type: 'offline',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at

        const email = (profile as { email?: string }).email ?? ''
        const name = (profile as { name?: string }).name ?? null
        const image = (profile as { picture?: string }).picture ?? null
        const googleId = account.providerAccountId

        const isBootstrapAdmin = BOOTSTRAP_ADMIN_EMAILS.includes(email.toLowerCase())
        const dbUser = await prisma.user.upsert({
          where: { email },
          update: {
            name,
            image,
            googleId,
            ...(isBootstrapAdmin ? { role: 'admin' as const } : {}),
          },
          create: {
            email,
            name,
            fullName: name,
            image,
            googleId,
            role: isBootstrapAdmin ? 'admin' : 'guest',
          },
        })

        token.dbUserId = dbUser.id
        token.role = dbUser.role
      }

      const now = Math.floor(Date.now() / 1000)
      const expiresAt = token.expiresAt as number | undefined
      if (expiresAt && now < expiresAt - 60) return token

      if (!token.refreshToken) return { ...token, error: 'RefreshTokenMissing' }

      try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: token.refreshToken as string,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw data
        return {
          ...token,
          accessToken: data.access_token,
          expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in as number),
          refreshToken: data.refresh_token ?? token.refreshToken,
        }
      } catch (e) {
        console.error('トークンリフレッシュ失敗', e)
        return { ...token, error: 'RefreshAccessTokenError' }
      }
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined
      session.error = token.error as string | undefined
      session.dbUserId = token.dbUserId as string | undefined
      session.role = token.role as string | undefined
      return session
    },
  },
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
}
