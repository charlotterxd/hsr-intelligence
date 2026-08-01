import React, { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import styles from './TrendChart.module.css'

export default function TrendChart({ lines, gameMode = 'pureFiction', isPercentage = false, isDarkMode = false }) {
  const defaultThreshold = gameMode === 'apocalypticShadow' ? '3300' : gameMode === 'memoryOfChaos' ? '10' : '30000'
  const [threshold, setThreshold] = useState(defaultThreshold)
  const gridColor = isDarkMode ? '#444' : '#ccc'
  const axisColor = isDarkMode ? '#aaa' : '#666'
  const textColor = isDarkMode ? '#e0e0e0' : '#000'
  if (!lines || lines.length === 0) {
    return <div className={styles.empty}>No data to display</div>
  }

  // Merge all versions across lines into unified dataset
  const versionMap = {}

  lines.forEach(line => {
    line.data.forEach(item => {
      if (!versionMap[item.version]) {
        versionMap[item.version] = { version: item.version }
      }
      versionMap[item.version][`line_${line.id}`] = item.score
      versionMap[item.version][`count_${line.id}`] = item.count
    })
  })

  // Sort by version
  const chartData = Object.values(versionMap).sort((a, b) => {
    const aVersion = parseFloat(a.version)
    const bVersion = parseFloat(b.version)
    return aVersion - bVersion
  })

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
            color: line.color,
            score: score.toFixed(2),
            count: count || 0
          })
        }
      })

      const scoreUnit = isPercentage ? '%' : ''

      return (
        <div className={styles.tooltip} data-tag="true">
          <p data-tag="true" className={styles.tooltipLabel}>v{data.version}</p>
          {items.map((item, idx) => (
            <div data-tag="true" key={idx} className={styles.tooltipItem}>
              <p data-tag="true" className={styles.tooltipLine} style={{ color: item.color }}>
                {item.label}: {item.score}{scoreUnit}
              </p>
              {item.count > 0 && (
                <p data-tag="true" className={styles.tooltipCount}>({item.count} records)</p>
              )}
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const thresholdValue = threshold === '' ? null : parseFloat(threshold)

  return (
    <div className={styles.container}>
      {gameMode !== 'anomalyArbitration' && !isPercentage && (
        <div className={styles.header}>
          <h2>Score Trends</h2>
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
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="version" stroke={axisColor} style={{ fontSize: '16px', fill: textColor }} padding={{ left: 20, right: 20 }} />
          <YAxis stroke={axisColor} style={{ fontSize: '16px', fill: textColor }} />
          <Tooltip content={<CustomTooltip />} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #000000', color: '#000000' }} />
          <Legend wrapperStyle={{ color: textColor }} />
          {thresholdValue !== null && lines.length > 0 && (
            <ReferenceLine
              y={thresholdValue}
              stroke="#FF0000"
              strokeDasharray="5 5"
            />
          )}
          {lines.map(line => (
            <Line
              key={line.id}
              type="monotone"
              dataKey={`line_${line.id}`}
              stroke={line.color}
              name={line.label}
              dot={{ fill: line.color, r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
