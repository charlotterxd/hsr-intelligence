import React, { useState } from 'react'
import { getAvailablePatches } from '../api'
import styles from './CostAnalysisFilterRow.module.css'

const resolveColor = (c) => {
  if (!c.startsWith('var(')) return c
  const el = document.querySelector('[data-theme]') || document.documentElement
  return getComputedStyle(el).getPropertyValue(c.slice(4, -1).trim()).trim() || '#e040fb'
}

export default function CostAnalysisFilterRow({
  lineId,
  lineConfig,
  onLineChange,
  allCharacters,
  onRemove,
  onCopy,
  canRemove,
  canCopy,
  color,
  gameMode = 'pureFiction'
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [availablePatches, setAvailablePatches] = useState([])

  const dpsCharacters = allCharacters
    .filter(c => c.rarity === 5 && c.role === 'dps')
    .sort((a, b) => a.name.localeCompare(b.name))

  const selected = allCharacters.find(c => c.name === lineConfig.character)

  const filteredChars = searchText
    ? dpsCharacters.filter(c => c.name.toLowerCase().includes(searchText.toLowerCase()))
    : dpsCharacters

  const getImagePath = (characterId) => `/characters/${characterId}.png`

  const handleSelectCharacter = async (charName) => {
    const char = allCharacters.find(c => c.name === charName)
    const defaultEidolon = char && (char.rarity === 4 || char.availability === 'standard') ? -1 : 0
    onLineChange({ ...lineConfig, character: charName, patch_start: '', patch_end: '', eidolon: defaultEidolon })
    setSearchOpen(false)
    setSearchText('')
    try {
      const patches = await getAvailablePatches(charName, gameMode)
      setAvailablePatches(patches)
    } catch (err) {
      console.error('Failed to fetch available patches:', err)
    }
  }

  const getMinValidPatch = () => {
    if (!selected || availablePatches.length === 0) return null

    const releasedPatch = selected.released_patch ? parseFloat(selected.released_patch) : 0
    const oldestDataPatch = parseFloat(availablePatches[0])
    const minValidPatch = Math.max(releasedPatch, oldestDataPatch)

    return availablePatches.find(p => parseFloat(p) >= minValidPatch) || null
  }

  const getFilteredStartPatches = () => {
    const minValidPatch = getMinValidPatch()
    if (!minValidPatch) return availablePatches

    return availablePatches.filter(p => parseFloat(p) >= parseFloat(minValidPatch))
  }

  const handleClearCharacter = () => {
    onLineChange({ ...lineConfig, character: '', patch_start: '', patch_end: '' })
    setAvailablePatches([])
  }

  const availablePatchEnds = lineConfig.patch_start
    ? availablePatches.filter(p => parseFloat(p) >= parseFloat(lineConfig.patch_start))
    : []

  return (
    <div className={styles.filterRow} style={{ borderLeftColor: color }}>
      <div className={styles.lineHeader}>
        <input
          type="text"
          value={lineConfig.lineName}
          onChange={(e) => onLineChange({ ...lineConfig, lineName: e.target.value })}
          placeholder="Line name"
          className={styles.lineNameInput}
        />
        <div className={styles.rowActions}>
          <input
            type="color"
            value={resolveColor(lineConfig.lineColor)}
            onChange={(e) => onLineChange({ ...lineConfig, lineColor: e.target.value })}
            className={styles.colorPicker}
            title="Change line color"
          />
          {canCopy && (
            <button
              onClick={() => onCopy(lineId)}
              className={styles.actionButton}
              title="Copy line"
            >
              📋
            </button>
          )}
          {canRemove && (
            <button
              onClick={() => onRemove(lineId)}
              className={styles.actionButton}
              title="Remove line"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Character Selection - Full Width */}
      <div className={styles.characterGroup}>
        <label className={styles.controlLabel}>Character</label>
        {selected ? (
          <div className={styles.selectedProfile}>
            <img
              src={getImagePath(selected.id)}
              alt={selected.name}
              className={styles.profileImage}
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <div className={styles.profileInfo}>
              <div className={styles.profileName}>{selected.name}</div>
              <div className={styles.profileActions}>
                <button
                  className={styles.changeButton}
                  onClick={() => setSearchOpen(!searchOpen)}
                >
                  Change
                </button>
                <button
                  className={styles.clearButton}
                  onClick={handleClearCharacter}
                >
                  ✕
                </button>
              </div>
            </div>

            {searchOpen && (
              <div className={styles.dropdownContent}>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className={styles.searchInput}
                  autoFocus
                />
                <div className={styles.options}>
                  {filteredChars.map(char => (
                    <div
                      key={char.name}
                      className={styles.option}
                      onClick={() => handleSelectCharacter(char.name)}
                    >
                      {char.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.dropdown}>
            <button
              className={styles.dropdownButton}
              onClick={() => setSearchOpen(!searchOpen)}
            >
              Select DPS...
            </button>

            {searchOpen && (
              <div className={styles.dropdownContent}>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className={styles.searchInput}
                  autoFocus
                />
                <div className={styles.options}>
                  {filteredChars.map(char => (
                    <div
                      key={char.name}
                      className={styles.option}
                      onClick={() => handleSelectCharacter(char.name)}
                    >
                      {char.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Patch Range - Same Line */}
      {(
        <div className={styles.controlsRow}>
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Patch Start</label>
            {selected ? (
              <select
                value={lineConfig.patch_start}
                onChange={(e) => {
                  onLineChange({ ...lineConfig, patch_start: e.target.value, patch_end: '' })
                }}
                className={styles.select}
              >
                <option value="">Select...</option>
                {getFilteredStartPatches().map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Select character first"
                disabled
                className={styles.input}
              />
            )}
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Patch End</label>
            {selected && lineConfig.patch_start ? (
              <select
                value={lineConfig.patch_end}
                onChange={(e) => onLineChange({ ...lineConfig, patch_end: e.target.value })}
                className={styles.select}
              >
                <option value="">Select...</option>
                {availablePatchEnds.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder={lineConfig.patch_start ? 'Select from list' : 'Select start first'}
                disabled
                className={styles.input}
              />
            )}
          </div>
        </div>
      )}

      {/* Filters - Same Line */}
      <div className={styles.controlsRow}>
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Aggregation</label>
          <select
            value={lineConfig.aggregation}
            onChange={(e) => onLineChange({ ...lineConfig, aggregation: e.target.value })}
            className={styles.select}
          >
            <option value="median">Median</option>
            <option value="mean">Mean</option>
          </select>
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Sustain</label>
          <select
            value={lineConfig.sustain}
            onChange={(e) => onLineChange({ ...lineConfig, sustain: e.target.value })}
            className={styles.select}
          >
            <option value="Both">Both</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>

        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={lineConfig.include_standard_eidolons || false}
              onChange={(e) => onLineChange({ ...lineConfig, include_standard_eidolons: e.target.checked })}
              className={styles.checkbox}
            />
            Count Standard & Free-Later Eidolons
          </label>
        </div>
      </div>
    </div>
  )
}
