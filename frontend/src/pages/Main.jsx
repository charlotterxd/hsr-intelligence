import React, { useState, useEffect, Suspense, lazy } from 'react'
import pureFictionBanner from '../assets/banner/purefiction_banner.png'
import charlotterIcon from '../assets/profile_charlotter.png'
import apocalypticShadowBanner from '../assets/banner/apocalypticshadow_banner.png'
import aaBanner from '../assets/banner/aa_banner.png'
import mocBanner from '../assets/banner/moc_banner.png'
import asScoreTrendChibi from '../assets/chibi/scoretrend_as.png'
import asCostAnalysisChibi from '../assets/chibi/costanalysis_as.png'
import asSurvivalChibi from '../assets/chibi/survival_as.png'
import pfScoreTrendChibi from '../assets/chibi/scoretrend_pf.png'
import pfCostAnalysisChibi from '../assets/chibi/costanalysis_pf.png'
import pfSurvivalChibi from '../assets/chibi/survival_pf.png'
import mocScoreTrendChibi from '../assets/chibi/scoretrend_moc.png'
import mocCostAnalysisChibi from '../assets/chibi/costanalysis_moc.png'
import mocSurvivalChibi from '../assets/chibi/survival_moc.png'
import aaScoreTrendChibi from '../assets/chibi/scoretrend_aa.webp'
import aaCycleAnalysisChibi from '../assets/chibi/cycleanalysis_aa.webp'
import aaCostAnalysisChibiAA from '../assets/chibi/costanalysis_aa.webp'
import executePlsChibi from '../assets/chibi/execute_pls.webp'
import pfUsageTrendChibi from '../assets/chibi/usagetrend_pf.png'
import asUsageTrendChibi from '../assets/chibi/usagetrend_as.png'
import mocUsageTrendChibi from '../assets/chibi/usagetrend_moc.png'
import aaUsageTrendChibi from '../assets/chibi/usagetrend_aa.png'
import { getTrends, getCharacters, getAADistribution } from '../api'
import FilterRow from '../components/FilterRow'
import AADistributionGrid from '../components/AADistributionGrid'
import AAHardModeStats from '../components/AAHardModeStats'
import AAPeasantModeStats from '../components/AAPeasantModeStats'
import Methodologies from '../components/Methodologies'
import TierList from '../components/TierList'
import Home from '../components/Home'
import styles from './Main.module.css'

const TrendChart = lazy(() => import('../components/TrendChart'))
const CostAnalysis = lazy(() => import('../components/CostAnalysis'))
const SurvivalAnalysis = lazy(() => import('../components/SurvivalAnalysis'))
const UsageTrend = lazy(() => import('../components/UsageTrend'))

const COLORS = ['var(--accent)', '#82ca9d', '#ff7c43', '#a05195', '#ffa600']

const createLineConfig = (id, colorIndex) => ({
  id,
  lineName: `Line ${id + 1}`,
  lineColor: COLORS[colorIndex % COLORS.length],
  filters: [
    { name: '', eidolon: 0, signature_lc_mode: 'both' },
    { name: '', eidolon: 0, signature_lc_mode: 'both' },
    { name: '', eidolon: 0, signature_lc_mode: 'both' },
    { name: '', eidolon: 0, signature_lc_mode: 'both' }
  ],
  excludedCharacters: [],
  sustain: 'Both',
  aggregation: 'mean'
})

