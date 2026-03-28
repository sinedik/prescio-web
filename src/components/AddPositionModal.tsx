import { useState, useEffect } from 'react'
import type { Position, PositionDirection } from '../types'
import { calcKelly } from '../hooks/usePortfolio'

interface Prefill {
  question?: string
  platform?: string
  entryPrice?: number
  myFairProb?: number
  direction?: PositionDirection
  url?: string
  resolutionDate?: string
  thesis?: string
}

interface Props {
  onAdd: (p: Omit<Position, 'id' | 'createdAt' | 'status'>) => void
  onClose: () => void
  prefill?: Prefill
}

const PLATFORMS = ['Polymarket', 'Kalshi', 'Metaculus', 'Manifold', 'Other']

export default function AddPositionModal({ onAdd, onClose, prefill }: Props) {
  const [question, setQuestion] = useState(prefill?.question ?? '')
  const [platform, setPlatform] = useState(prefill?.platform ?? 'Polymarket')
  const [topic, setTopic] = useState('')
  const [direction, setDirection] = useState<PositionDirection>(prefill?.direction ?? 'YES')
  const [entryPrice, setEntryPrice] = useState(prefill?.entryPrice?.toString() ?? '')
  const [myFairProb, setMyFairProb] = useState(prefill?.myFairProb?.toString() ?? '')
  const [amount, setAmount] = useState('')
  const [thesis, setThesis] = useState(prefill?.thesis ?? '')
  const [url, setUrl] = useState(prefill?.url ?? '')
  const [resolutionDate, setResolutionDate] = useState(prefill?.resolutionDate?.slice(0, 10) ?? '')

  const entryNum = parseFloat(entryPrice)
  const fairNum = parseFloat(myFairProb)
  const kelly = !isNaN(entryNum) && !isNaN(fairNum) && entryNum > 0 && entryNum < 100
    ? calcKelly(fairNum, entryNum, direction)
    : null

  const amountNum = parseFloat(amount)
  // potentialWin depends on direction: YES pays (100-entry)/entry, NO pays entry/(100-entry)
  const potentialWin = kelly && !isNaN(amountNum) && amountNum > 0 && entryNum > 0 && entryNum < 100
    ? direction === 'NO'
      ? (amountNum * entryNum / (100 - entryNum)).toFixed(2)
      : (amountNum * (100 - entryNum) / entryNum).toFixed(2)
    : null

  const isValid = question.trim() && entryNum > 0 && entryNum < 100 && amountNum > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    onAdd({
      question: question.trim(),
      platform,
      topic: topic.trim(),
      direction,
      entryPrice: entryNum,
      myFairProb: isNaN(fairNum) ? entryNum : fairNum,
      amount: amountNum,
      thesis: thesis.trim(),
      url: url.trim() || undefined,
      resolutionDate: resolutionDate || undefined,
    })
    onClose()
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-bg-surface border border-bg-border rounded-xl shadow-2xl animate-slide-up overflow-y-auto max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border">
          <h2 className="text-sm font-mono font-bold text-text-primary tracking-widest">ADD POSITION</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Question */}
          <div>
            <label className="block text-[10px] font-mono text-text-muted mb-1.5 tracking-wider">MARKET QUESTION *</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Will X happen by Y date?"
              rows={2}
              className="w-full bg-bg-elevated border border-bg-border rounded px-3 py-2 text-sm font-sans
                text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40
                resize-none transition-colors"
            />
          </div>

          {/* Platform + Direction */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-text-muted mb-1.5 tracking-wider">PLATFORM</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-bg-elevated border border-bg-border rounded px-3 py-2 text-sm font-mono
                  text-text-primary focus:outline-none focus:border-accent/40 transition-colors"
              >
                {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-text-muted mb-1.5 tracking-wider">DIRECTION</label>
              <div className="flex gap-2">
                {(['YES', 'NO'] as PositionDirection[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDirection(d)}
                    className={`flex-1 py-2 text-xs font-mono font-bold rounded transition-colors ${
                      direction === d
                        ? d === 'YES'
                          ? 'bg-accent/15 border border-accent/40 text-accent'
                          : 'bg-danger/15 border border-danger/40 text-danger'
                        : 'bg-bg-elevated border border-bg-border text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Entry price + Fair prob */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-text-muted mb-1.5 tracking-wider">ENTRY PRICE % *</label>
              <div className="relative">
                <input
                  type="number"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  placeholder="e.g. 42"
                  min={1} max={99} step={0.1}
                  className="w-full bg-bg-elevated border border-bg-border rounded px-3 py-2 pr-7 text-sm font-mono
                    text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted font-mono">%</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-text-muted mb-1.5 tracking-wider">MY FAIR PROB %</label>
              <div className="relative">
                <input
                  type="number"
                  value={myFairProb}
                  onChange={(e) => setMyFairProb(e.target.value)}
                  placeholder="e.g. 58"
                  min={1} max={99} step={0.1}
                  className="w-full bg-bg-elevated border border-bg-border rounded px-3 py-2 pr-7 text-sm font-mono
                    text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted font-mono">%</span>
              </div>
            </div>
          </div>

          {/* Kelly readout */}
          {kelly && (
            <div className={`rounded-lg p-3 border ${
              kelly.edge > 0
                ? 'bg-accent/5 border-accent/20'
                : 'bg-danger/5 border-danger/20'
            }`}>
              <p className="text-[10px] font-mono text-text-muted mb-2 tracking-wider">KELLY CALCULATOR</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[9px] font-mono text-text-muted">EDGE</p>
                  <p className={`text-base font-mono font-bold ${kelly.edge > 0 ? 'text-accent' : 'text-danger'}`}>
                    {kelly.edge > 0 ? '+' : ''}{kelly.edge.toFixed(1)}pp
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-text-muted">FULL KELLY</p>
                  <p className="text-base font-mono font-bold text-text-primary">{kelly.kellyFull.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-text-muted">HALF KELLY</p>
                  <p className="text-base font-mono font-bold text-watch">{kelly.kellyHalf.toFixed(1)}%</p>
                </div>
              </div>
              {kelly.edge <= 0 && (
                <p className="text-[10px] font-mono text-danger mt-2">No edge — consider skipping</p>
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-[10px] font-mono text-text-muted mb-1.5 tracking-wider">AMOUNT $ *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted font-mono">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                min={0.01} step={0.01}
                className="w-full bg-bg-elevated border border-bg-border rounded pl-7 pr-3 py-2 text-sm font-mono
                  text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 transition-colors"
              />
            </div>
            {potentialWin && (
              <p className="text-[10px] font-mono text-accent mt-1">
                Potential win: +${potentialWin}
              </p>
            )}
          </div>

          {/* Topic + Resolution */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-text-muted mb-1.5 tracking-wider">TOPIC</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="iran, crypto, election..."
                className="w-full bg-bg-elevated border border-bg-border rounded px-3 py-2 text-sm font-mono
                  text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-text-muted mb-1.5 tracking-wider">RESOLUTION DATE</label>
              <input
                type="date"
                value={resolutionDate}
                onChange={(e) => setResolutionDate(e.target.value)}
                className="w-full bg-bg-elevated border border-bg-border rounded px-3 py-2 text-sm font-mono
                  text-text-primary focus:outline-none focus:border-accent/40 transition-colors"
              />
            </div>
          </div>

          {/* Thesis */}
          <div>
            <label className="block text-[10px] font-mono text-text-muted mb-1.5 tracking-wider">THESIS</label>
            <textarea
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              placeholder="Why do you have edge here?"
              rows={2}
              className="w-full bg-bg-elevated border border-bg-border rounded px-3 py-2 text-sm font-sans
                text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40
                resize-none transition-colors"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-[10px] font-mono text-text-muted mb-1.5 tracking-wider">MARKET URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://polymarket.com/..."
              className="w-full bg-bg-elevated border border-bg-border rounded px-3 py-2 text-sm font-mono
                text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-mono font-bold text-text-secondary border border-bg-border
                rounded hover:border-text-muted hover:text-text-primary transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="flex-1 py-2.5 text-xs font-mono font-bold bg-accent/15 border border-accent/40
                text-accent rounded hover:bg-accent/25 transition-colors
                disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ADD POSITION
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
