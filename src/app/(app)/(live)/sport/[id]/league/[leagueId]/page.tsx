import LeaguePage from '@/screens/LeaguePage'
import { fetchSportLeagueSSR } from '@/lib/serverData'

interface Props { params: Promise<{ id: string; leagueId: string }> }

export default async function SportLeaguePage({ params }: Props) {
  const { id, leagueId } = await params
  const lid = parseInt(leagueId)
  if (isNaN(lid)) return <div className="p-8 text-text-muted font-mono">Неверный ID лиги</div>
  const initialData = await fetchSportLeagueSSR(lid, id)
  return <LeaguePage leagueId={lid} sport={id} initialData={initialData ?? undefined} />
}
