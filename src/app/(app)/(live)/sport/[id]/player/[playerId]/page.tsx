import PlayerPage from '@/screens/PlayerPage'

interface Props { params: Promise<{ id: string; playerId: string }> }

export default async function SportPlayerPage({ params }: Props) {
  const { playerId } = await params
  const id = parseInt(playerId)
  if (isNaN(id)) return <div className="p-8 text-text-muted font-mono">Неверный ID игрока</div>
  return <PlayerPage playerId={id} />
}
