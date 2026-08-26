import React from 'react'
import styles from './Methodologies.module.css'
import costMethodologyChibi from '../assets/chibi/cost_methodology.webp'

export default function Methodologies() {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Methodologies</h2>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <img src={costMethodologyChibi} alt="" className={styles.sectionChibi} />
          <div>
            <h3 className={styles.sectionTitle}>Cost Calculation</h3>
            <p className={styles.sectionDesc}>
              The cost of a team is calculated by summing the limited 5-star pull investment for each character in the team.
              The following table describes how each character type contributes to the total cost.
            </p>
          </div>
        </div>

        <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Group</th>
              <th>Cost Contribution</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Normal (Standard)</td>
              <td>Unchecked: 0<br />Checked: eidolons</td>
              <td>
                <ul className={styles.bullets}>
                  <li>4-star and Standard 5-star cost nothing by default</li>
                  <li>Enable "Include Standard Eidolons" toggle to count eidolons toward cost</li>
                  <li>Example: E0/E1 Kafka = 0 or 1 pull</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td>Limited</td>
              <td>eidolons + 1</td>
              <td>
                <ul className={styles.bullets}>
                  <li>1 pull to get character at E0</li>
                  <li>Additional pulls for each eidolon level</li>
                  <li>Example: E0 = 1 pull, E2 = 3 pulls</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td>Limited (Giveaway)</td>
              <td>eidolons only</td>
              <td>
                <ul className={styles.bullets}>
                  <li>Character base (E0) is free</li>
                  <li>Only pay for eidolon levels above E0</li>
                  <li>Example: E0 = 0 pulls, E1 = 1 pull</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td>Later in Standard<br />(added to standard banner or shop)</td>
              <td>Unchecked: If patch ≥ free_later: 0<br />Checked: If patch ≥ free_later: eidolons</td>
              <td>
                <ul className={styles.bullets}>
                  <li>Blade added to standard at 3.2</li>
                  <li>Before 3.2: E0 = 1 pull (unchecked), E1 = 2 pulls</li>
                  <li>From 3.2+: Unchecked = 0, Checked = eidolons</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td>Limited (Giveaway Pick 1)</td>
              <td>Each = eidolons + 1<br />Subtract 1 per unique group</td>
              <td>
                <ul className={styles.bullets}>
                  <li>Acheron + Sparkle in same selection pool</li>
                  <li>(1) + (1) − 1 group = 1 pull total</li>
                  <li>You pick one free, roll for the other</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td>Light Cone</td>
              <td>+1 ONLY if Limited 5-star + signature LC</td>
              <td>
                <ul className={styles.bullets}>
                  <li>Acheron (limited) + sig LC = +1 cost</li>
                  <li>Kafka (giveaway) + sig LC = +1 cost</li>
                  <li>Standard char + any LC = no extra cost</li>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </section>
    </div>
  )
}
