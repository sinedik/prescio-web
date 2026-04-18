import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-[10px] font-mono text-text-muted tracking-widest mb-3">404</p>
        <h1 className="text-xl font-mono font-bold text-text-primary mb-2">Page not found</h1>
        <p className="text-sm font-mono text-text-muted mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="py-2 px-4 bg-accent text-bg-base text-xs font-mono font-bold rounded hover:bg-accent/90 transition-colors"
          >
            Home
          </Link>
          <Link
            href="/sport"
            className="py-2 px-4 border border-bg-border text-text-secondary text-xs font-mono font-bold rounded hover:border-text-muted transition-colors"
          >
            Sport
          </Link>
        </div>
      </div>
    </div>
  )
}
