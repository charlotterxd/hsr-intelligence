import React from 'react'
import styles from './AADistributionGrid.module.css'

export default function AADistributionGrid({ data = [] }) {
  if (!data || data.length === 0) {
    return <div className={styles.empty}>No data available</div>
  }

  // Calculate average percentages across all versions
  const avgBin0 = (data.reduce((sum, d) => sum + (d.bin_0 || 0), 0) / data.length).toFixed(1)
  const avgBin1_2 = (data.reduce((sum, d) => sum + (d.bin_1_2 || 0), 0) / data.length).toFixed(1)
  const avgBin3_4 = (data.reduce((sum, d) => sum + (d.bin_3_4 || 0), 0) / data.length).toFixed(1)
  const avgBin5_6 = (data.reduce((sum, d) => sum + (d.bin_5_6 || 0), 0) / data.length).toFixed(1)

  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <div className={styles.binLabel}>0 Cycles</div>
        <div className={styles.percentage}>{avgBin0}%</div>
      </div>
      <div className={styles.card}>
        <div className={styles.binLabel}>1-2 Cycles</div>
        <div className={styles.percentage}>{avgBin1_2}%</div>
      </div>
      <div className={styles.card}>
        <div className={styles.binLabel}>3-4 Cycles</div>
        <div className={styles.percentage}>{avgBin3_4}%</div>
      </div>
      <div className={styles.card}>
        <div className={styles.binLabel}>5-6 Cycles</div>
        <div className={styles.percentage}>{avgBin5_6}%</div>
      </div>
    </div>
  )
}
