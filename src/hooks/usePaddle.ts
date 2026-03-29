import { useEffect, useState } from 'react'
import { initializePaddle, Paddle, CheckoutEventsData } from '@paddle/paddle-js'

const CLIENT_TOKEN   = import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string
const PRICE_ID_PRO   = import.meta.env.VITE_PADDLE_PRICE_ID as string
const PRICE_ID_ALPHA = import.meta.env.VITE_PADDLE_PRICE_ID_ALPHA as string
const IS_SANDBOX = CLIENT_TOKEN?.startsWith('test_') ?? true

let paddleInstance: Paddle | null = null
// Module-level callback — always points to the latest registered handler
let globalOnComplete: ((txId: string) => void) | undefined

function ensurePaddle(): Promise<Paddle | null> {
  if (paddleInstance) return Promise.resolve(paddleInstance)

  return initializePaddle({
    environment: IS_SANDBOX ? 'sandbox' : 'production',
    token: CLIENT_TOKEN,
    eventCallback(event) {
      if (event.name === 'checkout.completed') {
        const data = event.data as CheckoutEventsData | undefined
        const txId = data?.transaction_id
        console.log('[Paddle] checkout.completed, txId:', txId)
        if (txId) globalOnComplete?.(txId)
      }
    },
  }).then((p) => {
    paddleInstance = p ?? null
    return paddleInstance
  })
}

export function usePaddle(onComplete?: (transactionId: string) => void) {
  const [paddle, setPaddle] = useState<Paddle | null>(paddleInstance)

  // Always keep the global callback up to date with the latest prop
  globalOnComplete = onComplete

  useEffect(() => {
    if (!CLIENT_TOKEN || CLIENT_TOKEN.startsWith('test_REPLACE')) return
    ensurePaddle().then(setPaddle)

    return () => {
      // Don't clear globalOnComplete — another usePaddle instance may have set it
    }
  }, [])

  async function openCheckout(customerEmail?: string, plan: 'pro' | 'alpha' = 'pro') {
    const p = paddle ?? (await ensurePaddle())
    if (!p) throw new Error('Paddle not initialized')

    const priceId = plan === 'alpha' ? PRICE_ID_ALPHA : PRICE_ID_PRO
    p.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: customerEmail ? { email: customerEmail } : undefined,
    })
  }

  return { paddle, openCheckout }
}
