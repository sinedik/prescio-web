'use client'
import { useParams } from 'next/navigation'
import DotaMatchScreen from '@/screens/DotaMatchScreen'

export default function DotaMatchPage() {
  const params = useParams<{ matchId: string }>()
  return <DotaMatchScreen matchId={params.matchId} />
}
