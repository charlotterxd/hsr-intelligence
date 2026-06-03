import React, { useState, useEffect, useRef } from 'react'
import { getASTierListPatches, getASTierList, getPFTierListPatches, getPFTierList, getMOCTierListPatches, getMOCTierList, getAATierListPatches, getAATierList, getOverallTierListPatches, getOverallTierList } from '../api'
import styles from './TierList.module.css'

const MODE_CONFIG = {
  overall: {
    label: 'Overall',
    fetchPatches: getOverallTierListPatches,
    fetchTierList: getOverallTierList,
    lowerIsBetter: false,
    aggregation: 'weighted',
    metric: 'score',
    scoreDecimals: 2,
    scoreBins: [
      { min: 5,    max: Infinity },
      { min: 4,    max: 4.9999 },
      { min: 3,    max: 3.9999 },
      { min: 2,    max: 2.9999 },
      { min: 1,    max: 1.9999 },
      { min: 0,    max: 0.9999 },
    ],
    tierLevels: [
      { label: 'T0',   desc: 'weighted score 5+' },
      { label: 'T0.5', desc: '4 – 5' },
      { label: 'T1',   desc: '3 – 4' },
      { label: 'T1.5', desc: '2 – 3' },
      { label: 'T2',   desc: '1 – 2' },
      { label: 'T3',   desc: 'below 1' },
    ],
  },
  aa: {
    label: 'Anomaly Arbitration',
    fetchPatches: getAATierListPatches,
    fetchTierList: getAATierList,
    lowerIsBetter: true,
    aggregation: 'median',
    metric: 'cycles',
    scoreBins: [
      { min: 0, max: 1 },
      { min: 2, max: 2 },
      { min: 3, max: 3 },
      { min: 4, max: 4 },
      { min: 5, max: 5 },
      { min: 6, max: Infinity },
    ],
    tierLevels: [
      { label: 'T0',   desc: '0 – 1 cycles (total, floors 1–3)' },
      { label: 'T0.5', desc: '2 cycles' },
      { label: 'T1',   desc: '3 cycles' },
      { label: 'T1.5', desc: '4 cycles' },
      { label: 'T2',   desc: '5 cycles' },
      { label: 'T3',   desc: '6 or more cycles' },
    ],
  },
  as: {
    label: 'Apocalyptic Shadow',
    fetchPatches: getASTierListPatches,
    fetchTierList: getASTierList,
    lowerIsBetter: false,
    aggregation: 'median',
    metric: 'score',
    scoreBins: [
      { min: 3551, max: Infinity },
      { min: 3401, max: 3550 },
      { min: 3251, max: 3400 },
      { min: 3100, max: 3250 },
      { min: 3101, max: 3200 },
      { min: 0,    max: 3099 },
    ],
    tierLevels: [
      { label: 'T0',   desc: '3551 and above' },
      { label: 'T0.5', desc: '3401 to 3550' },
      { label: 'T1',   desc: '3251 to 3400' },
      { label: 'T1.5', desc: '3100 to 3250' },
      { label: 'T2',   desc: '3101 to 3200' },
      { label: 'T3',   desc: 'below 3100' },
    ],
  },
  pf: {
    label: 'Pure Fiction',
    fetchPatches: getPFTierListPatches,
    fetchTierList: getPFTierList,
    lowerIsBetter: false,
    aggregation: 'median',
    metric: 'score',
    scoreBins: [
      { min: 40000, max: Infinity },
      { min: 35001, max: 39999 },
      { min: 32001, max: 35000 },
      { min: 28001, max: 32000 },
      { min: 25001, max: 28000 },
      { min: 0,     max: 25000 },
    ],
    tierLevels: [
      { label: 'T0',   desc: '40000 (max score)' },
      { label: 'T0.5', desc: '35001 to 39999' },
      { label: 'T1',   desc: '32001 to 35000' },
      { label: 'T1.5', desc: '28001 to 32000' },
      { label: 'T2',   desc: '25001 to 28000' },
      { label: 'T3',   desc: 'below 25001' },
    ],
  },
  moc: {
    label: 'Memory of Chaos',
    fetchPatches: getMOCTierListPatches,
    fetchTierList: getMOCTierList,
    lowerIsBetter: true,
    aggregation: 'mean',
    metric: 'cycles',
    scoreBins: [
      { min: 0,    max: 5.9999  },
      { min: 6,    max: 6.4999  },
      { min: 6.5,  max: 7.4999  },
      { min: 7.5,  max: 8.9999  },
      { min: 9,    max: 10.9999 },
      { min: 11,   max: Infinity },
    ],
    tierLevels: [
      { label: 'T0',   desc: 'mean < 6' },
      { label: 'T0.5', desc: 'mean 6 – 6.5' },
      { label: 'T1',   desc: 'mean 6.5 – 7.5' },
      { label: 'T1.5', desc: 'mean 7.5 – 9' },
      { label: 'T2',   desc: 'mean 9 – 11' },
      { label: 'T3',   desc: 'mean above 11' },
    ],
  },
}

