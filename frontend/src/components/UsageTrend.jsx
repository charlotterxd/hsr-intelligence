import React, { useState } from 'react'
import { getUsageTrend } from '../api'
import UsageTrendFilterRow from './UsageTrendFilterRow'
import TrendChart from './TrendChart'
import styles from './UsageTrend.module.css'
import executePlsChibi from '../assets/chibi/execute_pls.webp'

const COLORS = ['var(--accent)', '#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCF7F']

const createLineConfig = (id, colorIndex) => ({
  id,
  lineName: `Usage Trend ${id + 1}`,
  lineColor: COLORS[colorIndex % COLORS.length],
  character: ''
})

export default function UsageTrend({ characters, gameMode = 'pureFiction', isDarkMode = false, chibiImage = null }) {
  const [lineConfigs, setLineConfigs] = useState([createLineConfig(0, 0)])
  const [allTrends, setAllTrends] = useState([])
  const [aaTrendsKnights, setAaTrendsKnights] = useState([])
  const [aaTrendsKingNormal, setAaTrendsKingNormal] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLineChange = (id, newConfig) => {
    setLineConfigs(lineConfigs.map(lc => lc.id === id ? newConfig : lc))
  }

  const handleRemoveLine = (id) => {
    if (lineConfigs.length > 1) {
      setLineConfigs(lineConfigs.filter(lc => lc.id !== id))
    }
  }

  const handleCopyLine = (id) => {
    if (lineConfigs.length < 5) {
      const sourceLine = lineConfigs.find(lc => lc.id === id)
      if (sourceLine) {
        const newId = Math.max(...lineConfigs.map(lc => lc.id), -1) + 1
        const newLine = {
          ...sourceLine,
          id: newId,
          lineName: `${sourceLine.lineName} (copy)`
        }
        const insertIndex = lineConfigs.findIndex(lc => lc.id === id) + 1
        setLineConfigs([...lineConfigs.slice(0, insertIndex), newLine, ...lineConfigs.slice(insertIndex)])
      }
    }
  }

  const handleAddLine = () => {
    if (lineConfigs.length < 5) {
      const newId = Math.max(...lineConfigs.map(lc => lc.id), -1) + 1
      setLineConfigs([...lineConfigs, createLineConfig(newId, lineConfigs.length)])
    }
  }

  const handleExecute = async () => {
    const filledLines = lineConfigs.filter(lc => lc.character)

    if (filledLines.length === 0) {
      setError('Please select at least one character')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (gameMode === 'anomalyArbitration') {
        const promises = filledLines.map(lc =>
          Promise.all([
            getUsageTrend(lc.character, gameMode, 'knights'),
            getUsageTrend(lc.character, gameMode, 'king_normal')
          ]).then(([knightsData, kingData]) => ({
            id: lc.id,
            label: lc.lineName,
            color: lc.lineColor,
            knightsData: knightsData || [],
            kingData: kingData || []
          }))
        )

        const results = await Promise.all(promises)
        setAaTrendsKnights(results.map(r => ({ id: r.id, label: r.label, color: r.color, data: r.knightsData })))
        setAaTrendsKingNormal(results.map(r => ({ id: r.id, label: r.label, color: r.color, data: r.kingData })))
      } else {
        const promises = filledLines.map(lc =>
          getUsageTrend(lc.character, gameMode).then(data => ({
            id: lc.id,
            label: lc.lineName,
            color: lc.lineColor,
            data: data || []
          }))
        )

        const results = await Promise.all(promises)
        setAllTrends(results)
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch usage trend')
    } finally {
      setLoading(false)
    }
  }

  const hasCharacters = lineConfigs.some(lc => lc.character)
  const canAddLine = lineConfigs.length < 5
  const hasResults = gameMode === 'anomalyArbitration' ? aaTrendsKnights.length > 0 : allTrends.length > 0

  return (
    <div>
      <div className={styles.description}>
        {chibiImage && <img src={chibiImage} alt="" className={styles.descriptionChibi} />}
        <div className={styles.descriptionBody}>
          <h3>👥 How to Use Usage Trend</h3>
          <p>Select a character to see what percentage of players used them each patch. Add multiple lines to compare how characters' popularity shifts over time.</p>
        </div>
      </div>

      <div className={styles.filterArea}>
        <div className={styles.filterRows}>
          {lineConfigs.map((lc) => (
            <UsageTrendFilterRow
              key={lc.id}
              lineId={lc.id}
              lineConfig={lc}
              onLineChange={(newConfig) => handleLineChange(lc.id, newConfig)}
              allCharacters={characters}
              onRemove={handleRemoveLine}
              onCopy={handleCopyLine}
              canRemove={lineConfigs.length > 1}
              canCopy={lineConfigs.length < 5}
              color={lc.lineColor}
            />
          ))}
        </div>

        <div className={styles.filterButtons}>
          <button
            onClick={handleAddLine}
            disabled={!canAddLine}
            className={styles.addLineButton}
          >
            + Add Line
          </button>
          <button
            onClick={handleExecute}
            disabled={!hasCharacters || loading}
            className={styles.executeButton}
          >
            {loading ? 'Loading...' : 'Execute'}
          </button>
        </div>
      </div>

      <div className={styles.chartArea}>
        {error && <div className={styles.error}>{error}</div>}
        {loading && <div className={styles.loading}>Loading usage trend...</div>}

        {!loading && !error && hasResults && gameMode === 'anomalyArbitration' && (
          <div className={styles.grid}>
            <div className={styles.chartBox}>
              <h3>Knights (Floors 1-3)</h3>
              <TrendChart lines={aaTrendsKnights} gameMode={gameMode} isPercentage={true} isDarkMode={isDarkMode} />
            </div>
            <div className={styles.chartBox}>
              <h3>King in Check (Normal)</h3>
              <TrendChart lines={aaTrendsKingNormal} gameMode={gameMode} isPercentage={true} isDarkMode={isDarkMode} />
            </div>
          </div>
        )}

        {!loading && !error && hasResults && gameMode !== 'anomalyArbitration' && (
          <div className={styles.chartWrapper}>
            <TrendChart lines={allTrends} gameMode={gameMode} isPercentage={true} isDarkMode={isDarkMode} />
          </div>
        )}

        {!loading && !error && !hasResults && hasCharacters && (
          <div className={styles.empty}>
            <img src={executePlsChibi} alt="" className={styles.executeChibi} />
            Click <strong>Execute</strong> to view usage trend
          </div>
        )}

        {!hasCharacters && !loading && (
          <div className={styles.empty}>
            <img src={executePlsChibi} alt="" className={styles.executeChibi} />
            Select a character above to get started
          </div>
        )}
      </div>
    </div>
  )
}
