'use server'
import { revalidatePath } from 'next/cache'
import { callApi } from './_internal'

export async function addPositionAction(data: unknown) {
  const created = await callApi<Record<string, unknown>>('/portfolio', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  revalidatePath('/portfolio')
  return created
}

export async function updatePositionAction(id: string, data: unknown) {
  const updated = await callApi<Record<string, unknown>>(`/portfolio/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  revalidatePath('/portfolio')
  return updated
}

export async function deletePositionAction(id: string) {
  await callApi(`/portfolio/${id}`, { method: 'DELETE' })
  revalidatePath('/portfolio')
}
