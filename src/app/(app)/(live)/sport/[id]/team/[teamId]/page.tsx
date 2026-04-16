import TeamPage from '@/screens/TeamPage'
import { fetchSportTeamSSR } from '@/lib/serverData'

interface Props { params: Promise<{ id: string; teamId: string }> }

export default async function SportTeamPage({ params }: Props) {
  const { teamId } = await params
  const id = parseInt(teamId)
  if (isNaN(id)) return <div className="p-8 text-text-muted font-mono">Неверный ID команды</div>
  const ssr = await fetchSportTeamSSR(id)
  const initialData = ssr
    ? {
        team: ssr.team ?? null,
        standing: ssr.standings?.[0] ?? null,
        injuries: ssr.injuries ?? [],
        squad: ssr.squad ?? [],
        fixtures: [],
      }
    : undefined
  return <TeamPage teamId={id} initialData={initialData} />
}