const TIER_META = [
  { label: 'T0',   color: '#FF4444', bg: 'rgba(255,68,68,0.12)' },
  { label: 'T0.5', color: '#FF8C00', bg: 'rgba(255,140,0,0.12)' },
  { label: 'T1',   color: '#FFD700', bg: 'rgba(255,215,0,0.12)' },
  { label: 'T1.5', color: '#6BCF7F', bg: 'rgba(107,207,127,0.12)' },
  { label: 'T2',   color: '#87CEEB', bg: 'rgba(135,206,235,0.12)' },
  { label: 'T3',   color: '#8E9AAF', bg: 'rgba(142,154,175,0.12)' },
]

const ROLE_ORDER = ['dps', 'specialist', 'sub-dps', 'amplifier', 'sustain']
const ROLE_LABELS = { dps: 'DPS', specialist: 'Specialist', 'sub-dps': 'Sub-DPS', amplifier: 'Amplifier', sustain: 'Sustain' }

function buildDynamicTiers(data, scoreBins) {
  const populated = scoreBins.filter(bin =>
    data.some(c => c.median_score >= bin.min && c.median_score <= bin.max)
  )
  return populated.slice(0, TIER_META.length).map((bin, idx) => ({
    key: TIER_META[idx].label,
    label: TIER_META[idx].label,
    min: bin.min,
    max: bin.max,
    color: TIER_META[idx].color,
    bg: TIER_META[idx].bg,
  }))
}

function assignTier(score, tiers) {
  for (const tier of tiers) {
    if (score >= tier.min && score <= tier.max) return tier.key
  }
  return null
}

