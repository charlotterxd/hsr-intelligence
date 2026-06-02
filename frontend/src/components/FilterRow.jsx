import React, { useState, useEffect } from 'react'
import { getCharacters } from '../api'
import styles from './FilterRow.module.css'

const resolveColor = (c) => {
  if (!c.startsWith('var(')) return c
  const el = document.querySelector('[data-theme]') || document.documentElement
  return getComputedStyle(el).getPropertyValue(c.slice(4, -1).trim()).trim() || '#e040fb'
}

function CharacterSlot({ filter, onFilterChange, allCharacters, selectedNames, lineId, slotIndex }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')

  const availableCharacters = allCharacters.filter(
    c => !selectedNames.includes(c.name) || c.name === filter.name
  )

  const filtered = searchText
    ? availableCharacters.filter(c =>
        c.name.toLowerCase().includes(searchText.toLowerCase())
      )
    : availableCharacters

  const selected = allCharacters.find(c => c.name === filter.name)

  const getImagePath = (characterId) => {
    return `/characters/${characterId}.png`
  }

  const getImageUrl = (char) => {
    if (char && char.id) {
      return getImagePath(char.id)
    }
    return null
  }

  const isAllEidolons = filter.eidolon === -1

  const incrementEidolon = () => {
    if (isAllEidolons) return
    if (filter.eidolon < 6) {
      onFilterChange({ ...filter, eidolon: filter.eidolon + 1 })
    }
  }

  const decrementEidolon = () => {
    if (isAllEidolons) {
      onFilterChange({ ...filter, eidolon: 6 })
      return
    }
    if (filter.eidolon > 0) {
      onFilterChange({ ...filter, eidolon: filter.eidolon - 1 })
    }
  }

  const toggleAllEidolons = () => {
    onFilterChange({ ...filter, eidolon: isAllEidolons ? 0 : -1 })
  }

  const handleSignatureModeChange = (mode) => {
    onFilterChange({ ...filter, signature_lc_mode: mode })
  }

  return (
    <div className={styles.slot}>
      {selected ? (
        <div className={styles.selectedProfile}>
          <img
            src={getImageUrl(selected)}
            alt={selected.name}
            className={styles.profileImage}
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
          <div className={styles.profileInfo}>
            <div className={styles.profileName}>{selected.name}</div>
            <div className={styles.profileActions}>
              <button
                className={styles.changeButton}
                onClick={() => setSearchOpen(!searchOpen)}
                title="Change character"
              >
                Change
              </button>
              <button
                className={styles.clearButton}
                onClick={() => {
                  onFilterChange({ ...filter, name: '' })
                  setSearchOpen(false)
                }}
                title="Clear character"
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
                {filtered.map(char => (
                  <div
                    key={char.name}
                    className={`${styles.option} ${
                      char.name === filter.name ? styles.selected : ''
                    }`}
                    onClick={() => {
                      const defaultEidolon = (char.rarity === 4 || char.availability === 'standard') ? -1 : 0
                      onFilterChange({ ...filter, name: char.name, eidolon: defaultEidolon })
                      setSearchOpen(false)
                      setSearchText('')
                    }}
                  >
                    {char.name} ⭐{char.rarity}
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
            Select...
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
                {filtered.map(char => (
                  <div
                    key={char.name}
                    className={`${styles.option} ${
                      char.name === filter.name ? styles.selected : ''
                    }`}
                    onClick={() => {
                      const defaultEidolon = (char.rarity === 4 || char.availability === 'standard') ? -1 : 0
                      onFilterChange({ ...filter, name: char.name, eidolon: defaultEidolon })
                      setSearchOpen(false)
                      setSearchText('')
                    }}
                  >
                    {char.name} ⭐{char.rarity}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {filter.name && (
        <>
          <div className={styles.eidolon}>
            <label>{isAllEidolons ? 'ALL' : `E${filter.eidolon}`}</label>
            <button
              onClick={decrementEidolon}
              disabled={isAllEidolons || filter.eidolon === 0}
              className={styles.iconButton}
            >
              −
            </button>
            <button
              onClick={incrementEidolon}
              disabled={isAllEidolons || filter.eidolon === 6}
              className={styles.iconButton}
            >
              +
            </button>
            <button
              onClick={toggleAllEidolons}
              className={`${styles.iconButton} ${isAllEidolons ? styles.allActive : ''}`}
              title={isAllEidolons ? 'Click to select specific eidolon' : 'Click to select all eidolons'}
            >
              ALL
            </button>
          </div>

          <div className={styles.signatureLc}>
            <label className={styles.sigLabel}>
              <input
                type="radio"
                name={`sig-${lineId}-${slotIndex}`}
                value="no-signature"
                checked={(filter.signature_lc_mode || 'both') === 'no-signature'}
                onChange={() => handleSignatureModeChange('no-signature')}
                className={styles.sigRadio}
              />
              <span>S0</span>
            </label>
            <label className={styles.sigLabel}>
              <input
                type="radio"
                name={`sig-${lineId}-${slotIndex}`}
                value="signature"
                checked={(filter.signature_lc_mode || 'both') === 'signature'}
                onChange={() => handleSignatureModeChange('signature')}
                className={styles.sigRadio}
              />
              <span>S1+</span>
            </label>
            <label className={styles.sigLabel}>
              <input
                type="radio"
                name={`sig-${lineId}-${slotIndex}`}
                value="both"
                checked={(filter.signature_lc_mode || 'both') === 'both'}
                onChange={() => handleSignatureModeChange('both')}
                className={styles.sigRadio}
              />
              <span>Both</span>
            </label>
          </div>
        </>
      )}
    </div>
  )
}

export default function FilterRow({
  lineId,
  lineConfig,
  onLineChange,
  allCharacters,
  selectedNamesInLine,
  onRemove,
  onCopy,
  canRemove,
  canCopy
}) {
  const [excludeSearch, setExcludeSearch] = useState('')
  const [excludeOpen, setExcludeOpen] = useState(false)

  const handleFilterChange = (index, newFilter) => {
    const updated = [...lineConfig.filters]
    updated[index] = newFilter
    onLineChange({ ...lineConfig, filters: updated })
  }

  const handleLineNameChange = (newName) => {
    onLineChange({ ...lineConfig, lineName: newName })
  }

  const handleLineColorChange = (newColor) => {
    onLineChange({ ...lineConfig, lineColor: newColor })
  }

  const handleExcludeChange = (newExcluded) => {
    onLineChange({ ...lineConfig, excludedCharacters: newExcluded })
  }

  const handleSustainChange = (newSustain) => {
    onLineChange({ ...lineConfig, sustain: newSustain })
  }

  const handleAggregationChange = (newAgg) => {
    onLineChange({ ...lineConfig, aggregation: newAgg })
  }

  return (
    <div className={styles.row} style={{ borderLeftColor: lineConfig.lineColor }}>
      <div className={styles.lineHeader}>
        <div className={styles.lineHeaderLeft}>
          <div className={styles.formGroup}>
            <label>Line Name</label>
            <input
              type="text"
              value={lineConfig.lineName}
              onChange={(e) => handleLineNameChange(e.target.value)}
              className={styles.lineNameInput}
              placeholder="Line name"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Color</label>
            <input
              type="color"
              value={resolveColor(lineConfig.lineColor)}
              onChange={(e) => handleLineColorChange(e.target.value)}
              className={styles.colorPicker}
              title="Change line color"
            />
          </div>
        </div>
        <div className={styles.lineHeaderRight}>
          <div className={styles.formGroup}>
            <label>Sustain</label>
            <select
              value={lineConfig.sustain}
              onChange={(e) => handleSustainChange(e.target.value)}
              title="Sustain filter"
              className={styles.headerSelect}
            >
              <option value="Both">Both</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Aggregation</label>
            <select
              value={lineConfig.aggregation}
              onChange={(e) => handleAggregationChange(e.target.value)}
              title="Aggregation method"
              className={styles.headerSelect}
            >
              <option value="median">Median</option>
              <option value="mean">Mean</option>
            </select>
          </div>
        </div>
      </div>
      <div className={styles.slotsWrapper}>
        <div className={styles.slotsLabel}>Team Members</div>
        <div className={styles.slotsGrid}>
          {lineConfig.filters.map((filter, idx) => (
            <div key={idx} className={styles.slotWithTitle}>
              <div className={styles.slotTitle}>Char {idx + 1}</div>
              <CharacterSlot
                filter={filter}
                onFilterChange={(f) => handleFilterChange(idx, f)}
                allCharacters={allCharacters}
                selectedNames={selectedNamesInLine}
                lineId={lineId}
                slotIndex={idx}
              />
            </div>
          ))}
        </div>

        <div className={styles.excludeRow}>
          <div className={styles.slotWithTitle}>
            <div className={styles.slotTitle}>Exclude</div>
            <div className={styles.excludeCompact}>
        <div className={styles.dropdown}>
          <button
            className={styles.dropdownButton}
            onClick={() => setExcludeOpen(!excludeOpen)}
            title="Exclude characters from this line"
          >
            +
          </button>

          {excludeOpen && (
            <div className={styles.dropdownContent}>
              <input
                type="text"
                placeholder="Search..."
                value={excludeSearch}
                onChange={(e) => setExcludeSearch(e.target.value)}
                className={styles.searchInput}
                autoFocus
              />
              <div className={styles.options}>
                {allCharacters
                  .filter(
                    c =>
                      !lineConfig.excludedCharacters.includes(c.name) &&
                      c.name.toLowerCase().includes(excludeSearch.toLowerCase())
                  )
                  .map(char => (
                    <div
                      key={char.name}
                      className={styles.option}
                      onClick={() => {
                        handleExcludeChange([...lineConfig.excludedCharacters, char.name])
                        setExcludeOpen(false)
                        setExcludeSearch('')
                      }}
                    >
                      {char.name}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

            </div>
          </div>
          {lineConfig.excludedCharacters.length > 0 && (
            <div className={styles.excludedTags}>
              {lineConfig.excludedCharacters.map(name => (
                <div key={name} className={styles.tag}>
                  {name}
                  <button
                    className={styles.removeTag}
                    onClick={() =>
                      handleExcludeChange(lineConfig.excludedCharacters.filter(c => c !== name))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.lineActions}>
        {canCopy && (
          <button
            onClick={() => onCopy(lineId)}
            className={styles.copyButton}
            title="Copy this line"
          >
            📋
          </button>
        )}
        {canRemove && (
          <button
            onClick={() => onRemove(lineId)}
            className={styles.removeButton}
            title="Remove this line"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
