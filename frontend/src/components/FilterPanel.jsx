import React, { useState, useEffect } from 'react'
import { getCharacters } from '../api'
import styles from './FilterPanel.module.css'

function CharacterSlot({ filter, onFilterChange, allCharacters, selectedNames }) {
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

  const incrementEidolon = () => {
    if (filter.eidolon < 6) {
      onFilterChange({ ...filter, eidolon: filter.eidolon + 1 })
    }
  }

  const decrementEidolon = () => {
    if (filter.eidolon > 0) {
      onFilterChange({ ...filter, eidolon: filter.eidolon - 1 })
    }
  }

  const toggleSignatureLc = () => {
    onFilterChange({ ...filter, signature_lc: !filter.signature_lc })
  }

  return (
    <div className={styles.slot}>
      <div className={styles.characterSelect}>
        <div className={styles.dropdown}>
          <button
            className={styles.dropdownButton}
            onClick={() => setSearchOpen(!searchOpen)}
          >
            {selected ? selected.name : 'Select character...'}
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
                      onFilterChange({ ...filter, name: char.name })
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
      </div>

      {filter.name && (
        <>
          <div className={styles.eidolon}>
            <label>E{filter.eidolon}</label>
            <button
              onClick={decrementEidolon}
              disabled={filter.eidolon === 0}
              className={styles.iconButton}
            >
              −
            </button>
            <button
              onClick={incrementEidolon}
              disabled={filter.eidolon === 6}
              className={styles.iconButton}
            >
              +
            </button>
          </div>

          <div className={styles.signatureLc}>
            <input
              type="checkbox"
              id={`sig-${filter.name}`}
              checked={filter.signature_lc}
              onChange={toggleSignatureLc}
            />
            <label htmlFor={`sig-${filter.name}`} title={filter.signature_lc ? "Only with signature" : "Without signature"}>
              {filter.signature_lc ? "✓ Signature LC" : "✗ No Signature"}
            </label>
          </div>
        </>
      )}
    </div>
  )
}

export default function FilterPanel({
  filters,
  onFiltersChange,
  excludedCharacters,
  onExcludedCharactersChange,
  sustain,
  onSustainChange,
  aggregation,
  onAggregationChange,
  onExecute,
  disabled
}) {
  const [characters, setCharacters] = useState([])
  const [loadingChars, setLoadingChars] = useState(true)
  const [excludeSearch, setExcludeSearch] = useState('')
  const [excludeOpen, setExcludeOpen] = useState(false)

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

  const selectedNames = filters.map(f => f.name).filter(Boolean)

  const handleFilterChange = (index, newFilter) => {
    const updated = [...filters]
    updated[index] = newFilter
    onFiltersChange(updated)
  }

  return (
    <div className={styles.panel}>
      <h2>Filters</h2>

      <div className={styles.characterSlots}>
        {loadingChars ? (
          <p>Loading characters...</p>
        ) : (
          filters.map((filter, idx) => (
            <CharacterSlot
              key={idx}
              filter={filter}
              onFilterChange={(f) => handleFilterChange(idx, f)}
              allCharacters={characters}
              selectedNames={selectedNames}
            />
          ))
        )}
      </div>

      <div className={styles.excludeSection}>
        <h3>Exclude Characters</h3>
        <div className={styles.dropdown}>
          <button
            className={styles.dropdownButton}
            onClick={() => setExcludeOpen(!excludeOpen)}
          >
            + Add character to exclude
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
                {characters
                  .filter(
                    c =>
                      !excludedCharacters.includes(c.name) &&
                      c.name.toLowerCase().includes(excludeSearch.toLowerCase())
                  )
                  .map(char => (
                    <div
                      key={char.name}
                      className={styles.option}
                      onClick={() => {
                        onExcludedCharactersChange([...excludedCharacters, char.name])
                        setExcludeOpen(false)
                        setExcludeSearch('')
                      }}
                    >
                      {char.name} ⭐{char.rarity}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {excludedCharacters.length > 0 && (
          <div className={styles.excludedTags}>
            {excludedCharacters.map(name => (
              <div key={name} className={styles.tag}>
                {name}
                <button
                  className={styles.removeTag}
                  onClick={() =>
                    onExcludedCharactersChange(excludedCharacters.filter(c => c !== name))
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.control}>
          <label htmlFor="sustain">Sustain Role</label>
          <select
            id="sustain"
            value={sustain}
            onChange={(e) => onSustainChange(e.target.value)}
          >
            <option value="Both">Both</option>
            <option value="Yes">Yes (with sustainer)</option>
            <option value="No">No (sustainless)</option>
          </select>
        </div>

        <div className={styles.control}>
          <label htmlFor="agg">Aggregation</label>
          <select
            id="agg"
            value={aggregation}
            onChange={(e) => onAggregationChange(e.target.value)}
          >
            <option value="median">Median</option>
            <option value="mean">Mean</option>
          </select>
        </div>
      </div>

      <button
        onClick={onExecute}
        disabled={disabled}
        className={styles.executeButton}
      >
        {disabled ? 'Select a character' : 'Execute'}
      </button>
    </div>
  )
}
