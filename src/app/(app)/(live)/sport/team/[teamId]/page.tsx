import TeamPage from '@/screens/TeamPage'

interface Props { params: Promise<{ teamId: string }> }

export default async function SportTeamPage({ params }: Props) {
  const { teamId } = await params
  const id = parseInt(teamId)
  if (isNaN(id)) return <div className="p-8 text-text-muted font-mono">Неверный ID команды</div>
  return <TeamPage teamId={id} />
}
