'use client'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useState } from 'react'

const guestLinks = [
  { href: '/events', label: '交流会' },
  { href: '/feedbacks', label: 'おせっかい一覧' },
]

const memberLinks = [
  { href: '/events', label: '交流会' },
  { href: '/feedbacks', label: 'おせっかい一覧' },
]

const adminLinks = [
  { href: '/admin', label: 'ダッシュボード' },
  { href: '/admin/members', label: '会員管理' },
  { href: '/admin/events', label: 'イベント管理' },
  { href: '/feedbacks', label: 'おせっかい一覧' },
]

const ROLE_LABELS: Record<string, { label: string; className: string }> = {
  admin: { label: '運営管理者', className: 'bg-amber-500 text-white' },
  member: { label: '正会員', className: 'bg-blue-500 text-white' },
  guest: { label: 'ゲスト', className: 'bg-slate-500 text-white' },
}

export function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const role = session?.role ?? 'guest'
  const isAdmin = role === 'admin'
  const links = isAdmin ? adminLinks : role === 'member' ? memberLinks : guestLinks
  const roleBadge = ROLE_LABELS[role] ?? ROLE_LABELS.guest

  // 最長一致でアクティブリンクを決定（/admin と /admin/events が同時アクティブになるのを防ぐ）
  const activeHref = [...links]
    .sort((a, b) => b.href.length - a.href.length)
    .find(l => pathname === l.href || pathname.startsWith(l.href + '/'))?.href

  if (!session) return null

  return (
    <nav className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/" className="text-white font-bold text-lg tracking-tight flex items-center gap-2">
          <Image
            src="/osekkai-logo.png"
            alt="おせっ会"
            width={32}
            height={32}
            className="rounded-lg"
            priority
          />
          <span className="hidden sm:inline">おせっ会</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeHref === link.href
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* User menu */}
        <div className="flex items-center gap-2">
          <span className={`hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium ${roleBadge.className}`}>{roleBadge.label}</span>
          {session.user?.image ? (
            <Image
              src={session.user.image}
              alt="avatar"
              width={32}
              height={32}
              className="rounded-full ring-2 ring-slate-600 cursor-pointer"
              onClick={() => setMenuOpen(!menuOpen)}
            />
          ) : (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold"
            >
              {(session.user?.name ?? 'U')[0]}
            </button>
          )}
          {menuOpen && (
            <div className="absolute top-14 right-4 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 w-44 z-50">
              <div className="px-3 py-2 border-b border-slate-700">
                <p className="text-white text-sm font-medium truncate">{session.user?.name}</p>
                <p className="text-slate-400 text-xs truncate">{session.user?.email}</p>
              </div>
              <Link
                href="/mypage"
                className="block px-3 py-2 text-sm text-slate-200 hover:text-white hover:bg-slate-700"
                onClick={() => setMenuOpen(false)}
              >
                マイページ
              </Link>
              {/* Mobile links */}
              <div className="md:hidden border-t border-slate-700">
                {links.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="border-t border-slate-700" />
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-700"
              >
                ログアウト
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
