'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase/client'
import { mfaApi } from '../lib/api'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface Props {
  onClose: () => void
  onEnrolled: () => void
}

type Step = 'loading' | 'scan' | 'verify' | 'recovery' | 'done'

export default function TwoFactorModal({ onClose, onEnrolled }: Props) {
  const { lang } = useLang()
  const tr = useT(lang)
  const trapRef = useFocusTrap<HTMLDivElement>(onClose)
  const [step, setStep] = useState<Step>('loading')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrSvg, setQrSvg] = useState<string>('')
  const [secret, setSecret] = useState<string>('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: list } = await supabase.auth.mfa.listFactors()
        const stale = list?.totp?.find((f) => f.status !== 'verified')
        if (stale) await supabase.auth.mfa.unenroll({ factorId: stale.id })
        const { data, error: enErr } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
        if (enErr || !data) throw enErr || new Error('enroll failed')
        if (cancelled) return
        setFactorId(data.id)
        setQrSvg(data.totp.qr_code)
        setSecret(data.totp.secret)
        setStep('scan')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to start enrollment')
        setStep('scan')
      }
    })()
    return () => { cancelled = true }
  }, [])

  async function handleVerify() {
    if (!factorId || code.length !== 6) return
    setError(null)
    setBusy(true)
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId })
      if (chErr || !ch) throw chErr || new Error('challenge failed')
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: ch.id,
        code: code.trim(),
      })
      if (vErr) throw vErr
      try {
        const { codes } = await mfaApi.generateRecoveryCodes()
        setRecoveryCodes(codes)
        setStep('recovery')
      } catch {
        setStep('done')
      }
      onEnrolled()
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('mfa.invalid_code'))
    } finally {
      setBusy(false)
    }
  }

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* */ }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgb(0 0 0 / 0.6)' }}
      onClick={onClose}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-xl p-6 bg-bg-surface border border-bg-border"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-mono font-bold text-text-primary mb-4">
          {tr('mfa.modal_title')}
        </h2>

        {step === 'loading' && (
          <p className="text-xs font-mono text-text-muted animate-pulse">{tr('profile.loading')}</p>
        )}

        {(step === 'scan' || step === 'verify') && qrSvg && (
          <>
            <p className="text-[11px] font-mono text-text-muted mb-3">{tr('mfa.scan_qr')}</p>
            <div
              className="bg-white rounded p-3 mb-3 flex justify-center"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <div className="mb-4">
              <p className="text-[10px] font-mono text-text-muted tracking-wider mb-1">{tr('mfa.secret')}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] font-mono text-text-secondary bg-bg-elevated border border-bg-border rounded px-2 py-1.5 break-all">
                  {secret}
                </code>
                <button
                  onClick={copySecret}
                  className="text-[11px] font-mono text-accent border border-accent/30 px-2 py-1.5 rounded hover:bg-accent/5 transition-colors"
                >
                  {copied ? tr('mfa.copied') : tr('mfa.copy')}
                </button>
              </div>
            </div>

            <p className="text-[11px] font-mono text-text-muted mb-2">{tr('mfa.enter_code')}</p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="w-full bg-bg-elevated border border-bg-border rounded px-3 py-2 text-lg font-mono tracking-widest text-center text-text-primary focus:outline-none focus:border-accent/40 transition-colors mb-3"
            />

            {error && <p className="text-[11px] font-mono text-danger mb-3">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={busy}
                className="flex-1 py-2 text-xs font-mono text-text-muted border border-bg-border rounded hover:text-text-primary transition-colors disabled:opacity-50"
              >
                {lang === 'ru' ? 'Отмена' : 'Cancel'}
              </button>
              <button
                onClick={handleVerify}
                disabled={busy || code.length !== 6}
                className="flex-1 py-2 bg-accent text-bg-base text-xs font-mono font-bold rounded hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {busy ? tr('profile.loading') : tr('mfa.verify')}
              </button>
            </div>
          </>
        )}

        {step === 'recovery' && (
          <>
            <p className="text-sm font-mono text-accent mb-2">{tr('mfa.enabled_ok')}</p>
            <p className="text-[11px] font-mono text-text-muted mb-3">
              {lang === 'ru'
                ? 'Сохраните эти коды в надёжном месте. Каждый работает один раз и позволит войти, если вы потеряете устройство. Они больше не будут показаны.'
                : 'Save these codes somewhere safe. Each works once and lets you sign in if you lose your device. They will not be shown again.'}
            </p>
            <div className="grid grid-cols-2 gap-2 bg-bg-elevated border border-bg-border rounded p-3 mb-3">
              {recoveryCodes.map((c) => (
                <code key={c} className="text-[12px] font-mono text-text-primary tracking-wider">{c}</code>
              ))}
            </div>
            <div className="flex gap-2 mb-3">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(recoveryCodes.join('\n'))
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  } catch { /* */ }
                }}
                className="flex-1 py-2 text-xs font-mono text-accent border border-accent/30 rounded hover:bg-accent/5 transition-colors"
              >
                {copied ? tr('mfa.copied') : tr('mfa.copy')}
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([recoveryCodes.join('\n') + '\n'], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'prescio-recovery-codes.txt'
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="flex-1 py-2 text-xs font-mono text-text-secondary border border-bg-border rounded hover:border-text-muted transition-colors"
              >
                {lang === 'ru' ? 'Скачать .txt' : 'Download .txt'}
              </button>
            </div>
            <button
              onClick={() => setStep('done')}
              className="w-full py-2.5 bg-accent text-bg-base text-sm font-mono font-bold rounded hover:bg-accent/90 transition-colors"
            >
              {lang === 'ru' ? 'Я сохранил коды' : 'I saved the codes'}
            </button>
          </>
        )}

        {step === 'done' && (
          <>
            <p className="text-sm font-mono text-accent mb-6">{tr('mfa.enabled_ok')}</p>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-accent text-bg-base text-sm font-mono font-bold rounded hover:bg-accent/90 transition-colors"
            >
              OK
            </button>
          </>
        )}
      </div>
    </div>
  )
}
