import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import styles from './AADistributionChart.module.css'

const BIN_COLORS = {
  bin_0: '#2ecc71',    // green
  bin_1_2: '#3498db',  // blue
  bin_3_4: '#f39c12',  // orange
  bin_5_6: '#e74c3c'   // red
}

const BIN_LABELS = {
  bin_0: '0 Cycles',
  bin_1_2: '1-2 Cycles',
  bin_3_4: '3-4 Cycles',
  bin_5_6: '5-6 Cycles'
}

export default function AADistributionChart({ data }) {
  if (!data || data.length === 0) {
    return <div className={styles.noData}>No data available</div>
  }

  return (
    <div className={styles.chartContainer}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="version" tick={{ fontSize: 16 }} padding={{ left: 20, right: 20 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 16 }} />
          <Tooltip
            formatter={(value) => `${value?.toFixed(1)}%`}
            labelFormatter={(label) => `Version: ${label}`}
            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #000000', color: '#000000' }}
            itemStyle={{ color: '#000000' }}
          />
          <Legend />
          <Bar dataKey="bin_0" stackId="a" fill={BIN_COLORS.bin_0} name={BIN_LABELS.bin_0} />
          <Bar dataKey="bin_1_2" stackId="a" fill={BIN_COLORS.bin_1_2} name={BIN_LABELS.bin_1_2} />
          <Bar dataKey="bin_3_4" stackId="a" fill={BIN_COLORS.bin_3_4} name={BIN_LABELS.bin_3_4} />
          <Bar dataKey="bin_5_6" stackId="a" fill={BIN_COLORS.bin_5_6} name={BIN_LABELS.bin_5_6} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
