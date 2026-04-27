import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Navbar } from '@/components/layout/Navbar'
import { ProfileGuard } from '@/components/auth/ProfileGuard'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'おせっ会 | OSEKKAI',
  description: '経営課題を持ち寄り、解決アクションが生まれる完全招待制コミュニティ「おせっ会」',
  icons: {
    icon: '/osekkai-logo.png',
    apple: '/osekkai-logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <Providers>
          <Navbar />
          <main className="min-h-screen bg-slate-950 text-white">
            <ProfileGuard>{children}</ProfileGuard>
          </main>
        </Providers>
      </body>
    </html>
  )
}
