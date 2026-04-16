'use server'
import { callApi } from './_internal'

export async function performSearchAction(query: string) {
  return callApi<{
    searchId: string
    query: string
    summary: string
    webResults: unknown[]
    category?: string
  }>('/search', {
    method: 'POST',
    body: JSON.stringify({ query }),
  })
}

export async function triggerSearchAnalysisAction(searchId: string) {
  return callApi<{ queued: boolean; searchId: string }>(
    `/search/${searchId}/analyze`,
    { method: 'POST' },
  )
}
