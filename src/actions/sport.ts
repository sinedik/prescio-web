'use server'
import { callApi } from './_internal'

export async function syncSportDateAction(subcategory: string, date: string) {
  return callApi<{ ok: boolean; count: number }>('/sport/sync', {
    method: 'POST',
    body: JSON.stringify({ subcategory, date }),
  })
}
