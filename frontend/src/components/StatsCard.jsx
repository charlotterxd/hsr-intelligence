import React from 'react'
import styles from './StatsCard.module.css'

export default function StatsCard({ title, value, description }) {
  return (
    <div className={styles.card}>
      <h4>{title}</h4>
      <div className={styles.value}>{value}</div>
      <p className={styles.description}>{description}</p>
    </div>
  )
}
