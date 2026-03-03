# Addiction Psychology Deep Dive

## Research Date: March 2, 2026

---

## PART 1: THE NEUROLOGICAL FOUNDATION

### 1.1 The Wanting/Liking Dissociation

Dopamine is not about pleasure — it's about **wanting**. The brain releases dopamine during reward *prediction*, not reward *delivery*. The moment before you open the chest is neurologically more powerful than what's inside.

**Specific mechanics:**
- When gear drops, show rarity glow (color beam) for 0.5-1s BEFORE the item resolves
- Chests should have a brief "unlocking" animation (0.7s) with escalating audio pitch hinting at rarity
- Boss reward selection (Choose 1 of 3) should reveal options one at a time with dramatic reveal

### 1.2 Transient Hypofrontality and Flow State

During flow states, the prefrontal cortex temporarily quiets down — you stop perceiving time and self-criticism. Conditions that trigger it:
1. Challenge must match skill
2. Immediate, clear feedback for every action
3. No interruption to the action loop (menus/loading kill flow)
4. Clear goals at every moment

**Specific mechanics:**
- **Sub-10-second death-to-gameplay loop.** Death screen → one button "Enter the Gauntlet" → back in action
- Auto-equip (already in GDD) is correct — every menu breaks flow
- Room transitions must be near-instant (0.3s fade max)
- Announcer lines SHORT (under 2s) and never pause gameplay

### 1.3 The Tetris Effect

Tight core loops with distinct visual/spatial patterns cause the brain to rehearse between sessions. Players dream about the game.

**Specific mechanics:**
- WFC room shapes should have enough regularity that players unconsciously recognize patterns ("this shape usually has a secret wall on the east side")
- Enemy attack telegraphs must be visually distinctive and consistent

---

## PART 2: THE SEVEN COMPULSION ENGINES

### Engine 1: Near-Miss Architecture

Near-misses activate the same reward circuitry as actual wins while increasing motivation to try again.

**Mechanics:**
- **Death Screen Provocation:** Show exactly what they were close to:
  - "Floor 4 of 5 — Boss was 1 floor away"
  - "Bone Sovereign: 12% HP remaining"
  - "3 rooms from the stairs"
  - "Gold: 187 / 200 for that Rare weapon"
- **Boss HP Visibility:** Precise health bars with phase markers (100-60%, 60-30%, 30-0%)
- **"Heartbreak" Rarity Drop:** 5-10% of deaths, show what the NEXT room contained: "The room ahead contained: [Rare Sword of Flame]"

### Engine 2: Death as Investment (The Hades Principle)

If death produces exclusive content, players almost look forward to dying.

**Mechanics:**
- Post-death exclusive lore fragments (death diary component)
- Announcer death-specific lines hinting at deeper lore
- After dying to a boss, reveal a hint about their backstory
- **"Return Bonus":** +10% damage on Floor 1 after death (one floor only) — rewards re-engaging immediately

### Engine 3: Synergy Discovery (The "Aha" Moment)

The moment two systems interact unexpectedly creates a curiosity loop more durable than reward loops.

**Mechanics:**
- Design explicit cross-system synergies:
  - Weapon property + Skill tree: poison arrows + "kills heal 3 HP" = poison ticks heal
  - Class ability + Trap system: Warrior knockback + spike traps = massive damage
  - Companion AI + Status effects: Wizard fire ground + Necromancer skeletons (fire-immune)
  - Status chaining: Freeze + Fire = Shatter (2x explosion), Poison + Burn = Toxic cloud
- **"Combo Discovered!" popup** with unique color + audio stinger, logged in Codex
- **"Build Name" System:** 3+ simultaneous synergies generates a name: "The Toxic Sentinel," "The Glass Cannon"

### Engine 4: Power Fantasy Escalation (The Vampire Survivors Curve)

The *rate of change* matters more than absolute power. Exponential curve > linear.

**Mechanics:**
- Damage numbers visually scale: small white → large yellow → huge red with particles
- Enemy death animations escalate: early = fade out, late = explode into particles
- Announcer escalates: Floor 1-5 calm, Floor 11+ "Impressive!", Floor 20+ "UNSTOPPABLE!"
- **"Peak Moment" Room:** Once per biome, spawn 30-40 weak swarmers with no elites — pure power fantasy mowing

### Engine 5: Curiosity and Information Gap

Curiosity requires *partial* knowledge. 60% revealed map with tantalizing edges > pure blackness.

**Mechanics:**
- When fog reveals a corridor leading to a doorway, show the door icon even if the room beyond is hidden
- Audio curiosity triggers: biome-specific ambient sound when within 5 tiles of unrevealed valuable room
- **Minimap tease counters:** "Rooms explored: 7/12. Secrets found: 0/2"

### Engine 6: Endowed Progress + Goal Gradients

People work harder when they perceive existing progress toward a goal.

**Mechanics:**
- 3-5 visible overlapping progress indicators at all times:
  - Floor progress: "Floor 3/5"
  - Biome progress: "Biome 1/5"
  - Soul Shard accumulation toward next skill node
  - Room clear percentage
  - Boss HP with phase markers
- **Never let all progress bars reset to zero simultaneously**
- First skill tree node shows "50% unlocked" after first run

### Engine 7: Identity (Why People Say "I'm a Warrior Main")

Identity attachment is one of the strongest retention mechanisms.