export default function Main() {
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [gameMode, setGameMode] = useState('home')
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 768)
  const [activeTab, setActiveTab] = useState('trends')
  const [statisticsSubTab, setStatisticsSubTab] = useState('peasant')
  const [lineConfigs, setLineConfigs] = useState([createLineConfig(0, 0)])
  const [allTrends, setAllTrends] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [characters, setCharacters] = useState([])
  const [loadingChars, setLoadingChars] = useState(true)

  // AA-specific state
  const [aaFloorType, setAaFloorType] = useState('knights')
  const [aaCycleTrends, setAaCycleTrends] = useState([])
  const [aaTrendsKnights, setAaTrendsKnights] = useState([])
  const [aaTrendsKingNormal, setAaTrendsKingNormal] = useState([])
  const [aaLoading, setAaLoading] = useState(false)
  const [aaError, setAaError] = useState(null)

  useEffect(() => {
    const loadCharacters = async () => {
      try {
        const data = await getCharacters()
        setCharacters(data || [])
      } catch (err) {
        console.error('Failed to load characters:', err)
      } finally {
        setLoadingChars(false)
      }
    }
    loadCharacters()
  }, [])

  useEffect(() => {
    // Reset state when switching game modes
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSidebarOpen(false)
    }
    setActiveTab(gameMode === 'anomalyArbitration' ? 'statistics' : 'trends')
    setLineConfigs([createLineConfig(0, 0)])
    setAllTrends([])
    setAaCycleTrends([])
    setAaTrendsKnights([])
    setAaTrendsKingNormal([])
    setError(null)
    setAaError(null)
  }, [gameMode])

  const handleLineChange = (id, newConfig) => {
    setLineConfigs(lineConfigs.map(lc => lc.id === id ? newConfig : lc))
  }

  const handleRemoveLine = (id) => {
    if (lineConfigs.length > 1) {
      setLineConfigs(lineConfigs.filter(lc => lc.id !== id))
    }
  }

  const handleCopyLine = (id) => {
    if (lineConfigs.length < 5) {
      const sourceLine = lineConfigs.find(lc => lc.id === id)
      if (sourceLine) {
        const newId = Math.max(...lineConfigs.map(lc => lc.id), -1) + 1
        const newLine = {
          ...sourceLine,
          id: newId,
          lineName: `${sourceLine.lineName} (copy)`
        }
        const insertIndex = lineConfigs.findIndex(lc => lc.id === id) + 1
        setLineConfigs([...lineConfigs.slice(0, insertIndex), newLine, ...lineConfigs.slice(insertIndex)])
      }
    }
  }

  const handleAddLine = () => {
    if (lineConfigs.length < 5) {
      const newId = Math.max(...lineConfigs.map(lc => lc.id), -1) + 1
      setLineConfigs([...lineConfigs, createLineConfig(newId, lineConfigs.length)])
    }
  }

  const handleExecute = async () => {
    const filledLines = lineConfigs.filter(lc => lc.filters.some(f => f.name))

    if (filledLines.length === 0) {
      setError('Please select at least one character in any line')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (gameMode === 'anomalyArbitration') {
        // For AA, fetch both floor types in parallel
        const trendPromises = filledLines.map(lc => {
          const filledFilters = lc.filters.filter(f => f.name)
          return Promise.all([
            getTrends({
              characters: filledFilters,
              exclude_characters: lc.excludedCharacters,
              sustain_filter: lc.sustain,
              aggregation: lc.aggregation,
              floor_type: 'knights'
            }, gameMode),
            getTrends({
              characters: filledFilters,
              exclude_characters: lc.excludedCharacters,
              sustain_filter: lc.sustain,
              aggregation: lc.aggregation,
              floor_type: 'king_normal'
            }, gameMode)
          ]).then(([knightsData, kingData]) => ({
            id: lc.id,
            label: lc.lineName,
            color: lc.lineColor,
            knightsData: knightsData || [],
            kingData: kingData || []
          }))
        })

        const results = await Promise.all(trendPromises)
        // Transform for display - create separate trend arrays for each floor type
        const knightsResults = results.map(r => ({
          id: r.id,
          label: r.label,
          color: r.color,
          data: r.knightsData
        }))
        const kingResults = results.map(r => ({
          id: r.id,
          label: r.label,
          color: r.color,
          data: r.kingData
        }))
        setAaTrendsKnights(knightsResults)
        setAaTrendsKingNormal(kingResults)
      } else {
        const promises = filledLines.map(lc => {
          const filledFilters = lc.filters.filter(f => f.name)
          return getTrends({
            characters: filledFilters,
            exclude_characters: lc.excludedCharacters,
            sustain_filter: lc.sustain,
            aggregation: lc.aggregation
          }, gameMode).then(data => ({
            id: lc.id,
            label: lc.lineName,
            color: lc.lineColor,
            data: data || []
          }))
        })

        const results = await Promise.all(promises)
        setAllTrends(results)
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch trends')
    } finally {
      setLoading(false)
    }
  }

  const handleCycleAnalysisExecute = async () => {
    const filledLines = lineConfigs.filter(lc => lc.filters.some(f => f.name))

    if (filledLines.length === 0) {
      setAaError('Please select at least one character in any line')
      return
    }

    setAaLoading(true)
    setAaError(null)

    try {
      const promises = filledLines.map(lc => {
        const filledFilters = lc.filters.filter(f => f.name)
        return getAADistribution(aaFloorType, {
          character_names: filledFilters.map(f => f.name),
          eidolons: filledFilters.map(f => f.eidolon),
          signature_lc_modes: filledFilters.map(f => f.signature_lc_mode),
          sustain_filter: lc.sustain
        }).then(data => ({
          id: lc.id,
          label: lc.lineName,
          color: lc.lineColor,
          data: data || []
        }))
      })

      const results = await Promise.all(promises)
      setAaCycleTrends(results)
    } catch (err) {
      setAaError(err.message || 'Failed to fetch cycle analysis')
    } finally {
      setAaLoading(false)
    }
  }

  const hasCharacters = lineConfigs.some(lc => lc.filters.some(f => f.name))
  const canAddLine = lineConfigs.length < 5

  return (
    <div className={styles.mainLayout} data-theme={isDarkMode ? 'dark' : 'light'}>
      <div className={styles.topBar}>
        {/* Theme toggle hidden — isDarkMode state kept for future use */}
        <div className={styles.topBarCreator}>
          <img src={charlotterIcon} alt="Charlotter" className={styles.topBarCreatorIcon} />
          {sidebarOpen && (
            <div className={styles.topBarCreatorText}>
              <span className={styles.topBarCreatorLabel}>Created by:</span>
              <span className={styles.topBarCreatorName}>Charlotter</span>
              <span className={styles.topBarCreatorSub}>ft. Claude Code</span>
            </div>
          )}
        </div>
        <a href="https://discord.com/users/charlotterxd" target="_blank" rel="noopener noreferrer" className={styles.discordLink}>
          <img src="/src/assets/discord.png" alt="Discord" className={styles.discordIcon} />
        </a>
      </div>

      <div style={{ display: 'flex', minHeight: '100%' }}>
        {sidebarOpen && (
          <div className={styles.sidebarBackdrop} onClick={() => setSidebarOpen(false)} />
        )}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
        <div className={styles.sidebarContent}>
          {sidebarOpen && (
            <>
              <h2 className={styles.sidebarTitle}>Home</h2>
              <nav className={styles.modeNav}>
                <button
                  className={`${styles.modeTab} ${gameMode === 'home' ? styles.activeModeTab : ''}`}
                  onClick={() => setGameMode('home')}
                >
                  Home
                </button>
              </nav>
              <h2 className={styles.sidebarTitle} style={{ marginTop: '20px' }}>Game Mode</h2>
              <nav className={styles.modeNav}>
                <button
                  className={`${styles.modeTab} ${gameMode === 'memoryOfChaos' ? styles.activeModeTab : ''}`}
                  onClick={() => setGameMode('memoryOfChaos')}
                >
                  Memory of Chaos
                </button>
                <button
                  className={`${styles.modeTab} ${gameMode === 'pureFiction' ? styles.activeModeTab : ''}`}
                  onClick={() => setGameMode('pureFiction')}
                >
                  Pure Fiction
                </button>
                <button
                  className={`${styles.modeTab} ${gameMode === 'apocalypticShadow' ? styles.activeModeTab : ''}`}
                  onClick={() => setGameMode('apocalypticShadow')}
                >
                  Apocalyptic Shadow
                </button>
                <button
                  className={`${styles.modeTab} ${gameMode === 'anomalyArbitration' ? styles.activeModeTab : ''}`}
                  onClick={() => setGameMode('anomalyArbitration')}
                >
                  Anomaly Arbitration
                </button>
                <div className={styles.sidebarSection}>Resources</div>
                <button
                  className={`${styles.modeTab} ${gameMode === 'tierList' ? styles.activeModeTab : ''}`}
                  onClick={() => setGameMode('tierList')}
                >
                  Tier List
                </button>
                <button
                  className={`${styles.modeTab} ${gameMode === 'methodologies' ? styles.activeModeTab : ''}`}
                  onClick={() => setGameMode('methodologies')}
                >
                  Methodologies
                </button>
              </nav>
            </>
          )}
        </div>
      </aside>

      <button
        className={styles.sidebarToggle}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        style={{ left: sidebarOpen ? '220px' : '80px' }}
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>

      <div className={styles.container}>
        {gameMode === 'pureFiction' && (
          <>
            <header className={styles.header}>
              <img src={pureFictionBanner} alt="Pure Fiction" className={styles.bannerImage} />
            </header>

            <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'trends' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          Score Trend
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'cost' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('cost')}
        >
          Cost Analysis
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'survival' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('survival')}
        >
          Survival Analysis
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'usage' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('usage')}
        >
          Usage Trend
        </button>
      </div>

      {activeTab === 'trends' && (
        <>
          <div className={styles.description}>
            <img src={pfScoreTrendChibi} alt="" className={styles.descriptionChibi} />
            <div className={styles.descriptionBody}>
              <h3>📊 How to Use Score Trend</h3>
              <p>Select up to 4 characters per line and add multiple lines to compare team compositions. The chart shows average Pure Fiction scores across different patches. Use filters to customize by eidolon level, signature weapon, and sustain requirements.</p>
            </div>
          </div>
          <div className={styles.filterArea}>
            {!loadingChars && (
              <>
                <div className={styles.filterRows}>
                  {lineConfigs.map((lc) => (
                    <FilterRow
                      key={lc.id}
                      lineId={lc.id}
                      lineConfig={lc}
                      onLineChange={(newConfig) => handleLineChange(lc.id, newConfig)}
                      allCharacters={characters}
                      selectedNamesInLine={lc.filters.map(f => f.name).filter(Boolean)}
                      onRemove={handleRemoveLine}
                      onCopy={handleCopyLine}
                      canRemove={lineConfigs.length > 1}
                      canCopy={lineConfigs.length < 5}
                    />
                  ))}
                </div>

                <div className={styles.filterButtons}>
                  <button
                    onClick={handleAddLine}
                    disabled={!canAddLine}
                    className={styles.addLineButton}
                  >
                    + Add Line
                  </button>
                  <button
                    onClick={handleExecute}
                    disabled={!hasCharacters || loading}
                    className={styles.executeButton}
                  >
                    {loading ? 'Loading...' : 'Execute'}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className={styles.chartArea}>
            {error && <div className={styles.error}>{error}</div>}
            {loading && <div className={styles.loading}>Loading trends...</div>}

            {!loading && !error && allTrends.length > 0 && (
              <Suspense fallback={<div>Loading chart...</div>}>
                <TrendChart lines={allTrends} gameMode={gameMode} isDarkMode={isDarkMode} />
              </Suspense>
            )}

            {!loading && !error && allTrends.length === 0 && hasCharacters && (
              <div className={styles.empty}>
                <img src={executePlsChibi} alt="" style={{ height: "120px", objectFit: "contain", marginBottom: "12px" }} />
                Click <strong>Execute</strong> to view score trends
              </div>
            )}

            {!hasCharacters && !loading && (
              <div className={styles.empty}>
                <img src={executePlsChibi} alt="" style={{ height: "120px", objectFit: "contain", marginBottom: "12px" }} />
                Select characters above to get started
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'cost' && !loadingChars && (
        <Suspense fallback={<div>Loading cost analysis...</div>}>
          <CostAnalysis characters={characters} gameMode={gameMode} isDarkMode={isDarkMode} onNavigateToMethodologies={() => setGameMode('methodologies')} chibiImage={pfCostAnalysisChibi} />
        </Suspense>
      )}

      {activeTab === 'survival' && !loadingChars && (
        <Suspense fallback={<div>Loading survival analysis...</div>}>
          <SurvivalAnalysis characters={characters} gameMode={gameMode} isDarkMode={isDarkMode} chibiImage={pfSurvivalChibi} />
        </Suspense>
      )}

      {activeTab === 'usage' && !loadingChars && (
        <Suspense fallback={<div>Loading usage trend...</div>}>
          <UsageTrend characters={characters} gameMode={gameMode} isDarkMode={isDarkMode} chibiImage={pfUsageTrendChibi} />
        </Suspense>
      )}
          </>
        )}

        {gameMode === 'apocalypticShadow' && (
          <>
            <header className={styles.header}>
              <img src={apocalypticShadowBanner} alt="Apocalyptic Shadow" className={styles.asBannerImage} />
            </header>

            <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'trends' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          Score Trend
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'cost' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('cost')}
        >
          Cost Analysis
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'survival' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('survival')}
        >
          Survival Analysis
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'usage' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('usage')}
        >
          Usage Trend
        </button>
      </div>

      {activeTab === 'trends' && (
        <>
          <div className={styles.description}>
            <img src={asScoreTrendChibi} alt="" className={styles.descriptionChibi} />
            <div className={styles.descriptionBody}>
              <h3>📊 How to Use Score Trend</h3>
              <p>Select up to 4 characters per line and add multiple lines to compare team compositions. The chart shows average Apocalyptic Shadow scores across different patches. Use filters to customize by eidolon level, signature weapon, and sustain requirements.</p>
            </div>
          </div>
          <div className={styles.filterArea}>
            {!loadingChars && (
              <>
                <div className={styles.filterRows}>
                  {lineConfigs.map((lc) => (
                    <FilterRow
                      key={lc.id}
                      lineId={lc.id}
                      lineConfig={lc}
                      onLineChange={(newConfig) => handleLineChange(lc.id, newConfig)}
                      allCharacters={characters}
                      selectedNamesInLine={lc.filters.map(f => f.name).filter(Boolean)}
                      onRemove={handleRemoveLine}
                      onCopy={handleCopyLine}
                      canRemove={lineConfigs.length > 1}
                      canCopy={lineConfigs.length < 5}
                    />
                  ))}
                </div>

                <div className={styles.filterButtons}>
                  <button
                    onClick={handleAddLine}
                    disabled={!canAddLine}
                    className={styles.addLineButton}
                  >
                    + Add Line
                  </button>
                  <button
                    onClick={handleExecute}
                    disabled={!hasCharacters || loading}
                    className={styles.executeButton}
                  >
                    {loading ? 'Loading...' : 'Execute'}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className={styles.chartArea}>
            {error && <div className={styles.error}>{error}</div>}
            {loading && <div className={styles.loading}>Loading trends...</div>}

            {!loading && !error && allTrends.length > 0 && (
              <Suspense fallback={<div>Loading chart...</div>}>
                <TrendChart lines={allTrends} gameMode={gameMode} isDarkMode={isDarkMode} />
              </Suspense>
            )}

            {!loading && !error && allTrends.length === 0 && hasCharacters && (
              <div className={styles.empty}>
                <img src={executePlsChibi} alt="" style={{ height: "120px", objectFit: "contain", marginBottom: "12px" }} />
                Click <strong>Execute</strong> to view score trends
              </div>
            )}

            {!hasCharacters && !loading && (
              <div className={styles.empty}>
                <img src={executePlsChibi} alt="" style={{ height: "120px", objectFit: "contain", marginBottom: "12px" }} />
                Select characters above to get started
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'cost' && !loadingChars && (
        <Suspense fallback={<div>Loading cost analysis...</div>}>
          <CostAnalysis characters={characters} gameMode={gameMode} isDarkMode={isDarkMode} onNavigateToMethodologies={() => setGameMode('methodologies')} chibiImage={asCostAnalysisChibi} />
        </Suspense>
      )}

      {activeTab === 'survival' && !loadingChars && (
        <Suspense fallback={<div>Loading survival analysis...</div>}>
          <SurvivalAnalysis characters={characters} gameMode={gameMode} isDarkMode={isDarkMode} chibiImage={asSurvivalChibi} />
        </Suspense>
      )}

      {activeTab === 'usage' && !loadingChars && (
        <Suspense fallback={<div>Loading usage trend...</div>}>
          <UsageTrend characters={characters} gameMode={gameMode} isDarkMode={isDarkMode} chibiImage={asUsageTrendChibi} />
        </Suspense>
      )}
          </>
        )}

        {gameMode === 'memoryOfChaos' && (
          <>
            <header className={styles.header}>
              <img src={mocBanner} alt="Memory of Chaos" className={styles.mocBannerImage} />
            </header>

            <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'trends' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          Score Trend
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'cost' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('cost')}
        >
          Cost Analysis
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'survival' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('survival')}
        >
          Survival Analysis
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'usage' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('usage')}
        >
          Usage Trend
        </button>
      </div>

      {activeTab === 'trends' && (
        <>
          <div className={styles.description}>
            <img src={mocScoreTrendChibi} alt="" className={styles.descriptionChibi} />
            <div className={styles.descriptionBody}>
              <h3>📊 How to Use Score Trend</h3>
              <p>Select up to 4 characters per line and add multiple lines to compare team compositions. The chart shows average Memory of Chaos scores across different patches. Use filters to customize by eidolon level, signature weapon, and sustain requirements.</p>
            </div>
          </div>
          <div className={styles.filterArea}>
            {!loadingChars && (
              <>
                <div className={styles.filterRows}>
                  {lineConfigs.map((lc) => (
                    <FilterRow
                      key={lc.id}
                      lineId={lc.id}
                      lineConfig={lc}
                      onLineChange={(newConfig) => handleLineChange(lc.id, newConfig)}
                      allCharacters={characters}
                      selectedNamesInLine={lc.filters.map(f => f.name).filter(Boolean)}
                      onRemove={handleRemoveLine}
                      onCopy={handleCopyLine}
                      canRemove={lineConfigs.length > 1}
                      canCopy={lineConfigs.length < 5}
                    />
                  ))}
                </div>

                <div className={styles.filterButtons}>
                  <button
                    onClick={handleAddLine}
                    disabled={!canAddLine}
                    className={styles.addLineButton}
                  >
                    + Add Line
                  </button>
                  <button
                    onClick={handleExecute}
                    disabled={!hasCharacters || loading}
                    className={styles.executeButton}
                  >
                    {loading ? 'Loading...' : 'Execute'}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className={styles.chartArea}>
            {error && <div className={styles.error}>{error}</div>}
            {loading && <div className={styles.loading}>Loading trends...</div>}

            {!loading && !error && allTrends.length > 0 && (
              <Suspense fallback={<div>Loading chart...</div>}>
                <TrendChart lines={allTrends} gameMode={gameMode} isDarkMode={isDarkMode} />
              </Suspense>
            )}

            {!loading && !error && allTrends.length === 0 && hasCharacters && (
              <div className={styles.empty}>
                <img src={executePlsChibi} alt="" style={{ height: "120px", objectFit: "contain", marginBottom: "12px" }} />
                Click <strong>Execute</strong> to view score trends
              </div>
            )}

            {!hasCharacters && !loading && (
              <div className={styles.empty}>
                <img src={executePlsChibi} alt="" style={{ height: "120px", objectFit: "contain", marginBottom: "12px" }} />
                Select characters above to get started
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'cost' && !loadingChars && (
        <Suspense fallback={<div>Loading cost analysis...</div>}>
          <CostAnalysis characters={characters} gameMode={gameMode} isDarkMode={isDarkMode} onNavigateToMethodologies={() => setGameMode('methodologies')} chibiImage={mocCostAnalysisChibi} />
        </Suspense>
      )}

      {activeTab === 'survival' && !loadingChars && (
        <Suspense fallback={<div>Loading survival analysis...</div>}>
          <SurvivalAnalysis characters={characters} gameMode={gameMode} isDarkMode={isDarkMode} chibiImage={mocSurvivalChibi} />
        </Suspense>
      )}

      {activeTab === 'usage' && !loadingChars && (
        <Suspense fallback={<div>Loading usage trend...</div>}>
          <UsageTrend characters={characters} gameMode={gameMode} isDarkMode={isDarkMode} chibiImage={mocUsageTrendChibi} />
        </Suspense>
      )}
          </>
        )}

        {gameMode === 'anomalyArbitration' && (
          <>
            <header className={styles.header}>
              <img src={aaBanner} alt="Anomaly Arbitration" className={styles.aaBannerImage} />
            </header>

            <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'statistics' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          Statistics
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'trends' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          Score Trend
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'cycles' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('cycles')}
        >
          Cycle Analysis
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'costAnalysis' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('costAnalysis')}
        >
          Cost Analysis
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'usage' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('usage')}
        >
          Usage Trend
        </button>
      </div>

      {activeTab === 'trends' && (
        <>
          <div className={styles.description}>
            <img src={aaScoreTrendChibi} alt="" className={styles.descriptionChibi} />
            <div className={styles.descriptionBody}>
              <h3>📊 How to Use Score Trend</h3>
              <p>Select up to 4 characters per line and add multiple lines to compare team compositions. The chart shows average Anomaly Arbitration scores across different patches. Use filters to customize by eidolon level, signature weapon, and sustain requirements.</p>
            </div>
          </div>
          <div className={styles.filterArea}>
            {!loadingChars && (
              <>
                <div className={styles.filterRows}>
                  {lineConfigs.map((lc) => (
                    <FilterRow
                      key={lc.id}
                      lineId={lc.id}
                      lineConfig={lc}
                      onLineChange={(newConfig) => handleLineChange(lc.id, newConfig)}
                      allCharacters={characters}
                      selectedNamesInLine={lc.filters.map(f => f.name).filter(Boolean)}
                      onRemove={handleRemoveLine}
                      onCopy={handleCopyLine}
                      canRemove={lineConfigs.length > 1}
                      canCopy={lineConfigs.length < 5}
                    />
                  ))}
                </div>

                <div className={styles.filterButtons}>
                  <button
                    onClick={handleAddLine}
                    disabled={!canAddLine}
                    className={styles.addLineButton}
                  >
                    + Add Line
                  </button>
                  <button
                    onClick={handleExecute}
                    disabled={!hasCharacters || loading}
                    className={styles.executeButton}
                  >
                    {loading ? 'Loading...' : 'Execute'}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className={styles.chartArea}>
            {error && <div className={styles.error}>{error}</div>}
            {loading && <div className={styles.loading}>Loading trends...</div>}

            {!loading && !error && aaTrendsKnights.length > 0 && (
              <div className={styles.grid}>
                <div className={styles.chartBox}>
                  <h3>Knights (Floors 1-3)</h3>
                  <Suspense fallback={<div>Loading chart...</div>}>
                    <TrendChart lines={aaTrendsKnights} gameMode={gameMode} isDarkMode={isDarkMode} />
                  </Suspense>
                </div>
                <div className={styles.chartBox}>
                  <h3>King in Check (Normal)</h3>
                  <Suspense fallback={<div>Loading chart...</div>}>
                    <TrendChart lines={aaTrendsKingNormal} gameMode={gameMode} isDarkMode={isDarkMode} />
                  </Suspense>
                </div>
              </div>
            )}

            {!loading && !error && aaTrendsKnights.length === 0 && hasCharacters && (
              <div className={styles.empty}>
                <img src={executePlsChibi} alt="" style={{ height: "120px", objectFit: "contain", marginBottom: "12px" }} />
                Click <strong>Execute</strong> to view score trends
              </div>
            )}

            {!hasCharacters && !loading && (
              <div className={styles.empty}>
                <img src={executePlsChibi} alt="" style={{ height: "120px", objectFit: "contain", marginBottom: "12px" }} />
                Select characters above to get started
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'cycles' && (
        <>
          <div className={styles.description}>
            <img src={aaCycleAnalysisChibi} alt="" className={styles.descriptionChibi} />
            <div className={styles.descriptionBody}>
              <h3>📊 How to Use Cycle Analysis</h3>
              <p>Select up to 4 characters per line and add multiple lines to compare team compositions. The 2x2 grid shows the percentage of teams clearing with different cycle ranges.</p>
            </div>
          </div>

          <div className={styles.filterArea}>
            {!loadingChars && (
              <>
                <div className={styles.filterRows}>
                  {lineConfigs.map((lc) => (
                    <FilterRow
                      key={lc.id}
                      lineId={lc.id}
                      lineConfig={lc}
                      onLineChange={(newConfig) => handleLineChange(lc.id, newConfig)}
                      allCharacters={characters}
                      selectedNamesInLine={lc.filters.map(f => f.name).filter(Boolean)}
                      onRemove={handleRemoveLine}
                      onCopy={handleCopyLine}
                      canRemove={lineConfigs.length > 1}
                      canCopy={lineConfigs.length < 5}
                    />
                  ))}
                </div>

                <div className={styles.filterButtons}>
                  <select
                    value={aaFloorType}
                    onChange={(e) => setAaFloorType(e.target.value)}
                    title="Select floor type"
                    className={styles.headerSelect}
                    style={{ marginRight: '12px' }}
                  >
                    <option value="knights">Knights (Floors 1-3)</option>
                    <option value="king_normal">King in Check (Normal)</option>
                  </select>
                  <button
                    onClick={handleAddLine}
                    disabled={lineConfigs.length >= 5}
                    className={styles.addLineButton}
                  >
                    + Add Line
                  </button>
                  <button
                    onClick={handleCycleAnalysisExecute}
                    disabled={!hasCharacters || aaLoading}
                    className={styles.executeButton}
                  >
                    {aaLoading ? 'Loading...' : 'Execute'}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className={styles.chartArea} style={{ minHeight: 'auto' }}>
            {aaError && <div className={styles.error}>{aaError}</div>}
            {aaLoading && <div className={styles.loading}>Loading cycle analysis...</div>}

            {!aaLoading && !aaError && aaCycleTrends.length > 0 && (
              <div className={styles.grid}>
                <div className={styles.chartBox}>
                  <h3>0 Cycles (%)</h3>
                  <Suspense fallback={<div>Loading chart...</div>}>
                    <TrendChart
                      lines={aaCycleTrends.map(line => ({
                        ...line,
                        data: line.data.map(d => ({
                          version: d.version,
                          score: d.bin_0,
                          count: 0
                        }))
                      }))}
                      gameMode={gameMode}
                      isPercentage={true}
                      isDarkMode={isDarkMode}
                    />
                  </Suspense>
                </div>
                <div className={styles.chartBox}>
                  <h3>1-2 Cycles (%)</h3>
                  <Suspense fallback={<div>Loading chart...</div>}>
                    <TrendChart
                      lines={aaCycleTrends.map(line => ({
                        ...line,
                        data: line.data.map(d => ({
                          version: d.version,
                          score: d.bin_1_2,
                          count: 0
                        }))
                      }))}
                      gameMode={gameMode}
                      isPercentage={true}
                      isDarkMode={isDarkMode}
                    />
                  </Suspense>
                </div>
                <div className={styles.chartBox}>
                  <h3>3-4 Cycles (%)</h3>
                  <Suspense fallback={<div>Loading chart...</div>}>
                    <TrendChart
                      lines={aaCycleTrends.map(line => ({
                        ...line,
                        data: line.data.map(d => ({
                          version: d.version,
                          score: d.bin_3_4,
                          count: 0
                        }))
                      }))}
                      gameMode={gameMode}
                      isPercentage={true}
                      isDarkMode={isDarkMode}
                    />
                  </Suspense>
                </div>
                <div className={styles.chartBox}>
                  <h3>5-6 Cycles (%)</h3>
                  <Suspense fallback={<div>Loading chart...</div>}>
                    <TrendChart
                      lines={aaCycleTrends.map(line => ({
                        ...line,
                        data: line.data.map(d => ({
                          version: d.version,
                          score: d.bin_5_6,
                          count: 0
                        }))
                      }))}
                      gameMode={gameMode}
                      isPercentage={true}
                      isDarkMode={isDarkMode}
                    />
                  </Suspense>
                </div>
              </div>
            )}

            {!aaLoading && !aaError && aaCycleTrends.length === 0 && hasCharacters && (
              <div className={styles.empty}>
                <img src={executePlsChibi} alt="" style={{ height: "120px", objectFit: "contain", marginBottom: "12px" }} />
                Click <strong>Execute</strong> to view cycle analysis
              </div>
            )}

            {!hasCharacters && !aaLoading && (
              <div className={styles.empty}>
                <img src={executePlsChibi} alt="" style={{ height: "120px", objectFit: "contain", marginBottom: "12px" }} />
                Select characters above to get started
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'statistics' && !loadingChars && (
        <>
          <div className={styles.subTabBar}>
            <button
              className={`${styles.subTab} ${statisticsSubTab === 'peasant' ? styles.activeSubTab : ''}`}
              onClick={() => setStatisticsSubTab('peasant')}
            >
              Peasant Mode
            </button>
            <button
              className={`${styles.subTab} ${statisticsSubTab === 'hardMode' ? styles.activeSubTab : ''}`}
              onClick={() => setStatisticsSubTab('hardMode')}
            >
              Hard Mode
            </button>
          </div>

          {statisticsSubTab === 'peasant' && (
            <AAPeasantModeStats />
          )}

          {statisticsSubTab === 'hardMode' && (
            <AAHardModeStats characters={characters} />
          )}
        </>
      )}

      {activeTab === 'costAnalysis' && !loadingChars && (
        <Suspense fallback={<div>Loading cost analysis...</div>}>
          <CostAnalysis characters={characters} gameMode={gameMode} isDarkMode={isDarkMode} onNavigateToMethodologies={() => setGameMode('methodologies')} chibiImage={aaCostAnalysisChibiAA} />
        </Suspense>
      )}

      {activeTab === 'usage' && !loadingChars && (
        <Suspense fallback={<div>Loading usage trend...</div>}>
          <UsageTrend characters={characters} gameMode={gameMode} isDarkMode={isDarkMode} chibiImage={aaUsageTrendChibi} />
        </Suspense>
      )}
          </>
        )}
        {gameMode === 'home' && (
          <Home onNavigate={setGameMode} />
        )}

        {gameMode === 'methodologies' && (
          <Methodologies />
        )}

        {gameMode === 'tierList' && (
          <TierList characters={characters} />
        )}
      </div>
      </div>
    </div>
  )
}
