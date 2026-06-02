import React, { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import styles from './CostChart.module.css'

const BIN_LABELS = {
  '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
  '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '10': '10',
  '11-15': '11-15', '16+': '16+'
}

const COLORS = ['var(--accent)', '#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCF7F', '#FF8C42']

export default function CostChart({ lines, gameMode = 'pureFiction', title = null, isDarkMode = false }) {
  const defaultThreshold = gameMode === 'apocalypticShadow' ? '3300' : gameMode === 'memoryOfChaos' ? '10' : '30000'
  const [threshold, setThreshold] = useState(defaultThreshold)
  const gridColor = isDarkMode ? '#444' : '#ccc'
  const axisColor = isDarkMode ? '#aaa' : '#666'
  const textColor = isDarkMode ? '#e0e0e0' : '#000'

  if (!lines || lines.length === 0) {
    return <div className={styles.empty}>No data</div>
  }

  const thresholdValue = threshold === '' ? null : parseFloat(threshold)

  // Merge all cost bins across all lines into unified dataset
  const binMap = {}
  const lineInfo = {}

  lines.forEach((line, idx) => {
    lineInfo[`line_${line.id}`] = {
      label: line.label,
      color: line.color || COLORS[idx % COLORS.length]
    }

    line.data.forEach(item => {
      if (!binMap[item.bin]) {
        binMap[item.bin] = { bin: item.bin }
      }
      binMap[item.bin][`line_${line.id}`] = item.score
      binMap[item.bin][`count_${line.id}`] = item.count
    })
  })

  // Sort bins: 0-10 numerically, then 11-15, then 16+
  const BIN_ORDER = [
    ...Array.from({length: 11}, (_, i) => String(i)),
    '11-15', '16+'
  ]

  const chartData = BIN_ORDER
    .filter(b => binMap[b])
    .map(b => binMap[b])

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const items = []

      lines.forEach(line => {
        const score = data[`line_${line.id}`]
        const count = data[`count_${line.id}`]
        if (score !== undefined) {
          items.push({
            label: line.label,
            score: score.toFixed(2),
            count: count || 0,
            color: lineInfo[`line_${line.id}`].color
          })
        }
      })

      const binLabel = BIN_LABELS[data.bin] || data.bin

      return (
        <div className={styles.tooltip} data-tag="true">
          <p data-tag="true" className={styles.tooltipLabel}>Cost: {binLabel} pulls</p>
          {items.map((item, idx) => (
            <div data-tag="true" key={idx} className={styles.tooltipItem}>
              <p data-tag="true" className={styles.tooltipLine} style={{ color: item.color }}>
                {item.label}: {item.score}
              </p>
              <p data-tag="true" className={styles.tooltipCount}>({item.count} teams)</p>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className={styles.container}>
      {title && gameMode === 'anomalyArbitration' && (
        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1em', color: '#333' }}>{title}</h3>
      )}
      {gameMode !== 'anomalyArbitration' && (
        <div className={styles.header}>
          <div>
            <h2>Cost Analysis Comparison</h2>
            <p className={styles.subtitle}>
              Comparing scores by limited cost required
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
      )}

      <div className={styles.chartWrapper}>
        <h3 className={styles.chartTitle}>Average Score</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="bin"
              stroke={axisColor}
              style={{ fontSize: '16px', fill: textColor }}
              label={{ value: 'Total Pulls', position: 'insideBottomRight', offset: -10, fill: textColor }}
            />
            <YAxis
              domain={['auto', 'auto']}
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
