'use client'
import type { SportEvent, SportPrediction } from '../../types/index'
import { useLang } from '../../contexts/LanguageContext'
import { useT, type Lang } from '../../lib/i18n'

type FormResult = 'W' | 'D' | 'L'
interface FormEntry { result: FormResult; home: string; away: string; score: string; date: string }

interface Props {
  event: SportEvent
  prediction: SportPrediction | null
  homeForm: FormEntry[] | null
  awayForm: FormEntry[] | null
}

const FORM_COLOR: Record<FormResult, string> = {
  W: 'rgb(var(--accent))',
  D: 'rgb(var(--text-muted))',
  L: 'rgb(var(--danger))',
}

function parsePct(s: string | undefined): number {
  return parseFloat(String(s ?? '0').replace('%', '')) || 0
}

function FormStrip({ items }: { items: FormEntry[] | null }) {
  if (!items || items.length === 0) {
    return <span className="text-[11px] font-mono text-text-muted">—</span>
  }
  return (
    <div className="flex gap-[3px]">
      {items.slice(0, 5).reverse().map((f, i) => (
        <div
          key={`${f.date}-${i}`}
          title={`${f.home} ${f.score} ${f.away}`}
          style={{
            width: 12,
            height: 12,
            borderRadius: 2,
            background: FORM_COLOR[f.result],
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  )
}

function MetricRow({ label, home, away, highlight }: {
  label: string
  home: string
  away: string
  highlight?: 'home' | 'away' | null
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span
        className={`text-[13px] font-mono tabular-nums min-w-[52px] text-left ${
          highlight === 'home' ? 'text-accent font-bold' : 'text-text-secondary'
        }`}
      >
        {home}
      </span>
      <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted flex-1 text-center truncate">
        {label}
      </span>
      <span
        className={`text-[13px] font-mono tabular-nums min-w-[52px] text-right ${
          highlight === 'away' ? 'text-accent font-bold' : 'text-text-secondary'
        }`}
      >
        {away}
      </span>
    </div>
  )
}

function higherWins(h: string, a: string): 'home' | 'away' | null {
  const hv = parsePct(h)
  const av = parsePct(a)
  if (hv === av) return null
  return hv > av ? 'home' : 'away'
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col rounded-lg"
      style={{
        background: 'rgb(var(--bg-surface))',
        border: '1px solid rgb(var(--bg-border))',
        padding: 14,
      }}
    >
      <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-text-muted mb-2">
        {title}
      </h3>
      {children}
    </div>
  )
}

export default function SportMatchContextGrid({ event, prediction, homeForm, awayForm }: Props) {
  const { lang } = useLang()
  const tr = useT(lang)

  const hasForm = (homeForm?.length ?? 0) > 0 || (awayForm?.length ?? 0) > 0
  const h2h = prediction?.h2h ?? null
  const cmp = prediction?.comparison ?? null

  // If literally nothing to show, hide the whole grid.
  if (!hasForm && !h2h && !cmp) return null

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
      {/* Left column: Form + H2H */}
      <div className="flex flex-col gap-3">
        {hasForm && (
          <Panel title={tr('match_detail.ctx.form')}>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-mono text-text-secondary truncate mr-2">
                  {event.home_team}
                </span>
                <FormStrip items={homeForm} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-mono text-text-secondary truncate mr-2">
                  {event.away_team}
                </span>
                <FormStrip items={awayForm} />
              </div>
            </div>
          </Panel>
        )}

        {h2h && h2h.length > 0 && (
          <Panel title={tr('match_detail.ctx.h2h')}>
            <div className="flex flex-col gap-1">
              {h2h.slice(0, 5).map((m) => {
                const hg = m.goals.home
                const ag = m.goals.away
                const score = hg != null && ag != null ? `${hg} : ${ag}` : '—'
                const date = new Date(m.fixture.date).toLocaleDateString(
                  lang === 'ru' ? 'ru-RU' : 'en-US',
                  { day: '2-digit', month: 'short', year: '2-digit' },
                )
                return (
                  <div
                    key={m.fixture.id}
                    className="flex items-center gap-2 text-[11px] font-mono"
                  >
                    <span className="text-text-muted shrink-0 tabular-nums" style={{ minWidth: 64 }}>
                      {date}
                    </span>
                    <span className="flex-1 truncate text-text-secondary">
                      {m.teams.home.name} · {m.teams.away.name}
                    </span>
                    <span className="text-text-primary tabular-nums shrink-0">{score}</span>
                  </div>
                )
              })}
            </div>
          </Panel>
        )}
      </div>

      {/* Right column: Key metrics */}
      {cmp && (
        <Panel title={tr('match_detail.ctx.metrics')}>
          <MetricRow label={tr('match_detail.ctx.m_form')}
            home={cmp.form.home} away={cmp.form.away}
            highlight={higherWins(cmp.form.home, cmp.form.away)} />
          <MetricRow label={tr('match_detail.ctx.m_att')}
            home={cmp.att.home} away={cmp.att.away}
            highlight={higherWins(cmp.att.home, cmp.att.away)} />
          <MetricRow label={tr('match_detail.ctx.m_def')}
            home={cmp.def.home} away={cmp.def.away}
            highlight={higherWins(cmp.def.home, cmp.def.away)} />
          <MetricRow label={tr('match_detail.ctx.m_h2h')}
            home={cmp.h2h.home} away={cmp.h2h.away}
            highlight={higherWins(cmp.h2h.home, cmp.h2h.away)} />
          <MetricRow label={tr('match_detail.ctx.m_goals')}
            home={cmp.goals.home} away={cmp.goals.away}
            highlight={higherWins(cmp.goals.home, cmp.goals.away)} />
          <MetricRow label={tr('match_detail.ctx.m_total')}
            home={cmp.total.home} away={cmp.total.away}
            highlight={higherWins(cmp.total.home, cmp.total.away)} />
        </Panel>
      )}
    </section>
  )
}

export type { FormEntry, FormResult }
