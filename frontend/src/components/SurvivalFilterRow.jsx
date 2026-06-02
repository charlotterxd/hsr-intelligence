import React, { useState } from 'react'
import styles from './SurvivalFilterRow.module.css'

const resolveColor = (c) => {
  if (!c.startsWith('var(')) return c
  const el = document.querySelector('[data-theme]') || document.documentElement
  return getComputedStyle(el).getPropertyValue(c.slice(4, -1).trim()).trim() || '#e040fb'
}

export default function SurvivalFilterRow({
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

  const rarity5Characters = allCharacters
    .filter(c => c.rarity === 5)
    .sort((a, b) => a.name.localeCompare(b.name))

  const selected = allCharacters.find(c => c.name === lineConfig.character)

  const filteredChars = searchText
    ? rarity5Characters.filter(c => c.name.toLowerCase().includes(searchText.toLowerCase()))
    : rarity5Characters

  const getImagePath = (characterId) => `/characters/${characterId}.png`

  const isAllEidolons = lineConfig.eidolon === -1

  const incrementEidolon = () => {
    if (isAllEidolons) return
    if (lineConfig.eidolon < 6) {
      onLineChange({ ...lineConfig, eidolon: lineConfig.eidolon + 1 })
    }
  }

  const decrementEidolon = () => {
    if (isAllEidolons) {
      onLineChange({ ...lineConfig, eidolon: 6 })
      return
    }
    if (lineConfig.eidolon > 0) {
      onLineChange({ ...lineConfig, eidolon: lineConfig.eidolon - 1 })
    }
  }

  const toggleAllEidolons = () => {
    onLineChange({ ...lineConfig, eidolon: isAllEidolons ? 0 : -1 })
  }

  const handleSelectCharacter = (charName) => {
    const char = allCharacters.find(c => c.name === charName)
    const defaultEidolon = char && (char.rarity === 4 || char.availability === 'standard') ? -1 : 0
    onLineChange({ ...lineConfig, character: charName, eidolon: defaultEidolon })
    setSearchOpen(false)
    setSearchText('')
  }

  const handleClearCharacter = () => {
    onLineChange({ ...lineConfig, character: '' })
  }

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

      {/* Character Selection with Filters - Full Width */}
      <div className={styles.characterGroup}>
        <label className={styles.controlLabel}>Character</label>
        {selected ? (
          <>
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

            {/* Eidolon and Signature inside character box */}
            <div className={styles.characterFilters}>
              <div className={styles.filterSubrow}>
                <div className={styles.controlGroup}>
                  <label className={styles.controlLabel}>Eidolon</label>
                  <div className={styles.eidolonControl}>
                    <button
                      onClick={decrementEidolon}
                      disabled={isAllEidolons || lineConfig.eidolon === 0}
                      className={styles.eidolonButton}
                    >
                      −
                    </button>
                    <span className={styles.eidolonValue}>
                      {isAllEidolons ? 'ALL' : `E${lineConfig.eidolon}`}
                    </span>
                    <button
                      onClick={incrementEidolon}
                      disabled={isAllEidolons || lineConfig.eidolon === 6}
                      className={styles.eidolonButton}
                    >
                      +
                    </button>
                    <button
                      onClick={toggleAllEidolons}
                      className={`${styles.eidolonButton} ${isAllEidolons ? styles.allActive : ''}`}
                      title={isAllEidolons ? 'Click to select specific eidolon' : 'Click to select all eidolons'}
                    >
                      ALL
                    </button>
                  </div>
                </div>

                <div className={styles.controlGroup}>
                  <label className={styles.controlLabel}>Signature LC</label>
                  <div className={styles.signatureLc}>
                    <label className={styles.sigLabel}>
                      <input
                        type="radio"
                        name={`sig-surv-${lineId}`}
                        value="no-signature"
                        checked={(lineConfig.signature_lc_mode || 'both') === 'no-signature'}
                        onChange={() => onLineChange({ ...lineConfig, signature_lc_mode: 'no-signature' })}
                        className={styles.sigRadio}
                      />
                      <span>S0</span>
                    </label>
                    <label className={styles.sigLabel}>
                      <input
                        type="radio"
                        name={`sig-surv-${lineId}`}
                        value="signature"
                        checked={(lineConfig.signature_lc_mode || 'both') === 'signature'}
                        onChange={() => onLineChange({ ...lineConfig, signature_lc_mode: 'signature' })}
                        className={styles.sigRadio}
                      />
                      <span>S1+</span>
                    </label>
                    <label className={styles.sigLabel}>
                      <input
                        type="radio"
                        name={`sig-surv-${lineId}`}
                        value="both"
                        checked={(lineConfig.signature_lc_mode || 'both') === 'both'}
                        onChange={() => onLineChange({ ...lineConfig, signature_lc_mode: 'both' })}
                        className={styles.sigRadio}
                      />
                      <span>Both</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.dropdown}>
            <button
              className={styles.dropdownButton}
              onClick={() => setSearchOpen(!searchOpen)}
            >
              Select character...
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

      {/* Aggregation and Sustain on same line */}
      {selected && (
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
              value={lineConfig.sustain_filter}
              onChange={(e) => onLineChange({ ...lineConfig, sustain_filter: e.target.value })}
              className={styles.select}
            >
              <option value="Both">Both</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
