import React, { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import styles from './SurvivalChart.module.css'

const COLORS = ['var(--accent)', '#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCF7F', '#FF8C42']

export default function SurvivalChart({ lines, gameMode = 'pureFiction', isDarkMode = false }) {
  const defaultThreshold = gameMode === 'apocalypticShadow' ? '3300' : gameMode === 'memoryOfChaos' ? '10' : '30000'
  const [threshold, setThreshold] = useState(defaultThreshold)
  const gridColor = isDarkMode ? '#444' : '#ccc'
  const axisColor = isDarkMode ? '#aaa' : '#666'
  const textColor = isDarkMode ? '#e0e0e0' : '#000'
  if (!lines || lines.length === 0) {
    return <div className={styles.empty}>No data</div>
  }

  // Merge all patches across all lines into unified dataset
  // Use patches_since as key (relative to each character's release)
  const patchesMap = {}
  const lineInfo = {}

  lines.forEach((line, idx) => {
    lineInfo[`line_${line.id}`] = {
      label: line.label,
      color: line.color || COLORS[idx % COLORS.length]
    }

    line.data.forEach(item => {
      if (!patchesMap[item.patches_since]) {
        patchesMap[item.patches_since] = {
          patches_since: item.patches_since
        }
      }
      patchesMap[item.patches_since][`line_${line.id}`] = item.score
      patchesMap[item.patches_since][`count_${line.id}`] = item.count
      patchesMap[item.patches_since][`patch_${line.id}`] = item.patch
    })
  })

  // Sort by patches_since numerically
  const chartData = Object.values(patchesMap).sort((a, b) => a.patches_since - b.patches_since)

  const thresholdValue = threshold === '' ? null : parseFloat(threshold)

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const items = []

      lines.forEach(line => {
        const score = data[`line_${line.id}`]
        const count = data[`count_${line.id}`]
        const patch = data[`patch_${line.id}`]
        if (score !== undefined) {
          items.push({
            label: line.label,
            score: score.toFixed(2),
            count: count || 0,
            color: lineInfo[`line_${line.id}`].color,
            patch: patch
          })
        }
      })

      return (
        <div className={styles.tooltip} data-tag="true">
          <p data-tag="true" className={styles.tooltipLabel}>{data.patches_since} patches after release</p>
          {items.map((item, idx) => (
            <div data-tag="true" key={idx} className={styles.tooltipItem}>
              <p data-tag="true" className={styles.tooltipLine} style={{ color: item.color }}>
                {item.label}: Patch {item.patch}
              </p>
              <p data-tag="true" className={styles.tooltipCount}>{item.score} pts / {item.count} entries</p>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Survival Analysis Comparison</h2>
          <p className={styles.subtitle}>
            Comparing how character performs as patches passed
          </p>
        </div>
        <div className={styles.thresholdInput}>
          <label htmlFor="threshold">Min Threshold Score:</label>
          <input
            id="threshold"
            type="number"
            step="0.1"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="Enter number"
            style={{ width: '100px' }}
          />
        </div>
      </div>

      <div className={styles.chartWrapper}>
        <h3 className={styles.chartTitle}>Average Score</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="patches_since"
              type="number"
              stroke={axisColor}
              style={{ fontSize: '16px', fill: textColor }}
              label={{ value: 'Patches Since Release', position: 'insideBottomRight', offset: -10, fill: textColor }}
            />
            <YAxis
              domain={[0, 'auto']}
              stroke={axisColor}
              style={{ fontSize: '16px', fill: textColor }}
            />
            <Tooltip content={<CustomTooltip />} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #000000', color: '#000000' }} />
            <Legend wrapperStyle={{ paddingTop: '20px', color: textColor }} verticalAlign="bottom" height={36} />
            {thresholdValue !== null && lines.length > 0 && (
              <ReferenceLine
                y={thresholdValue}
                stroke="#FF0000"
                strokeDasharray="5 5"
              />
            )}
            {lines.map((line, idx) => (
              <Line
                key={line.id}
                type="monotone"
                dataKey={`line_${line.id}`}
                stroke={lineInfo[`line_${line.id}`].color}
                strokeWidth={2}
                dot={{ fill: lineInfo[`line_${line.id}`].color, r: 4 }}
                activeDot={{ r: 6 }}
                isAnimationActive={true}
                name={line.label}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