function chunkArray(arr, size) {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

function TierPanel({ mode, characters }) {
  const config = MODE_CONFIG[mode]
  const [patches, setPatches] = useState([])
  const [selectedPatch, setSelectedPatch] = useState('')
  const [tierData, setTierData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [excludedChars, setExcludedChars] = useState([])
  const [signatureOnly, setSignatureOnly] = useState(false)
  const [exclusionSearch, setExclusionSearch] = useState('')
  const [exclusionOpen, setExclusionOpen] = useState(false)
  const exclusionRef = useRef(null)

  useEffect(() => {
    setPatches([])
    setSelectedPatch('')
    setTierData([])
    setError(null)
    const fetchPatches = async () => {
      try {
        const data = await config.fetchPatches()
        setPatches(data)
        if (data.length > 0) setSelectedPatch(data[data.length - 1])
      } catch (err) {
        setError(err.message)
      }
    }
    fetchPatches()
  }, [mode])

  useEffect(() => {
    if (!selectedPatch) return
    const fetchTierList = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await config.fetchTierList(selectedPatch, excludedChars, signatureOnly)
        setTierData(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchTierList()
  }, [selectedPatch, excludedChars, signatureOnly, mode])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exclusionRef.current && !exclusionRef.current.contains(e.target)) {
        setExclusionOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const buildTierTable = () => {
    let tiers = buildDynamicTiers(tierData, config.scoreBins)

    if (tiers.length >= 2) {
      const t0Count = tierData.filter(c => c.median_score >= tiers[0].min && c.median_score <= tiers[0].max).length
      if (t0Count < 3) {
        const merged = config.lowerIsBetter
          ? { ...tiers[0], max: tiers[1].max }
          : { ...tiers[0], min: tiers[1].min }
        tiers = [merged, ...tiers.slice(2)]
      }
    }

    const roleSet = new Set(tierData.map(c => (c.role || 'unknown').toLowerCase()))
    const activeRoles = ROLE_ORDER.filter(r => roleSet.has(r))
    roleSet.forEach(r => { if (!ROLE_ORDER.includes(r)) activeRoles.push(r) })

    const table = {}
    tiers.forEach(t => {
      table[t.key] = {}
      activeRoles.forEach(r => { table[t.key][r] = [] })
    })

    tierData.forEach(char => {
      const tierKey = assignTier(char.median_score, tiers)
      if (!tierKey) return
      const role = (char.role || 'unknown').toLowerCase()
      if (table[tierKey] && activeRoles.includes(role)) {
        table[tierKey][role].push(char)
      }
    })

    return { tiers, table, activeRoles }
  }

  const { tiers, table, activeRoles } = buildTierTable()

  const toggleExclusion = (charName) => {
    setExcludedChars(prev =>
      prev.includes(charName) ? prev.filter(n => n !== charName) : [...prev, charName]
    )
  }

  const filteredExclusionList = characters.filter(c =>
    c.name && (!exclusionSearch || c.name.toLowerCase().includes(exclusionSearch.toLowerCase()))
  )

  return (
    <>
      <div className={styles.filterBar}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Patch</label>
            <select
              className={styles.select}
              value={selectedPatch}
              onChange={e => setSelectedPatch(e.target.value)}
            >
              {patches.map(p => (
                <option key={p} value={p}>Patch {p}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup} ref={exclusionRef}>
            <label className={styles.filterLabel}>Exclude Characters</label>
            <div className={styles.exclusionRow}>
              <div className={styles.exclusionWrapper}>
                <button
                  className={styles.exclusionToggle}
                  onClick={() => setExclusionOpen(!exclusionOpen)}
                >
                  {excludedChars.length > 0 ? `${excludedChars.length} excluded` : 'None excluded'} ▾
                </button>
                {exclusionOpen && (
                  <div className={styles.exclusionDropdown}>
                    <input
                      type="text"
                      placeholder="Search characters..."
                      className={styles.exclusionSearch}
                      value={exclusionSearch}
                      onChange={e => setExclusionSearch(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      autoFocus
                    />
                    <div className={styles.exclusionList}>
                      {filteredExclusionList.map(c => (
                        <label key={c.name} className={styles.exclusionItem}>
                          <input
                            type="checkbox"
                            checked={excludedChars.includes(c.name)}
                            onChange={() => toggleExclusion(c.name)}
                          />
                          <span>{c.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {excludedChars.length > 0 && (
                <button className={styles.clearBtn} onClick={() => setExcludedChars([])}>
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={styles.filterRow}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={signatureOnly}
              onChange={e => setSignatureOnly(e.target.checked)}
            />
            Signature LC only
          </label>
          <div className={styles.filterNote}>Eidolon 0{signatureOnly ? ' + Signature LC' : ''}</div>
        </div>
      </div>

      {loading && <div className={styles.loading}>Loading tier list...</div>}
      {error && <div className={styles.error}>{error}</div>}

      {!loading && !error && tierData.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.tierTable}>
            <thead>
              <tr>
                <th className={styles.tierHeader}>Tier</th>
                {activeRoles.map(role => (
                  <th key={role} className={styles.roleHeader}>
                    {ROLE_LABELS[role] || role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tiers.map(tier => (
                <tr key={tier.key}>
                  <td className={styles.tierLabel} style={{ borderColor: tier.color, background: tier.bg }}>
                    <span style={{ color: tier.color }}>{tier.label}</span>
                  </td>
                  {activeRoles.map(role => (
                    <td key={role} className={styles.roleCell}>
                      {chunkArray(table[tier.key]?.[role] || [], 3).map((row, rowIdx) => (
                        <div key={rowIdx} className={styles.charRow}>
                          {row.map(char => (
                            <div key={char.name} className={styles.charCard}>
                              <div className={styles.charImageWrapper}>
                                <img
                                  src={`/characters/${char.id}.png`}
                                  alt={char.name}
                                  className={styles.charImage}
                                  onError={e => { e.target.style.display = 'none' }}
                                />
                              </div>
                              <div className={styles.charName}>{char.name}</div>
                              <div className={styles.charScore}>{config.scoreDecimals ? char.median_score.toFixed(config.scoreDecimals) : config.lowerIsBetter ? char.median_score.toFixed(2) : Math.round(char.median_score)}</div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className={styles.tierLabel} style={{ borderColor: '#555', background: 'rgba(80,80,80,0.10)' }}>
                  <span style={{ color: '#888' }}>T4</span>
                </td>
                <td colSpan={activeRoles.length} className={styles.t4Cell} style={{ background: 'var(--bg-primary)' }}>
                  If you don't see any character, they're here. Because no one uses them 💀
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && tierData.length === 0 && selectedPatch && (
        <div className={styles.empty}>No tier data available for this patch.</div>
      )}
    </>
  )
}

export default function TierList({ characters = [] }) {
  const [mode, setMode] = useState('overall')
  const config = MODE_CONFIG[mode]

  return (
    <div className={styles.container}>
      <div className={styles.modeTabBar}>
        {Object.entries(MODE_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            className={`${styles.modeTab} ${mode === key ? styles.activeModeTab : ''}`}
            onClick={() => setMode(key)}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {mode === 'overall' ? (
        <div className={styles.description}>
          <div className={styles.descriptionBody}>
            <h3>How is the Overall score calculated?</h3>
            <p>
              The <strong>Overall Tier List</strong> combines three game modes into a single weighted score per patch (3.6+).
              MOC is excluded due to data quality. Only teams where <strong>every Limited 5★ is at E0</strong> are counted.
            </p>

            <p style={{ marginTop: 14, marginBottom: 8, fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
              Step 1 — Each mode places the character in a tier using its own thresholds:
            </p>
            <table className={styles.thresholdTable}>
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Anomaly Arbitration<br/><span>50% weight · lower is better</span></th>
                  <th>Apocalyptic Shadow<br/><span>30% weight · higher is better</span></th>
                  <th>Pure Fiction<br/><span>20% weight · higher is better</span></th>
                </tr>
              </thead>
              <tbody>
                {[
                  { tier: 'T0',   aa: '≤ 1 cycle',   as: '≥ 3,551',         pf: '≥ 40,000'         },
                  { tier: 'T0.5', aa: '2 cycles',     as: '3,401 – 3,550',   pf: '35,001 – 39,999'  },
                  { tier: 'T1',   aa: '3 cycles',     as: '3,251 – 3,400',   pf: '32,001 – 35,000'  },
                  { tier: 'T1.5', aa: '4 cycles',     as: '3,100 – 3,250',   pf: '28,001 – 32,000'  },
                  { tier: 'T2',   aa: '5 cycles',     as: '3,101 – 3,200',   pf: '25,001 – 28,000'  },
                  { tier: 'T3',   aa: '≥ 6 cycles',   as: '< 3,100',         pf: '< 25,001'         },
                  { tier: 'T4',   aa: 'not ranked',   as: 'not ranked',       pf: 'not ranked'       },
                ].map(({ tier, aa, as: asVal, pf }) => (
                  <tr key={tier}>
                    <td className={styles.thresholdTier}>{tier}</td>
                    <td>{aa}</td>
                    <td>{asVal}</td>
                    <td>{pf}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p style={{ marginTop: 14, marginBottom: 4, fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
              Step 2 — Each tier converts to a numeric score:
            </p>
            <div className={styles.scoreMapRow}>
              {[['T0','6'],['T0.5','5'],['T1','4'],['T1.5','3'],['T2','2'],['T3','1'],['T4 / not ranked','0']].map(([t,s]) => (
                <div key={t} className={styles.scoreChip}><strong>{t}</strong>= {s} pts</div>
              ))}
            </div>

            <p style={{ marginTop: 14, marginBottom: 4, fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
              Step 3 — Weighted score formula:
            </p>
            <div className={styles.formula}>
              Score = <span>AA score × 0.50</span> + <span>AS score × 0.30</span> + <span>PF score × 0.20</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 14px' }}>
              Example: T0 in AA (6 pts) + T0.5 in AS (5 pts) + T1 in PF (4 pts) → 6×0.5 + 5×0.3 + 4×0.2 = <strong>3.0 + 1.5 + 0.8 = 5.3</strong> → T0
            </p>

            <p style={{ marginBottom: 4, fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
              Step 4 — Final weighted score is binned into Overall tiers:
            </p>
            <div className={styles.finalBins}>
              {[['T0','≥ 5'],['T0.5','4 – 5'],['T1','3 – 4'],['T1.5','2 – 3'],['T2','1 – 2'],['T3','< 1']].map(([t,d]) => (
                <div key={t} className={styles.binChip}><strong>{t}</strong>{d}</div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.description}>
          <div className={styles.descriptionBody}>
            <h3>How is the Tier List designed?</h3>
            <ul>
              <li>Characters are ranked by their <strong>{config.aggregation} end game score</strong> at <strong>Eidolon 0</strong>{config.lowerIsBetter ? ' — lower is better' : ''}. Only characters with at least 30 qualifying team records are shown.</li>
              <li>Tier thresholds are <strong>relative to the patch</strong> — if no character reaches a higher bracket, the next bracket becomes T0. If T0 has fewer than 3 characters, it is merged with T0.5 into a single T0 row.</li>
              <li><strong>Team inclusion:</strong> Only teams where <strong>every Limited 5★ character is at E0</strong> are counted. Any team with a Limited 5★ at E1 or above is excluded — ensuring results reflect accessible, non-whale investment.</li>
              <li>Use the <strong>Patch</strong> dropdown to view a specific version, <strong>Exclude Characters</strong> to remove specific units, and tick <strong>Signature LC only</strong> to narrow results to teams using the character's signature light cone.</li>
            </ul>
          </div>
        </div>
      )}

      <div className={styles.tierLevelsBar}>
        {config.tierLevels.map(t => (
          <span key={t.label} className={styles.tierLevelChip}>
            <strong>{t.label}</strong> {t.desc}
          </span>
        ))}
      </div>

      <TierPanel key={mode} mode={mode} characters={characters} />
    </div>
  )
}
