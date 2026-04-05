import LeaguePage from '@/screens/LeaguePage'

interface Props { params: Promise<{ id: string; leagueId: string }> }

export default async function SportLeaguePage({ params }: Props) {
  const { id, leagueId } = await params
  const lid = parseInt(leagueId)
  if (isNaN(lid)) return <div className="p-8 text-text-muted font-mono">Неверный ID лиги</div>
  return <LeaguePage leagueId={lid} sport={id} />
}
