'use server'
import { revalidatePath } from 'next/cache'
import { callApi } from './_internal'

export async function addToWatchlistAction(data: { type: 'event' | 'market'; id: string }) {
  await callApi('/watchlist', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  revalidatePath('/watchlist')
}

export async function removeFromWatchlistAction(id: string) {
  await callApi(`/watchlist/${id}`, { method: 'DELETE' })
  revalidatePath('/watchlist')
}
