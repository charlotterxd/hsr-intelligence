import React from 'react'
import styles from './Home.module.css'
import charlotterPout from '../assets/profile_charlotter_pout.png'

const TAG_COLORS = {
  'Score Trend':       { bg: '#e8ebfc', border: '#c5cdf7', text: '#3a4fb5' },
  'Cost Analysis':     { bg: '#fff0e6', border: '#ffd4b0', text: '#b85e1a' },
  'Survival Analysis': { bg: '#e6f5ea', border: '#b6dfc0', text: '#2a6e3c' },
  'Statistics':        { bg: '#fde8e8', border: '#f5b8b8', text: '#a02020' },
  'Cycle Analysis':    { bg: '#e0f5f4', border: '#9dd9d6', text: '#156460' },
}

const GAME_MODES = [
  {
    name: 'Memory of Chaos',
    emoji: '💎',
    description: 'The original endgame mode introduced in the early days of Honkai: Star Rail. Battle through 12 floors of escalating challenges. Analyze how team compositions perform across different patches, track score trends over time, and compare the investment cost of building a high-scoring roster.',
    features: ['Score Trend', 'Cost Analysis', 'Survival Analysis'],
  },
  {
    name: 'Pure Fiction',
    emoji: '🕊️',
    description: 'A wave-clear endgame mode that rewards AoE damage and fast clears. Compare how characters and team compositions scale across patches, measure the return on investment for different builds, and track which characters stay relevant as new patches roll out.',
    features: ['Score Trend', 'Cost Analysis', 'Survival Analysis'],
  },
  {
    name: 'Apocalyptic Shadow',
    emoji: '⏳',
    description: 'A boss-killing mode that pushes single-target DPS to its limits. Explore how team scores evolve across patches, analyze investment efficiency for top-performing compositions, and see how long characters remain competitive after release.',
    features: ['Score Trend', 'Cost Analysis', 'Survival Analysis'],
  },
  {
    name: 'Anomaly Arbitration',
    emoji: '⚖️',
    description: 'The newest endgame built to test the limits of players across two floor types — Knights and King in Check. View community-wide passing rates, top DPS team rankings with eidolon breakdowns, cycle efficiency distributions, and average team investment costs.',
    features: ['Statistics', 'Score Trend', 'Cycle Analysis', 'Cost Analysis'],
  },
]

const ANALYSIS_TYPES = [
  {
    name: 'Score Trend',
    desc: 'See how average scores for a team composition change across game patches. Great for identifying power creep and gauging long-term character value.',
  },
  {
    name: 'Cost Analysis',
    desc: 'Compare how scores scale with investment — from E0 to E6, with or without signature light cones. Understand the efficiency curve of each pull spent.',
  },
  {
    name: 'Survival Analysis',
    desc: 'Track how a character\'s performance holds up over time since their release. Reveals which characters age well and which fall off as the meta shifts.',
  },
  {
    name: 'Statistics (AA)',
    desc: 'Aggregate view of the Anomaly Arbitration community — passing rates, top DPS teams, median costs, and cycle distribution charts across both floor types.',
  },
]

export default function Home({ onNavigate }) {
  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <img src={charlotterPout} alt="Charlotter" className={styles.characterImg} />
          <div className={styles.speechBubble}>
            Don't thank me!<br />Just credit it to LvlUrArti!
          </div>
        </div>
        <div className={styles.heroRight}>
          <h1 className={styles.heroTitle}>HSR Endgame Analytics</h1>
          <p className={styles.heroSubtitle}>
            A community data tool for Honkai: Star Rail's endgame modes. Explore score trends,
            compare team investment costs, track character longevity, and dig into aggregate
            community statistics — all powered by real player clears.
          </p>
          <p className={styles.heroSubtitle} style={{ marginTop: '10px' }}>
            Data is collected and maintained by <strong>LvlUrArti</strong>. This site visualizes
            that dataset to help players make informed investment decisions.
            You can check his GitHub repo <a href="https://github.com/LvlUrArti/MocStats" target="_blank" rel="noopener noreferrer" className={styles.link}>HERE</a>.
          </p>
        </div>
      </div>

      <div className={styles.tierlistPromo}>
        <div className={styles.tierlistPromoText}>
          <p className={styles.tierlistPromoLabel}>New · Resources</p>
          <h2 className={styles.tierlistPromoTitle}>Data-Driven Tier List — Zero Human Opinion</h2>
          <p className={styles.tierlistPromoDesc}>
            Most tier lists are made by a handful of people with their own biases. Ours is different.
            Every ranking is computed directly from thousands of real player clears — no content creator, no committee, no gut feeling.
            If a character ranks high, it's because players are actually clearing with them.
          </p>
          <div className={styles.exclusionPitch}>
            <span className={styles.exclusionPitchIcon}>🔍</span>
            <div>
              <strong>Don't own a key support? Filter them out.</strong>
              <span> Exclude any character and watch the tier list recalculate instantly — only using teams that never had that unit.
              Curious how Castorice performs without Hyacine? Exclude her and find out.
              It's the only tier list that answers <em>"how good is X for players who don't have Y?"</em></span>
            </div>
          </div>
          <div className={styles.tierlistPromoPoints}>
            <span className={styles.promoPoint}>Based on real clear data</span>
            <span className={styles.promoPoint}>E0 only — no whale bias</span>
            <span className={styles.promoPoint}>Covers AA, AS, PF & Overall</span>
            <span className={styles.promoPoint}>Exclude any character</span>
            <span className={styles.promoPoint}>Updated per patch</span>
          </div>
        </div>
        <div className={styles.tierlistPromoAction}>
          <button className={styles.tierlistPromoBtn} onClick={() => onNavigate('tierList')}>
            View Tier List →
          </button>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>Game Modes</h2>
      <div className={styles.grid}>
        {GAME_MODES.map((mode) => (
          <div key={mode.name} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardEmoji}>{mode.emoji}</span>
              <h3 className={styles.cardTitle}>{mode.name}</h3>
            </div>
            <p className={styles.cardDesc}>{mode.description}</p>
            <div className={styles.cardFeatures}>
              {mode.features.map((f) => {
                const c = TAG_COLORS[f] || TAG_COLORS['Score Trend']
                return (
                  <span key={f} data-tag="true" className={styles.featureTag} style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
                    {f}
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <h2 className={styles.sectionTitle}>Analysis Types</h2>
      <div className={styles.analysisGrid}>
        {ANALYSIS_TYPES.map((a) => (
          <div key={a.name} className={styles.analysisCard}>
            <h4 className={styles.analysisName}>{a.name}</h4>
            <p className={styles.analysisDesc}>{a.desc}</p>
          </div>
        ))}
      </div>

      <div className={styles.note}>
        <p>Select a game mode from the sidebar to get started.</p>
      </div>
    </div>
  )
}
