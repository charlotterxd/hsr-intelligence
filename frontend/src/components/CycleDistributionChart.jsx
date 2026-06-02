import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import styles from './CycleDistributionChart.module.css'

const COLORS = {
  '0': '#8884d8',
  '1-2': '#82ca9d',
  '3-4': '#ffc658',
  '5-6': '#ff7c7c'
}

const BIN_ORDER = ['0', '1-2', '3-4', '5-6']

export default function CycleDistributionChart({ data }) {
  // Transform data for stacked bar chart
  const chartData = [{
    name: 'Distribution',
    ...Object.fromEntries(data.map(d => [d.bin, d.percentage]))
  }]

  return (
    <div className={styles.card}>
      <h4>Cycle Distribution (King Normal)</h4>
      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 20, left: 100, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} label={{ value: 'Percentage (%)', position: 'insideBottomRight', offset: -10 }} tick={{ fontSize: 16 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 16 }} />
            <Tooltip formatter={(value) => `${value.toFixed(1)}%`} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #000000', color: '#000000' }} itemStyle={{ color: '#000000' }} />
            <Legend />
            {BIN_ORDER.map(bin => (
              <Bar
                key={bin}
                dataKey={bin}
                stackId="a"
                fill={COLORS[bin]}
                name={`${bin} cycles`}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className={styles.note}>Shows distribution of cycles used across {BIN_ORDER.length} bins, summing to 100%</p>
    </div>
  )
}
