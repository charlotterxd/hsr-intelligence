import React, { useState, Suspense } from 'react'
import { getCostAnalysis } from '../api'
import CostAnalysisFilterRow from './CostAnalysisFilterRow'
import CostChart from './CostChart'
import styles from './CostAnalysis.module.css'
import executePlsChibi from '../assets/chibi/execute_pls.webp'

const COLORS = ['var(--accent)', '#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCF7F']

const createLineConfig = (id, colorIndex) => ({
  id,
  lineName: `Cost Analysis ${id + 1}`,
  lineColor: COLORS[colorIndex % COLORS.length],
  character: '',
  patch_start: '',
  patch_end: '',
  aggregation: 'median',
  sustain: 'Both',
  include_standard_eidolons: false
})

export default function CostAnalysis({ characters, gameMode = 'pureFiction', isDarkMode = false, onNavigateToMethodologies, chibiImage = null }) {
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
    const filledLines = lineConfigs.filter(
      lc => lc.character && lc.patch_start && lc.patch_end
    )

    if (filledLines.length === 0) {
      setError('Please complete at least one analysis (character + patches)')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const promises = gameMode === 'anomalyArbitration'
        ? filledLines.flatMap(lc => [
            getCostAnalysis({
              character: lc.character,
              patch_start: lc.patch_start,
              patch_end: lc.patch_end,
              floor_type: 'knights',
              signature_lc_mode: 'both',
              sustain_filter: lc.sustain,
              aggregation: lc.aggregation,
              include_standard_eidolons: lc.include_standard_eidolons
            }, gameMode).then(data => ({
              id: lc.id,
              label: lc.lineName,
              color: lc.lineColor,
              data: data || [],
              floorType: 'knights'
            })),
            getCostAnalysis({
              character: lc.character,
              patch_start: lc.patch_start,
              patch_end: lc.patch_end,
              floor_type: 'king_normal',
              signature_lc_mode: 'both',
              sustain_filter: lc.sustain,
              aggregation: lc.aggregation,
              include_standard_eidolons: lc.include_standard_eidolons
            }, gameMode).then(data => ({
              id: lc.id,
              label: lc.lineName,
              color: lc.lineColor,
              data: data || [],
              floorType: 'king_normal'
            }))
          ])
        : filledLines.map(lc =>
            getCostAnalysis({
              character: lc.character,
              patch_start: lc.patch_start,
              patch_end: lc.patch_end,
              signature_lc_mode: 'both',
              sustain_filter: lc.sustain,
              aggregation: lc.aggregation,
              include_standard_eidolons: lc.include_standard_eidolons
            }, gameMode).then(data => ({
              id: lc.id,
              label: lc.lineName,
              color: lc.lineColor,
              data: data || [],
              floorType: null
            }))
          )

      const results = await Promise.all(promises)
      setAllAnalyses(results)
    } catch (err) {
      setError(err.message || 'Failed to fetch cost analysis')
    } finally {
      setLoading(false)
    }
  }

  const hasFilledAnalysis = gameMode === 'anomalyArbitration'
    ? lineConfigs.some(lc => lc.character && lc.patch_end)
    : lineConfigs.some(lc => lc.character && lc.patch_start && lc.patch_end)
  const canAddLine = lineConfigs.length < 5

  const isAA = gameMode === 'anomalyArbitration'
  const knightsAnalyses = isAA ? allAnalyses.filter(a => a.floorType === 'knights') : []
  const kingNormalAnalyses = isAA ? allAnalyses.filter(a => a.floorType === 'king_normal') : []

  return (
    <div>
      <div className={styles.description}>
        {chibiImage && <img src={chibiImage} alt="" className={styles.descriptionChibi} />}
        <div className={styles.descriptionBody}>
          <h3>💰 How to Use Cost Analysis</h3>
          <p>
            {isAA
              ? 'Select characters to analyze their score performance based on the total limited 5-star pulls invested in the team. Compare Knights (Floors 1-3) and King in Check Normal floor side-by-side to see how team investment affects Anomaly Arbitration scores across different cost tiers.'
              : <>Select a character, define the patch range, and analyze their score performance based on the total limited 5-star pulls invested in the team. Compare multiple characters side-by-side to see how team investment affects scores across different cost tiers. You can refer to the cost calculation methodology <button className={styles.inlineLink} onClick={onNavigateToMethodologies}>HERE</button>.</>
            }
          </p>
        </div>
      </div>
      <div className={styles.filterArea}>
        <div className={styles.filterRows}>
          {lineConfigs.map((lc) => (
            <CostAnalysisFilterRow
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
        {loading && <div className={styles.loading}>Computing cost analysis...</div>}

        {!loading && !error && allAnalyses.length > 0 && (
          isAA ? (
            <div className={styles.aaChartGrid}>
              <div style={{ minWidth: 0 }}>
                <Suspense fallback={<div>Loading chart...</div>}>
                  <CostChart isDarkMode={isDarkMode}
                    lines={knightsAnalyses.map(({ floorType, ...rest }) => rest)}
                    gameMode={gameMode}
                    title="Cost Analysis Comparison - Knights (Floors 1-3)"
                  />
                </Suspense>
              </div>
              <div style={{ minWidth: 0 }}>
                <Suspense fallback={<div>Loading chart...</div>}>
                  <CostChart isDarkMode={isDarkMode}
                    lines={kingNormalAnalyses.map(({ floorType, ...rest }) => rest)}
                    gameMode={gameMode}
                    title="Cost Analysis Comparison - King in Check (Normal)"
                  />
                </Suspense>
              </div>
            </div>
          ) : (
            <div className={styles.chartWrapper}>
              <Suspense fallback={<div>Loading chart...</div>}>
                <CostChart isDarkMode={isDarkMode} lines={allAnalyses.map(({ floorType, ...rest }) => rest)} gameMode={gameMode} />
              </Suspense>
            </div>
          )
        )}

        {!loading && !error && allAnalyses.length === 0 && hasFilledAnalysis && (
          <div className={styles.empty}>
            <img src={executePlsChibi} alt="" style={{ height: "120px", objectFit: "contain", marginBottom: "12px" }} />
            Click <strong>Execute</strong> to view cost analysis
          </div>
        )}

        {!hasFilledAnalysis && !loading && (
          <div className={styles.empty}>
            <img src={executePlsChibi} alt="" style={{ height: "120px", objectFit: "contain", marginBottom: "12px" }} />
            {isAA ? 'Select a character above to get started' : 'Complete an analysis above to get started'}
          </div>
        )}
      </div>
    </div>
  )
}
