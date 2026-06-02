import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import styles from './AAAvgCyclesChart.module.css'

export default function AAAvgCyclesChart({ data }) {
  if (!data || data.length === 0) {
    return <div className={styles.noData}>No data available</div>
  }

  return (
    <div className={styles.chartContainer}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="version" tick={{ fontSize: 16 }} padding={{ left: 20, right: 20 }} />
          <YAxis tick={{ fontSize: 16 }} />
          <Tooltip
            formatter={(value) => value?.toFixed(2)}
            labelFormatter={(label) => `Version: ${label}`}
            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #000000', color: '#000000' }}
            itemStyle={{ color: '#000000' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="avg_cycles"
            stroke="var(--accent)"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
            name="Average Cycles"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
