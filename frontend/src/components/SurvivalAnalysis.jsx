import React, { useState, Suspense } from 'react'
import { getSurvivalAnalysis } from '../api'
import SurvivalFilterRow from './SurvivalFilterRow'
import SurvivalChart from './SurvivalChart'
import styles from './SurvivalAnalysis.module.css'
import executePlsChibi from '../assets/chibi/execute_pls.webp'

const COLORS = ['var(--accent)', '#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCF7F']

const createLineConfig = (id, colorIndex) => ({
  id,
  lineName: `Survival Analysis ${id + 1}`,
  lineColor: COLORS[colorIndex % COLORS.length],
  character: '',
  eidolon: 0,
  signature_lc_mode: 'both',
  sustain_filter: 'Both',
  aggregation: 'median'
})

export default function SurvivalAnalysis({ characters, gameMode = 'pureFiction', isDarkMode = false, chibiImage = null }) {
  const [lineConfigs, setLineConfigs] = useState([createLineConfig(0, 0)])
  const [allAnalyses, setAllAnalyses] = useState([])
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
      setError('Please complete at least one analysis (select a character)')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const promises = filledLines.map(lc =>
        getSurvivalAnalysis({
          character: lc.character,
          eidolon: lc.eidolon,
          signature_lc_mode: lc.signature_lc_mode,
          sustain_filter: lc.sustain_filter,
          aggregation: lc.aggregation
        }, gameMode).then(data => ({
          id: lc.id,
          label: lc.lineName,
          color: lc.lineColor,
          data: data || []
        }))
      )

      const results = await Promise.all(promises)
      setAllAnalyses(results)
    } catch (err) {
      setError(err.message || 'Failed to fetch survival analysis')
    } finally {
      setLoading(false)
    }
  }

  const hasFilledAnalysis = lineConfigs.some(lc => lc.character)
  const canAddLine = lineConfigs.length < 5

  return (
    <div>
      <div className={styles.description}>
        {chibiImage && <img src={chibiImage} alt="" className={styles.descriptionChibi} />}
        <div className={styles.descriptionBody}>
          <h3>⏰ How to Use Survival Analysis</h3>
          <p>Select a character and customize filters (eidolon level, signature weapon, sustain requirements) to track their performance over time. The X-axis shows patches since release, allowing you to see how a character's viability evolves. Compare multiple characters to identify power creep trends.</p>
        </div>
      </div>
      <div className={styles.filterArea}>
        <div className={styles.filterRows}>
          {lineConfigs.map((lc) => (
            <SurvivalFilterRow
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
              gameMode={gameMode}
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
            disabled={!hasFilledAnalysis || loading}
            className={styles.executeButton}
          >
            {loading ? 'Loading...' : 'Execute'}
          </button>
        </div>
      </div>

      <div className={styles.chartArea}>
        {error && <div className={styles.error}>{error}</div>}
        {loading && <div className={styles.loading}>Computing survival analysis...</div>}

        {!loading && !error && allAnalyses.length > 0 && (
          <div className={styles.chartWrapper}>
            <Suspense fallback={<div>Loading chart...</div>}>
              <SurvivalChart lines={allAnalyses} gameMode={gameMode} isDarkMode={isDarkMode} />
            </Suspense>
          </div>
        )}

        {!loading && !error && allAnalyses.length === 0 && hasFilledAnalysis && (
          <div className={styles.empty}>
            <img src={executePlsChibi} alt="" style={{ height: "120px", objectFit: "contain", marginBottom: "12px" }} />
            Click <strong>Execute</strong> to view survival analysis
          </div>
        )}

        {!hasFilledAnalysis && !loading && (
          <div className={styles.empty}>
            <img src={executePlsChibi} alt="" style={{ height: "120px", objectFit: "contain", marginBottom: "12px" }} />
            Complete an analysis above to get started
          </div>
        )}
      </div>
    </div>
  )
}
