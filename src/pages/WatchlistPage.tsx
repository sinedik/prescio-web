export default function WatchlistPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-lg font-mono font-bold text-text-primary tracking-wider">WATCHLIST</h1>
        <p className="text-xs font-mono text-text-muted mt-0.5">Markets you're tracking</p>
      </div>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-10 h-10 rounded-xl bg-bg-surface border border-bg-border flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 12l5 5L20 7" />
          </svg>
        </div>
        <p className="text-sm font-mono text-text-secondary mb-1">Coming soon</p>
        <p className="text-xs font-mono text-text-muted">Save markets you want to follow</p>
      </div>
    </div>
  )
}
