import PlayerPage from '@/screens/PlayerPage'
import { fetchSportPlayerSSR } from '@/lib/serverData'

interface Props { params: Promise<{ playerId: string }> }

export default async function SportPlayerPage({ params }: Props) {
  const { playerId } = await params
  const id = parseInt(playerId)
  if (isNaN(id)) return <div className="p-8 text-text-muted font-mono">Неверный ID игрока</div>
  const initialData = await fetchSportPlayerSSR(id)
  return <PlayerPage playerId={id} initialData={initialData ?? undefined} />
}