**Mechanics:**
- **Per-class statistics** on character select: total kills, floors reached, deaths, fastest boss kills
- **Class Mastery Titles:** Apprentice → Veteran → Champion → Legendary → Eternal
- **Class-specific announcer lines** with increasing familiarity:
  - Early: "Warrior enters the Gauntlet."
  - After 5+ runs: "The Warrior returns."
  - After 10+: "Ah, the Warrior. The Gauntlet remembers you."

---

## PART 3: THE ZEIGARNIK ENGINE (Unfinished Business)

At quit time, the player should always have 3+ open loops:
1. Skill tree node 60-80% funded
2. A class they haven't tried
3. A boss they almost beat
4. A secret they know exists but haven't found
5. Incomplete lore fragment series (3/5)
6. Almost-earned cosmetic unlock
7. A legendary item they've SEEN described but never found

**The last thing before quitting should be forward-looking:**
- "The Bone Sovereign awaits on Floor 5"
- "Skill Node Available: [name]. Cost: 50 Shards. You have: 37."
- "New class unlocked: Valkyrie. She fights for honor."

---

## PART 4: GAME FEEL AS ADDICTION INFRASTRUCTURE

### Hit-Stop and Screen Shake (Reconsider GDD Exclusion)

Screen shake and hit-stop are **the sensory language through which the brain interprets agency and impact**.

- Screen shake: 1-2px normal hits, 3-4px crits, 6-8px boss phase transitions
- Hit-stop: 30-50ms (2-3 frames) on heavy hits only — imperceptible as "pause" but registers as "weight"
- Without these, combat feels "floaty" — the #1 complaint about action games

### Audio Conditioning (Pavlovian Layer)

- **Rarity-gated audio:** Common = quiet thud, Uncommon = pleasant chime, Rare = resonant bell, Epic = crystalline cascade, Legendary = dramatic unique unforgettable sound
- **Kill streak pitch escalation:** Kill sound subtly pitches up with consecutive kills
- **Room clear "cha-ching":** Satisfying completion sound when last enemy dies

---

## PART 5: MASTERY DEPTH

- **Dodge Cancel Window:** Hidden 50-100ms window at END of attack animation. Beginners never find it. Experts weave attack-dodge-attack chains.
- **Knockback as skill expression:** Directional, predictable — knock enemies into walls (bonus damage), each other (stagger), traps, off ledges
- **Status Effect Combos:** Undocumented interactions discovered through play, logged in Codex

---

## PART 6: SELF-DETERMINATION THEORY

Three needs: Autonomy, Competence, Relatedness.

- **Autonomy:** Meaningful build variety, visible moral choice consequences in future runs, companion selection as strategy
- **Competence:** Visible improvement metrics on death screen ("Floors: 7, previous best: 5"), boss pattern mastery, "First Kill" celebration
- **Relatedness:** Companion personality (3-5 announcer reactions each), evolving announcer relationship across runs, shareable death summaries

---

## PRIORITY IMPLEMENTATION ORDER

### Tier 1 (Highest Impact, Lowest Effort)
1. Sub-10-second death-to-gameplay loop
2. Near-miss death screen
3. Rarity-gated audio feedback
4. Gear reveal delay (0.5s beam)
5. Run timer (toggleable)
6. Per-class statistics on character select
7. "Return Bonus" (+10% Floor 1 damage after death)
8. Overlapping progress bars

### Tier 2 (High Impact, Medium Effort)
9. Cross-system synergy chains (10+ designed)
10. "Combo Discovered!" popup + codex
11. Hit-stop + micro screen shake
12. Power Room (one per biome)
13. Escalating announcer familiarity
14. Directional knockback skill expression
15. Audio curiosity triggers near hidden rooms
16. Boss backstory reveals on death
17. Minimap tease counters

### Tier 3 (High Impact, Higher Effort)
18. Class Mastery Title System
19. Legendary Fragment collection (persistent, 2-3 per legendary)
20. Bestiary + Lore Book with completion %
21. Status effect combo system with discovery logging
22. Build Name generator
23. Dodge cancel window (hidden expert mechanic)
24. "Perfect Room" tracking + no-hit challenges
25. Daily Shrine with calendar blessings
26. Shareable death screen text
27. "Heartbreak" post-death room reveal (5-10%)
28. Companion personality voice lines
29. Moral choice persistence visuals
30. Seed sharing for speedrun community

---

## Sources

- The Psychology of Diablo III Loot (psychologyofgames.com)
- Neural Contributions to Flow Experience During Video Game Playing (PMC)
- Near-Miss Effect and Game Rewards (psychologyofgames.com)
- Gambling Near-Misses Enhance Motivation (PMC)
- How Supergiant Weaves Narrative Rewards into Hades (gamedeveloper.com)
- Power Fantasy Through Rapid Escalation: Vampire Survivors (kokutech.com)
- Information Gap Theory (psychologyfanatic.com)
- Endowed Progress Effect (learningloop.io)
- Goal Gradient Effect (learningloop.io)
- Zeigarnik Effect (psychologytoday.com)
- Self-Determination Theory - Ryan & Deci (2000)
- Flow Experience in Gameful Approaches 2025 (tandfonline.com)
- Research on Screen Shake and Hit Stop Effects (oreateai.com)
- Neuroscience of Flow State (mindlabneuroscience.com)
- Wordle Psychology (uxmag.com)
- Gotta Catch 'Em All: Creature Collection Psychology (journals.sfu.ca)
