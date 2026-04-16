'use server'
import { revalidatePath } from 'next/cache'
import { callApi } from './_internal'

export async function updateInterestsAction(
  interests: { category: string; subcategory?: string }[],
) {
  await callApi<{ ok: boolean }>('/user/interests', {
    method: 'PUT',
    body: JSON.stringify({ interests }),
  })
  revalidatePath('/profile')
}
