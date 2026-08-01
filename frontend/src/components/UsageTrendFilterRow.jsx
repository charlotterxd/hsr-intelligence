import React, { useState } from 'react'
import styles from './SurvivalFilterRow.module.css'

const resolveColor = (c) => {
  if (!c.startsWith('var(')) return c
  const el = document.querySelector('[data-theme]') || document.documentElement
  return getComputedStyle(el).getPropertyValue(c.slice(4, -1).trim()).trim() || '#e040fb'
}

export default function UsageTrendFilterRow({
  lineId,
  lineConfig,
  onLineChange,
  allCharacters,
  onRemove,
  onCopy,
  canRemove,
  canCopy,
  color
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')

  const sortedCharacters = [...allCharacters].sort((a, b) => a.name.localeCompare(b.name))

  const selected = allCharacters.find(c => c.name === lineConfig.character)

  const filteredChars = searchText
    ? sortedCharacters.filter(c => c.name.toLowerCase().includes(searchText.toLowerCase()))
    : sortedCharacters

  const getImagePath = (characterId) => `/characters/${characterId}.png`

  const handleSelectCharacter = (charName) => {
    onLineChange({ ...lineConfig, character: charName })
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
    </div>
  )
}
