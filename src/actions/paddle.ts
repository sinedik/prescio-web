'use server'
import { revalidatePath } from 'next/cache'
import { callApi } from './_internal'

export async function activateProAction(transactionId: string) {
  const result = await callApi<{ activated: boolean }>('/paddle/activate', {
    method: 'POST',
    body: JSON.stringify({ transactionId }),
  })
  revalidatePath('/profile')
  return result
}

export async function getPaddlePortalAction() {
  return callApi<{ url: string }>('/paddle/portal')
}
