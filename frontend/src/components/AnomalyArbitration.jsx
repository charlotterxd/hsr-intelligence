import React from 'react'
import AAAvgCyclesChart from './AAAvgCyclesChart'
import AADistributionChart from './AADistributionChart'
import styles from './AnomalyArbitration.module.css'

export default function AnomalyArbitration({
  knightsAvg = [],
  kingNormalAvg = [],
  knightsDistribution = [],
  kingNormalDistribution = [],
  loading = false,
  error = null
}) {
  if (loading) {
    return <div className={styles.container}><p>Loading Anomaly Arbitration data...</p></div>
  }

  if (error) {
    return <div className={styles.container}><p style={{color: 'red'}}>Error: {error}</p></div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        <div className={styles.chartBox}>
          <h3>Knights: Average Cycles</h3>
          <AAAvgCyclesChart data={knightsAvg} />
        </div>
        <div className={styles.chartBox}>
          <h3>Knights: Cycle Distribution</h3>
          <AADistributionChart data={knightsDistribution} />
        </div>
        <div className={styles.chartBox}>
          <h3>King in Check (Normal): Average Cycles</h3>
          <AAAvgCyclesChart data={kingNormalAvg} />
        </div>
        <div className={styles.chartBox}>
          <h3>King in Check (Normal): Cycle Distribution</h3>
          <AADistributionChart data={kingNormalDistribution} />
        </div>
      </div>
    </div>
  )
}
