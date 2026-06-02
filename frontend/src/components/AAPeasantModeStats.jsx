import React, { useState, useEffect, Suspense, lazy } from 'react'
import { getAAPeasantModeStats } from '../api'
import styles from './AAPeasantModeStats.module.css'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const TrendChart = lazy(() => import('./TrendChart'))

const CACHE_KEY = 'aa_peasant_mode_stats'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

const CYCLE_COLORS = { '0': '#8884d8', '1-2': '#82ca9d', '3-4': '#ffc658', '5-6': '#ff7c7c' }

const CycleTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div data-tag="true" style={{ background: '#ffffff', border: '1px solid #000000', borderRadius: 6, padding: '10px 14px' }}>
      <p data-tag="true" style={{ margin: '0 0 6px 0', color: '#000000', fontWeight: 600 }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} data-tag="true" style={{ margin: '2px 0', color: '#000000', fontWeight: 500 }}>
          <span data-tag="true" style={{ color: CYCLE_COLORS[entry.dataKey] || entry.color }}>{entry.name}</span>
          {': '}{entry.value?.toFixed(1)}%
        </p>
      ))}
    </div>
  )
}

const getCachedStats = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const { data, timestamp } = JSON.parse(cached)
    const isExpired = Date.now() - timestamp > CACHE_TTL

    if (isExpired) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }

    return data
  } catch (err) {
    console.error('Error reading cache:', err)
    return null
  }
}

const setCachedStats = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  } catch (err) {
    console.error('Error writing cache:', err)
  }
}

export default function AAPeasantModeStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isCached, setIsCached] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Try to load from cache first
        const cachedStats = getCachedStats()
        if (cachedStats) {
          setStats(cachedStats)
          setIsCached(true)
          setLoading(false)
          return
        }

        // Fetch from API if no cache
        const result = await getAAPeasantModeStats()
        setStats(result)
        setCachedStats(result)
        setIsCached(false)
      } catch (err) {
        console.error('Failed to fetch peasant mode stats:', err)
        setError(err.message || 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const handleRefresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getAAPeasantModeStats()
      setStats(result)
      setCachedStats(result)
      setIsCached(false)
    } catch (err) {
      console.error('Failed to refresh stats:', err)
      setError(err.message || 'Failed to refresh data')
    } finally {
      setLoading(false)
    }
  }

  // Transform data for TrendChart format
  const knightsCompletionLine = stats ? {
    id: 0,
    label: 'Knights Completion (%)',
    color: 'var(--accent)',
    data: stats.knights_completion.map(d => ({
      version: d.version,
      score: d.value,
      count: 0
    }))
  } : null

  const kingNormalCompletionLine = stats ? {
    id: 1,
    label: 'King Normal Completion (%)',
    color: 'var(--accent)',
    data: stats.king_normal_completion.map(d => ({
      version: d.version,
      score: d.value,
      count: 0
    }))
  } : null

  const avgCostLine = stats ? {
    id: 2,
    label: 'Avg Cost (King Normal)',
    color: 'var(--accent)',
    data: stats.avg_cost.map(d => ({
      version: d.version,
      score: d.value,
      count: 0
    }))
  } : null

  // Transform cycle distribution for stacked bar chart
  const cycleChartData = stats ? stats.cycle_distribution.map(d => ({
    version: d.version,
    '0': d['0'],
    '1-2': d['1-2'],
    '3-4': d['3-4'],
    '5-6': d['5-6']
  })) : []

  return (
    <div className={styles.container}>
      <div className={styles.description}>
        <div className={styles.descriptionHeader}>
          <div>
            <h3>👥 Peasant Mode Statistics</h3>
            <p>Time series analysis of normal players (those without floor 5 entries). Shows trends in completion rates, cycle distribution, and average cost for King in Check Normal mode.</p>
          </div>
          <div className={styles.cacheStatus}>
            {isCached && <span className={styles.cachedBadge} data-tag="true">📦 Cached</span>}
            <button onClick={handleRefresh} disabled={loading} className={styles.refreshButton}>
              {loading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {loading && <div className={styles.loading}>Loading peasant mode statistics...</div>}

      {!loading && stats && (
        <div className={styles.grid}>
          {/* Top-Left: Knights Completion */}
          <div className={styles.gridItem}>
            <h4>Knights Completion</h4>
            <p className={styles.chartDescription}>% of normal players with all 3 knight entries</p>
            <div className={styles.chartBox}>
              <Suspense fallback={<div>Loading chart...</div>}>
                <TrendChart lines={[knightsCompletionLine]} gameMode="anomalyArbitration" isPercentage={true} />
              </Suspense>
            </div>
          </div>

          {/* Top-Right: King Normal Completion */}
          <div className={styles.gridItem}>
            <h4>King Normal Completion</h4>
            <p className={styles.chartDescription}>% of knight-clearers who cleared King Normal</p>
            <div className={styles.chartBox}>
              <Suspense fallback={<div>Loading chart...</div>}>
                <TrendChart lines={[kingNormalCompletionLine]} gameMode="anomalyArbitration" isPercentage={true} />
              </Suspense>
            </div>
          </div>

          {/* Bottom-Left: Cycle Distribution Stacked Bar */}
          <div className={styles.gridItem}>
            <h4>Cycle Distribution</h4>
            <p className={styles.chartDescription}>Distribution of cycles used for King Normal (stacked %)</p>
            <div className={styles.chartBox}>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={cycleChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="version" padding={{ left: 20, right: 20 }} />
                  <YAxis />
                  <Tooltip content={<CycleTooltip />} />
                  <Legend />
                  <Bar dataKey="0" stackId="a" fill="#8884d8" name="0 cycles" />
                  <Bar dataKey="1-2" stackId="a" fill="#82ca9d" name="1-2 cycles" />
                  <Bar dataKey="3-4" stackId="a" fill="#ffc658" name="3-4 cycles" />
                  <Bar dataKey="5-6" stackId="a" fill="#ff7c7c" name="5-6 cycles" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom-Right: Average Cost */}
          <div className={styles.gridItem}>
            <h4>Average Cost</h4>
            <p className={styles.chartDescription}>Average team cost for King in Check Normal</p>
            <div className={styles.chartBox}>
              <Suspense fallback={<div>Loading chart...</div>}>
                <TrendChart lines={[avgCostLine]} gameMode="anomalyArbitration" />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
