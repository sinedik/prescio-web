import { useState } from 'react'
import type { Position, PositionStatus } from '../types'
import { calcPositionPnl } from '../hooks/usePortfolio'
import { formatDate, daysUntil, platformColor } from '../utils'

interface Props {
  position: Position
  onUpdateStatus: (id: string, status: PositionStatus, closePrice?: number) => void
  onDelete: (id: string) => void
}

export default function PositionCard({ position: p, onUpdateStatus, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [closing, setClosing] = useState(false)
  const [closePrice, setClosePrice] = useState('')

  const { potentialWin, expectedValue, resolvedPnl } = calcPositionPnl(p)
  const days = p.resolutionDate ? daysUntil(p.resolutionDate) : null
  // Edge = fair_direction - entry_direction. For NO: fair_NO=100-myFairProb, entry_NO=100-entryPrice → edge = entryPrice - myFairProb
  const edge = p.direction === 'NO'
    ? p.entryPrice - p.myFairProb
    : p.myFairProb - p.entryPrice

  const isOpen = p.status === 'open'
  const isWon = p.status === 'won'
  const isLost = p.status === 'lost'

  function handleClose(status: PositionStatus) {
    const cp = parseFloat(closePrice)
    onUpdateStatus(p.id, status, !isNaN(cp) ? cp : undefined)
    setClosing(false)
  }

  return (
    <div
      className={`bg-bg-surface border rounded-lg overflow-hidden transition-all ${
        isWon ? 'border-accent/30' : isLost ? 'border-danger/30' : 'border-bg-border'
      }`}
    >
      {/* Status stripe */}
      <div
        className={`h-0.5 ${
          isWon ? 'bg-accent' : isLost ? 'bg-danger' : 'bg-text-muted'
        }`}
      />

      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${platformColor(p.platform)}`}>
                {p.platform}
              </span>

              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                p.direction === 'YES'
                  ? 'text-accent bg-accent/10'
                  : 'text-danger bg-danger/10'
              }`}>
                {p.direction}
              </span>

              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                isWon ? 'text-accent bg-accent/10' :
                isLost ? 'text-danger bg-danger/10' :
                'text-text-muted bg-bg-elevated'
              }`}>
                {p.status}
              </span>

              {p.topic && (
                <span className="text-[10px] font-mono text-text-muted">{p.topic}</span>
              )}
            </div>

            {/* Question */}
            <p
              className="text-sm text-text-primary leading-snug cursor-pointer transition-colors"
              onClick={() => setExpanded((v) => !v)}
            >
              {p.question}
            </p>
          </div>

          {/* PnL / amount block */}
          <div className="shrink-0 text-right">
            {resolvedPnl != null ? (
              <div>
                <p className={`text-lg font-mono font-bold ${resolvedPnl >= 0 ? 'text-accent' : 'text-danger'}`}>
                  {resolvedPnl >= 0 ? '+' : ''}${resolvedPnl.toFixed(0)}
                </p>
                <p className="text-[9px] font-mono text-text-muted">REALIZED</p>
              </div>
            ) : (
              <div>
                <p className="text-base font-mono font-bold text-text-primary">${p.amount}</p>
                <p className="text-[9px] font-mono text-text-muted">DEPLOYED</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 text-xs font-mono flex-wrap">
          <div>
            <span className="text-text-muted">ENTRY </span>
            <span className="text-text-secondary">{p.entryPrice}%</span>
          </div>
          <div>
            <span className="text-text-muted">FAIR </span>
            <span className="text-text-primary">{p.myFairProb}%</span>
          </div>
          <div>
            <span className="text-text-muted">EDGE </span>
            <span className={edge >= 5 ? 'text-accent' : edge >= 0 ? 'text-watch' : 'text-danger'}>
              {isFinite(edge) ? `${edge > 0 ? '+' : ''}${edge.toFixed(1)}pp` : '—'}
            </span>
          </div>
          <div className="hidden sm:block">
            <span className="text-text-muted">EV </span>
            <span className={expectedValue >= 0 ? 'text-accent' : 'text-danger'}>
              {isFinite(expectedValue) ? `${expectedValue >= 0 ? '+' : ''}$${expectedValue.toFixed(1)}` : '—'}
            </span>
          </div>
          {days !== null && isOpen && (
            <div className="hidden sm:block">
              <span className="text-text-muted">RESOLVES </span>
              <span className={days < 7 ? 'text-watch' : 'text-text-muted'}>
                {days > 0 ? `${days}d` : 'SOON'}
              </span>
            </div>
          )}
          {p.ai_edge_at_entry !== undefined && (
            <div className="hidden sm:block">
              <span className="text-text-muted">AI EDGE AT ENTRY </span>
              <span className={p.ai_edge_at_entry >= 5 ? 'text-accent' : p.ai_edge_at_entry >= 0 ? 'text-watch' : 'text-danger'}>
                {p.ai_edge_at_entry > 0 ? '+' : ''}{p.ai_edge_at_entry.toFixed(0)}pp
              </span>
            </div>
          )}
          {p.closedAt && (
            <div className="text-text-muted">{formatDate(p.closedAt)}</div>
          )}
        </div>

        {/* Expanded: thesis + actions */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-bg-border space-y-3 animate-fade-in">
            {p.thesis && (
              <p className="text-xs text-text-muted leading-relaxed">{p.thesis}</p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {p.url && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-accent border border-accent/20 px-2 py-1 rounded hover:bg-accent/10 transition-colors"
                >
                  VIEW MARKET &rarr;
                </a>
              )}

              {isOpen && !closing && (
                <>
                  <button
                    onClick={() => setClosing(true)}
                    className="text-[10px] font-mono text-accent border border-accent/20 px-2 py-1 rounded hover:bg-accent/10 transition-colors"
                  >
                    CLOSE WON
                  </button>
                  <button
                    onClick={() => handleClose('lost')}
                    className="text-[10px] font-mono text-danger border border-danger/20 px-2 py-1 rounded hover:bg-danger/10 transition-colors"
                  >
                    CLOSE LOST
                  </button>
                </>
              )}

              {isOpen && closing && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={closePrice}
                    onChange={(e) => setClosePrice(e.target.value)}
                    placeholder="Close price %"
                    className="w-32 bg-bg-elevated border border-bg-border rounded px-2 py-1 text-xs font-mono text-text-primary focus:outline-none focus:border-accent/40"
                  />
                  <button
                    onClick={() => handleClose('won')}
                    className="text-[10px] font-mono text-accent border border-accent/20 px-2 py-1 rounded hover:bg-accent/10 transition-colors"
                  >
                    WON
                  </button>
                  <button
                    onClick={() => setClosing(false)}
                    className="text-[10px] font-mono text-text-muted border border-bg-border px-2 py-1 rounded hover:text-text-primary transition-colors"
                  >
                    CANCEL
                  </button>
                </div>
              )}

              <button
                onClick={() => onDelete(p.id)}
                className="ml-auto text-[10px] font-mono text-text-muted hover:text-danger transition-colors"
              >
                DELETE
              </button>
            </div>
          </div>
        )}

        {/* Expand toggle */}
        {!expanded && (p.thesis || p.url || isOpen) && (
          <button
            onClick={() => setExpanded(true)}
            className="mt-2 text-[10px] font-mono text-text-muted hover:text-text-secondary transition-colors"
          >
            MORE &darr;
          </button>
        )}
      </div>
    </div>
  )
}
