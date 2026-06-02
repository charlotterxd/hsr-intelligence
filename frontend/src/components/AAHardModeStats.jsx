import React, { useState, Suspense, lazy } from 'react'
import { getAAHardModeStats, getAAPatches, getAAPassingRateTrend } from '../api'
import styles from './AAHardModeStats.module.css'

const TrendChart = lazy(() => import('./TrendChart'))

const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

const getCachedData = (key) => {
  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const { data, timestamp } = JSON.parse(cached)
    const isExpired = Date.now() - timestamp > CACHE_TTL

    if (isExpired) {
      localStorage.removeItem(key)
      return null
    }

    return data
  } catch (err) {
    console.error('Error reading cache:', err)
    return null
  }
}

const setCachedData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  } catch (err) {
    console.error('Error writing cache:', err)
  }
}

export default function AAHardModeStats({ characters = [] }) {
  const [patches, setPatches] = useState([])
  const [patch, setPatch] = useState('')
  const [stats, setStats] = useState(null)
  const [passingRateTrend, setPassingRateTrend] = useState([])
  const [loading, setLoading] = useState(false)
  const [trendLoading, setTrendLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isCached, setIsCached] = useState(false)

  // Fetch patches and passing rate trend
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch patches - try cache first
        let patchData = getCachedData('aa_patches')
        if (!patchData) {
          patchData = await getAAPatches()
          setCachedData('aa_patches', patchData)
        }
        setPatches(patchData)

        const latestPatch = patchData.length > 0 ? patchData[patchData.length - 1] : ''
        setPatch(latestPatch)

        // Fetch passing rate trend - try cache first
        setTrendLoading(true)
        let trendData = getCachedData('aa_passing_rate_trend')
        if (!trendData) {
          trendData = await getAAPassingRateTrend()
          setCachedData('aa_passing_rate_trend', trendData)
        }
        const trendLine = {
          id: 0,
          label: 'Hard Mode Passing Rate (%)',
          color: 'var(--accent)',
          data: trendData.map(d => ({
            version: d.version,
            score: d.passing_rate,
            count: 0
          }))
        }
        setPassingRateTrend([trendLine])
        setTrendLoading(false)

        // Auto-execute with latest patch - try cache first
        if (latestPatch) {
          setLoading(true)
          const cachedStats = getCachedData('aa_hard_mode_stats')
          if (cachedStats) {
            setStats(cachedStats)
            setIsCached(true)
            setLoading(false)
          } else {
            const result = await getAAHardModeStats(latestPatch)
            setStats(result)
            setCachedData('aa_hard_mode_stats', result)
            setIsCached(false)
            setLoading(false)
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err)
        setTrendLoading(false)
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleExecute = async () => {
    if (!patch) {
      setError('Please select a patch')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await getAAHardModeStats(patch)
      setStats(result)
      setCachedData('aa_hard_mode_stats', result)
      setIsCached(false)
    } catch (err) {
      setError(err.message || 'Failed to fetch hard mode stats')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    // Clear all caches
    localStorage.removeItem('aa_hard_mode_stats')
    localStorage.removeItem('aa_patches')
    localStorage.removeItem('aa_passing_rate_trend')
    setIsCached(false)
    setLoading(true)
    setTrendLoading(true)
    setError(null)

    try {
      // Refresh patches
      const patchData = await getAAPatches()
      setCachedData('aa_patches', patchData)
      setPatches(patchData)

      // Refresh trend
      const trendData = await getAAPassingRateTrend()
      setCachedData('aa_passing_rate_trend', trendData)
      const trendLine = {
        id: 0,
        label: 'Hard Mode Passing Rate (%)',
        color: 'var(--accent)',
        data: trendData.map(d => ({
          version: d.version,
          score: d.passing_rate,
          count: 0
        }))
      }
      setPassingRateTrend([trendLine])
      setTrendLoading(false)

      // Refresh stats
      const result = await getAAHardModeStats(patch || patchData[patchData.length - 1])
      setStats(result)
      setCachedData('aa_hard_mode_stats', result)
      setLoading(false)
    } catch (err) {
      setError(err.message || 'Failed to refresh stats')
      setLoading(false)
      setTrendLoading(false)
    }
  }

  const getImagePath = (characterId) => `/characters/${characterId}.png`

  return (
    <div className={styles.container}>
      <div className={styles.description}>
        <div className={styles.descriptionHeader}>
          <div>
            <h3>⚔️ Hard Mode Statistics</h3>
            <p>View hard mode passing rate trends and top 10 DPS characters by patch with their eidolon distribution, average cost, and sustain usage rate.</p>
          </div>
          <div className={styles.cacheStatus}>
            {isCached && <span className={styles.cachedBadge} data-tag="true">📦 Cached</span>}
            <button onClick={handleRefresh} disabled={loading} className={styles.refreshButton}>
              {loading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Passing Rate Trend Section - No Filters */}
      <div className={styles.trendSection}>
        <h4>Hard Mode Passing Rate Trend</h4>
        {trendLoading && <div className={styles.loading}>Loading trend data...</div>}
        {!trendLoading && passingRateTrend.length > 0 && (
          <div className={styles.chartBox}>
            <Suspense fallback={<div>Loading chart...</div>}>
              <TrendChart lines={passingRateTrend} gameMode="anomalyArbitration" isPercentage={true} />
            </Suspense>
          </div>
        )}
      </div>

      {/* Filter & DPS Section */}
      <div className={styles.dpsSection}>
        <h4>Top 10 DPS Characters by Patch</h4>

        <div className={styles.filterSection}>
          <div className={styles.patchRange}>
            <div className={styles.controlGroup}>
              <label>Patch</label>
              <select
                value={patch}
                onChange={(e) => setPatch(e.target.value)}
                className={styles.select}
              >
                <option value="">Select...</option>
                {patches.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <button onClick={handleExecute} disabled={loading} className={styles.button}>
              {loading ? 'Loading...' : 'Execute'}
            </button>
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        {stats && (
          <div className={styles.dpsResults}>
            <div className={styles.note}>
              <p><strong>Note:</strong> For teams with multiple DPS characters, we count the one with highest eidolons. Priority order: Castorice → Silver Wolf → Evanescia → Phainon → Others. Therefore: Evernight teams with Castorice are counted as Castorice. Sparxie teams with Silver Wolf or Evanescia are counted as those characters.</p>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Character</th>
                  <th>Eidolon</th>
                  <th>Avg Cost</th>
                  <th>Median Cost</th>
                  <th>Sustain Rate</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_dps.map((dps, idx) => {
                  const char = characters.find(c => c.name === dps.character)
                  return (
                    <tr key={idx}>
                      <td className={styles.characterCell}>
                        {char && (
                          <img
                            src={getImagePath(char.id)}
                            alt={dps.character}
                            className={styles.charImage}
                            onError={(e) => { e.target.style.display = 'none' }}
                          />
                        )}
                        <span>{dps.character}</span>
                      </td>
                      <td>{dps.eidolon_group}</td>
                      <td>{dps.avg_cost ? dps.avg_cost.toFixed(1) : '-'}</td>
                      <td>{dps.median_cost ? dps.median_cost.toFixed(1) : '-'}</td>
                      <td>{dps.sustain_usage_rate ? dps.sustain_usage_rate.toFixed(1) : '-'}%</td>
                      <td>{dps.percentage ? dps.percentage.toFixed(1) : '-'}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
