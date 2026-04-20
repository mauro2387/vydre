import { format, subMonths } from 'date-fns'
import { getMonthlyStats, getMonthlyTrend, getHeatmapData, getPendingPayments } from '@/lib/actions/stats'
import { getReceiptStats } from '@/lib/actions/receipts'
import { StatsClient } from './stats-client'

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const params = await searchParams
  const currentMonth = params.mes ?? format(new Date(), 'yyyy-MM')
  const previousMonth = format(subMonths(new Date(), 1), 'yyyy-MM')

  const [stats, prevStats, trend, heatmap, pendingPayments, receiptStats] = await Promise.all([
    getMonthlyStats(currentMonth),
    getMonthlyStats(previousMonth),
    getMonthlyTrend(6),
    getHeatmapData(),
    getPendingPayments(),
    getReceiptStats(),
  ])

  return (
    <StatsClient
      stats={stats}
      prevStats={prevStats}
      trend={trend}
      heatmap={heatmap}
      pendingPayments={pendingPayments}
      currentMonth={currentMonth}
      receiptStats={receiptStats}
    />
  )
}
