export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🔗</div>
        <h1 className="text-white text-2xl font-bold mb-2">リンクが見つかりません</h1>
        <p className="text-slate-400">このリンクは無効または期限切れです。</p>
      </div>
    </div>
  )
}
