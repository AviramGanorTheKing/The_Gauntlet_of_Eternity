# The Gauntlet of Eternity — Game Design Document

## Version 1.0 | February 2026

---

## 1. OVERVIEW

### Elevator Pitch
A top-down 2D roguelike dungeon crawler inspired by classic Gauntlet, where a solo player and up to 3 AI companions fight through procedurally generated dungeons filled with monster spawners, traps, treasure, and increasingly powerful bosses. Fast-paced, arcade-like combat meets modern roguelike progression.

### Key Pillars
- **Accessible but deep** — easy to pick up, hard to master
- **Replayability** — procedural generation + permadeath + meta-progression
- **Co-op feel** — AI companions provide the Gauntlet party experience
- **"One more run" addiction loop** — persistent skill trees keep you coming back
- **Full retro commitment** — CRT visuals, 8-bit audio, arcade nostalgia

### Technical Summary

| Aspect | Choice |
|--------|--------|
| Engine | Phaser 3 (JavaScript, WebGL) |
| Platform | Web-first (browser), future Electron (desktop) + Capacitor (mobile) |
| Art | 32×32 pixel art, pure top-down camera |
| Post-processing | CRT shader (scanlines, vignette, RGB separation, bloom) |
| Audio | Pure 8-bit chiptune, dynamic layering |
| Development | AI-assisted (Claude builds everything) |

---

## 2. DUNGEON GENERATION

### Algorithm: Wave Function Collapse (WFC)

Tile-based procedural generation using adjacency constraint rules. Each biome defines its own tile set with rules for what can be placed next to what. The WFC algorithm fills a grid by collapsing possibilities one cell at a time, propagating constraints outward.

### Tile Categories

**Structural Tiles:** Floor, Wall, Corner variants (inner/outer), Corridor, Doorways, Pits/chasms

**Functional Tiles:** Spawner pad, Treasure alcove, Shrine pedestal, Secret wall (looks like wall, breakable/revealable), Trap tiles (spikes, pressure plates, dart shooters)

### Biomes

| Biome | Floors | Room Count | Structure | Visual Style |
|-------|--------|-----------|-----------|-------------|
| The Crypt | 1-5 | 8-12 | Linear + branches | Stone, cobwebs, coffins |
| Fungal Caves | 6-10 | 12-16 | Open exploration | Organic, bioluminescent |
| Iron Fortress | 11-15 | 16-20 | Lock & key | Metal, gears, fire |
| The Inferno | 16-20 | 20-24 | Linear gauntlet | Lava, obsidian, embers |
| The Abyss | 21-25 | 24-30 | All mixed | Void, eldritch, floating |

### Floor Scaling
Floors grow in size as the player descends, creating a natural difficulty and exploration curve. Early biome floors are compact and fast; later biome floors are sprawling and dangerous.

### Exploration
- **Fog of war** — minimap fully hidden, revealed tile-by-tile as the player walks
- **No pre-revealed room shapes** — pure exploration and discovery

### Special Rooms

**Shrines (risk/reward decision points):**
- Shrine of Power — boost one stat, reduce another
- Shrine of Fate — random positive OR negative effect
- Shrine of Sacrifice — pay HP/gold for a guaranteed powerful reward
- Shrine of the Forgotten — reveals full floor map but spawns an elite enemy

**Secret Rooms (hidden behind destructible/illusory walls):**

Discovery methods:
- Cracked wall textures (subtle visual hint)
- Bombing/attacking suspicious walls
- A "ping" sound effect when near a secret
- Map scroll item reveals secret room locations

Secret room rewards:
- Rare gear chest
- Bonus Soul Shards (meta-currency)
- Lore scrolls (environmental storytelling)
- Shortcut to skip a floor
- Unique NPCs with special trades

**Shops (once per biome, guaranteed):**

| Item | Price Range | Availability |
|------|-----------|-------------|
| Health potion | 25-50 gold | Always |
| Mana potion | 25-50 gold | Always |
| Uncommon gear | 75-150 gold | 2 random pieces |
| Rare gear | 200-350 gold | 1 random piece |
| Accessory | 150-300 gold | 1 random |
| Map scroll | 100 gold | Sometimes |
| Shrine reroll token | 150 gold | Sometimes |

**Trap-Only Rooms (dedicated navigation challenges):**

| Difficulty | Reward |
|-----------|--------|
| Easy gauntlet | Gold chest (50-100 gold) |
| Medium gauntlet | Guaranteed uncommon+ gear |
| Hard gauntlet | Rare gear or accessory |
| Ultimate gauntlet (1 per biome) | Epic gear or legendary fragment |

---

## 3. COMBAT SYSTEM

### Combat Tempo
Measured and tactical — inspired by original Gauntlet and Enter the Gungeon. Combat is about positioning and timing, not button mashing.

### Input Scheme (3 core actions)

| Action | Keyboard | Gamepad | Mobile |
|--------|----------|---------|--------|
| Move | WASD | Left stick | Virtual joystick (left) |
| Attack | Left click / mouse aim | Right stick aim + RT fire | Virtual joystick (right) |
| Dodge | Space | LB / L1 | Dodge button |
| Special | E / Right click | RB / R1 | Special button |
| Use Potion | Q | Y / Triangle | Potion button |

### Dodge Mechanics
- Distance: ~3 tiles in movement direction
- I-frames: First 60% of dodge animation grants invincibility
- Cooldown: 1.5 seconds (prevents spam, forces commitment)
- Cannot cancel attack into dodge (punishes reckless swinging)

### Combat Feedback (Juice)
- **Knockback** on enemies when hit
- **Damage numbers** floating up from targets
- **White flash** on enemy hit (instant visual confirmation)

NOT included (by design): hitstop, screen shake, slow-motion kills — keeping it clean and readable.

### Damage Formula
```
Final Damage = (Base Attack × Weapon Multiplier) × (1 + Perk Bonuses) - Enemy Armor
```

### Time-to-Kill Targets

| Enemy Type | Floors 1-5 | Floors 11-15 | Floors 21-25 |
|------------|-----------|--------------|--------------|
| Swarmer | 1 hit | 1-2 hits | 2-3 hits |
| Bruiser | 5-6 hits | 8-10 hits | 12-15 hits |
| Ranged | 2-3 hits | 3-4 hits | 5-6 hits |
| Bomber | 1 hit | 1-2 hits | 2 hits |
| Elite | 10-12 hits | 15-20 hits | 25-30 hits |

### Status Effects

| Effect | Duration | Impact |
|--------|----------|--------|
| Poison | 5s | Tick damage over time |
| Slow | 3s | -40% movement speed |
| Stun | 1.5s | Cannot act |
| Burn | 4s | Tick damage + spreads to nearby enemies |
| Freeze | 2s | Cannot move, next hit does 2× damage |
| Curse | 10s | -25% damage dealt |

### Health & Mana System
- **Health:** Standard damage-only model, heal with potions
- **Health potions:** Flat 30% HP heal
- **Mana:** 100 max for all classes, 2 mana/second passive regen
- **Mana potions:** Flat 30 mana restore
- **Potions are dual-gated:** specials require BOTH cooldown AND mana cost

### Potion Scarcity Curve

| Biome | Health Drops | Mana Drops | Max Carry |
|-------|------------|-----------|-----------|
| Crypt (1-5) | Common (most rooms) | Common | 6 HP / 4 Mana |
| Fungal Caves (6-10) | Regular (every 2-3 rooms) | Regular | 5 HP / 3 Mana |
| Iron Fortress (11-15) | Uncommon (every 3-4 rooms) | Uncommon | 4 HP / 3 Mana |
| Inferno (16-20) | Rare (every 4-5 rooms) | Rare | 3 HP / 2 Mana |
| Abyss (21-25) | Very rare (shrine/secret only) | Very rare | 2 HP / 2 Mana |

---

## 4. CHARACTER CLASSES

### Stat Variance
Moderately varied — noticeable differences but all classes feel capable of completing the game solo.

### Unlocking
- **Starters (available immediately):** Warrior, Wizard, Archer
- **Unlockable:** Valkyrie (reach Floor 11), Necromancer (beat Floor 20 boss)

### Base Stats (Level 1)

| Stat | Warrior | Wizard | Archer | Valkyrie | Necromancer |
|------|---------|--------|--------|----------|-------------|
| HP | 120 | 70 | 85 | 100 | 80 |
| Mana | 100 | 100 | 100 | 100 | 100 |
| Speed | Medium | Slow | Fast | Medium | Slow |
| Attack | 18 | 22 | 14 | 16 | 12 |
| Attack Speed | 1.2/s | 0.8/s | 1.8/s | 1.0/s | 0.7/s |
| Defense | 8 | 2 | 4 | 6 | 3 |
| Dodge Dist. | Medium | Long | Long | Medium | Short |

### Attack Styles

| Class | Attack Style | Range | Speed | Arc/Area |
|-------|-------------|-------|-------|----------|
| Warrior | Melee swing | Short | Medium | Wide 90° arc |
| Wizard | Projectile | Long | Slow | Single target, pierces |
| Archer | Arrow shot | Long | Fast | Single target, stops on hit |
| Valkyrie | Spear thrust | Medium | Medium | Narrow line |
| Necromancer | Dark wave | Medium | Slow | Cone spread |

### Special Abilities

| Class | Special | Cooldown | Mana Cost | Tactical Purpose |
|-------|---------|----------|-----------|-----------------|
| Warrior | Shield bash | 8s | 15 | Stun + breathing room |
| Wizard | Teleport blink | 6s | 25 | Reposition, escape danger |
| Archer | Place trap | 12s | 20 | Area denial, chokepoints |
| Valkyrie | Shield throw | 10s | 20 | Ranged option, boomerang return |
| Necromancer | Raise skeleton | 10s | 30 | Draws aggro, tanks hits |

### Persistent Skill Trees

Each class has 4 branches with 15 nodes total, costing Soul Shards (meta-currency).

**Branch structure (same for all classes, class-specific content):**
- Might (4 nodes) — Damage and attack upgrades
- Fortitude (4 nodes) — Health and defense
- Technique (4 nodes) — Special ability upgrades
- Mastery (3 nodes) — Unique class-defining capstone

**Node costs escalate:** 50 → 100 → 200 → 400 Soul Shards per tier.
**Full tree cost per class:** ~3,000 shards total.

### Warrior Skill Tree

**Might:** +15% damage → Attacks push further → +20% attack speed → 10% crit chance (2x damage)

**Fortitude:** +20 max HP → +4 defense → Heal 5HP on room clear → Revive once per run at 30% HP

**Technique:** Bash stuns 2s (from 1s) → Bash costs 10 mana (from 15) → Bash creates shockwave AoE

**Mastery:** Attacks cleave through enemies → Killing enemies heals 3 HP → IRON WILL: Can't die for 5s when HP hits 0 (once per floor)

### Wizard Skill Tree

**Might:** Fireball pierces +1 enemy → +25% spell damage → Fireball explodes on impact (AoE) → Burning: fireball ignites enemies

**Fortitude:** +30 max HP → Mana shield: take mana damage before HP (10%) → +3 mana/s regen → HP potion also restores 15 mana

**Technique:** Blink leaves damage trail → Blink costs 15 mana (from 25) → Blink resets on kill within 2s

**Mastery:** Spells chain to nearby enemy → Kills refund 50% mana → ARCANE FURY: Below 30% HP, +50% cast speed and damage

### Archer Skill Tree

**Might:** Arrows pierce first enemy → +15% attack speed → Critical arrows (15% chance) → Poison arrows (3s tick damage)

**Fortitude:** +25 max HP → Dodge grants 2s +30% speed → +5 defense → Dodge has 2 charges

**Technique:** Traps slow enemies 40% → Place 2 traps simultaneously → Trap costs 12 mana (from 20)

**Mastery:** Moving increases damage (up to 25%) → Arrows ricochet off walls once → DEAD EYE: Every 10th arrow is guaranteed crit that pierces all enemies

### Valkyrie Skill Tree

**Might:** Spear thrust hits wider → +20% damage to stunned enemies → Lightning on every 5th hit → +15% attack speed

**Fortitude:** +20 max HP → Block: hold attack to block (50% reduction) → +5 defense → Block counter: perfect block reflects damage

**Technique:** Shield bounces to 2nd enemy → Shield throw stuns 1.5s → Shield costs 12 mana (from 20)

**Mastery:** Blocking with dodge negates all damage → Spear attacks mark enemies (marked take +20%) → VALHALLA'S CALL: On death, revive at 50% HP + 5s invincibility (once per run)

### Necromancer Skill Tree

**Might:** Dark wave is 20% wider → +20% spell damage → Kills create soul orbs (heal 5HP) → Dark wave slows enemies 30%

**Fortitude:** +25 max HP → Skeletons take 25% damage for you (proximity) → +4 defense → Death heals all active skeletons to full

**Technique:** Raise 2 skeletons → Skeletons last 60s (from 30s) → Raise costs 20 mana (from 30) → Command: direct skeleton aggro

**Mastery:** Skeletons explode on death (AoE damage) → Dark wave life-steals 15% → ARMY OF DARKNESS: Can have 5 skeletons simultaneously, they gain +50% damage and HP

### Respec System
- First respec: free
- Subsequent respecs: 100 → 250 → 500 → 1000 Soul Shards (escalating)

### Soul Shard Economy

| Source | Amount |
|--------|--------|
| Per room cleared | 5 shards |
| Per floor boss | 50 shards |
| Per biome boss | 150 shards |
| Secret room found | 25 shards |
| Shrine completed | 10 shards |
| Death bonus (floors reached) | floors × 5 |

A full Crypt clear earns ~200-300 shards. Maxing one class takes ~10-15 deep runs.

### Cosmetic System

| Tier | How to Get | Examples |
|------|-----------|----------|
| Common | 200 shards | Color palette swaps |
| Rare | 500 shards | Themed outfits |
| Epic | Achievement (beat Abyss with class) | Dark/corrupted skin |
| Legendary | Achievement (no-hit a biome boss) | Glowing/ethereal skin |
| Secret | Hidden (find all secret rooms in single run) | Pixel-glitch skin |

---

## 5. ENEMIES & AI

### Enemy Archetypes

| Type | Behavior | HP | Speed | Damage |
|------|----------|-----|-------|--------|
| Swarmer | Chase nearest player | Very low | Fast | Low |
| Bruiser | Patrol, aggro on proximity, charge | High | Slow | High |
| Ranged | Keep distance, line-of-sight shooting | Low-Medium | Medium | Medium |
| Bomber | Beeline to player, detonate on contact | Low | Fast | Very high (AoE) |
| Elite | Random modifiers (fast, shield, teleport) | Very high | Varies | High |

### Spawners
- Destructible generators that endlessly spawn enemies (classic Gauntlet mechanic)
- Each spawner type produces one enemy archetype
- Destroying spawners is a strategic priority
- Spawner rate increases with party size

### AI Behavior
- **Swarmers:** Chase nearest player/companion, basic pathfinding
- **Bruisers:** Patrol routes, aggro on proximity radius, charge attack with telegraph
- **Ranged:** Maintain distance, line-of-sight checks, flee when player gets close
- **Bombers:** Direct path to nearest target, detonate on contact or after timer
- **Elites:** State-machine based, random modifier combination each spawn

---

## 6. BOSS ENCOUNTERS

### Boss Philosophy
- Fixed per biome (same boss every run — master through repetition)
- 3-phase structure (100%-60%, 60%-30%, 30%-0%)
- Dedicated boss room (enter when ready, no going back)
- Learnable patterns, class-agnostic, arena matters

### Boss Reward: Choose 1 of 3

| Boss | Gear Option | Shard Option | Heal Option |
|------|-----------|-------------|-------------|
| Bone Sovereign | Uncommon weapon/armor | 150 shards | Full HP + Mana |
| Sporemind | Rare weapon/armor | 250 shards | Full HP + Mana + 2 potions |
| Iron Warden | Rare weapon/armor + ring | 400 shards | Full HP + Mana + 3 potions |
| Ember Tyrant | Epic weapon/armor | 600 shards | Full HP + Mana + max potions |
| Void Architect | Legendary item | 1000 shards | N/A (game complete!) |

### Boss 1: The Bone Sovereign (Crypt, Floor 5)
A massive skeletal king who assembles himself from scattered bones.

- **Phase 1:** Sword slam (telegraphed AoE), summons 3 skeletons. Open crypt chamber.
- **Phase 2:** Bone spear throw (line projectile), increased skeleton summons. Coffins open along walls.
- **Phase 3:** Detaches arm as homing projectile, rapid slams. Floor crumbles — pits appear.
- **Design intent:** Introductory boss. Teaches dodging telegraphed attacks and managing adds.

### Boss 2: The Sporemind (Fungal Caves, Floor 10)
A pulsating fungal mass rooted to the arena center. It can't move but the room is its weapon.

- **Phase 1:** Spore clouds (poison AoE zones), extending tendrils (sweep). Circular arena.
- **Phase 2:** Spawns mushroom minions, toxic gas shrinks safe area from edges.
- **Phase 3:** Rapid tendril whip combo, room pulses with screen-wide damage on rhythm. Must stand on shifting safe tiles.
- **Design intent:** Spatial awareness boss. Tests navigation in shrinking safe zones.

### Boss 3: The Iron Warden (Iron Fortress, Floor 15)
A colossal mechanical knight that changes weapon configurations between phases.

- **Phase 1:** Sword & shield — charge attack, must hit from behind. Rectangular arena with pillars.
- **Phase 2:** Switches to dual axes — fast spin combos, throws axes. Pillars collapse.
- **Phase 3:** Mounts cannon arm — alternates melee and ranged barrages. Conveyor belts activate.
- **Design intent:** Adaptation boss. Each phase demands different strategy.

### Boss 4: The Ember Tyrant (Inferno, Floor 20)
A demonic warlord wreathed in flame. The most aggressive boss.

- **Phase 1:** Flame sword combos (3-hit chain), fire breath (cone). Stone arena, lava moat.
- **Phase 2:** Teleport-slash (appears behind player), rains fireballs. Lava rises, platforms sink.
- **Phase 3:** Permanent fire trail, arena mostly lava, summons fire elementals. 4 rotating safe platforms.
- **Design intent:** Pressure boss. The skill check gate for Necromancer unlock.

### Boss 5: The Void Architect (The Abyss, Floor 25)
An eldritch entity that manipulates reality itself.

- **Phase 1:** Void beams (rotating lasers), summons echo clones of the player. Floating platform.
- **Phase 2:** Gravity flips (screen rotates, controls invert briefly), black holes (pull effect). Tiles flicker.
- **Phase 3:** All previous attacks simultaneously, arena fragments into islands. CRT glitch effects intensify as the Void Architect "corrupts" the game.
- **Design intent:** The ultimate test. Uses every skill learned. CRT aesthetic goes into overdrive.

### Boss Room Design
Before entering, players see:
- Large ornate door with biome visual motif
- Preparation area with final chest, small potion refill fountain, shrine
- Environmental "point of no return" cues (bones, scorch marks, claw marks)
- Walk through door → seals shut → boss intro animation → fight

---

## 7. GEAR & LOOT SYSTEM

### Equipment Slots
3 total: Weapon, Armor, Accessory (ring/amulet)

### Identification
Instant on pickup — you always see what you get.

### Equipping
Auto-equip if better — no menu management mid-combat.

### Weapon Types per Class

| Class | Type 1 (balanced) | Type 2 (variant) | Type 3 (variant) |
|-------|------------------|------------------|------------------|
| Warrior | Sword | Axe (slow/heavy) | Mace (stun chance) |
| Wizard | Staff (fireball) | Tome (multi-projectile) | Orb (homing) |
| Archer | Shortbow (fast) | Longbow (piercing) | Crossbow (slow/high dmg) |
| Valkyrie | Spear | Halberd (wide arc) | Javelin (throwable) |
| Necromancer | Skull staff | Bone scythe (melee hybrid) | Grimoire (stronger summons) |

### Rarity System

| Rarity | Color | Drop Rate | Stat Bonus | Properties |
|--------|-------|-----------|-----------|------------|
| Common | White | 60% | Base | None |
| Uncommon | Green | 25% | +15-25% | 1 minor |
| Rare | Blue | 10% | +30-50% | 1 major |
| Epic | Purple | 4% | +55-80% | 2 properties |
| Legendary | Gold | 1% | +100%+ | Unique named effect |

### Property Examples

**Minor:** +10% speed, +5 HP, slight knockback, poison resist, +2 mana regen

**Major:** Attacks burn enemies, kills heal 3 HP, +25% crit chance, AoE on hit, mana on kill

**Legendary items:**
- "Bone Harvest" (Necromancer Scythe) — Melee attacks raise temporary micro-skeletons
- "Stormcaller" (Valkyrie Halberd) — Every 3rd hit calls a lightning bolt
- "Phasewalker Bow" (Archer Longbow) — Arrows teleport you to where they land
- "Inferno Core" (Wizard Orb) — Fireballs leave permanent burning ground
- "Oathkeeper" (Warrior Sword) — Damage increases the lower your HP (up to +100%)

### Gold Economy
Players earn ~50-80 gold per floor from enemies and chests. Full shop purchase requires saving across multiple floors.

---

## 8. TRAP SYSTEM

### Trap Philosophy
- Readable (visible tells), avoidable (skill-based), interactive (can affect enemies too)
- Light density: 1-2 traps per combat room, more in corridors
- Enemies trigger traps (lure bruiser onto spikes!)
- Some traps can be attacked to disable
- Dodge i-frames work on traps

### Universal Traps

| Trap | Visual Tell | Behavior | Damage |
|------|-----------|----------|--------|
| Spike tiles | Metal grate on floor | Rhythmic extend/retract | 15% HP |
| Pressure plates | Slightly depressed tile | Triggers wall projectiles | 10% HP |
| Pit traps | Cracked floor | Falls through, drops to room below | 20% HP |

### Biome-Specific Traps

**Crypt:** Coffin burst (skeleton leaps out), Swinging blade pendulums, Cursed tiles (temporary debuff)

**Fungal Caves:** Spore vents (poison cloud), Sticky mushroom (50% slow for 3s), Exploding pods (proximity)

**Iron Fortress:** Conveyor belts (push toward hazards), Rotating saw blades (patrol paths), Steam vents (damage + knockback)

**Inferno:** Lava geysers (erupt from marked tiles), Fire jets (sweep across paths), Crumbling floor (falls into lava after 2s)

**Abyss:** Gravity wells (pull toward center), Phase tiles (flicker in/out), Mirror traps (clone your movement as damaging echo)

---

## 9. AI COMPANIONS

### System
- Choose 0-3 AI companions at run start from remaining classes
- Fully autonomous behavior based on class personality
- Scale to 70% of player effectiveness
- Grab loot/potions they walk over (competitive shared loot!)

### Revival
- Walk near downed companion for 3 seconds to revive
- Permadeath if not revived within 30 seconds

### Class AI Personalities

| Companion | AI Personality | Behavior |
|-----------|---------------|----------|
| Warrior | Bodyguard | Stays near player, charges nearby enemies, draws aggro |
| Wizard | Artillery | Maximum distance, targets clusters, blinks when cornered |
| Archer | Skirmisher | Constantly moving, kites, places traps at chokepoints |
| Valkyrie | Sweeper | Clears room edges, destroys spawners first |
| Necromancer | Force multiplier | Hangs back, raises skeletons, targets ranged enemies |

### Difficulty Scaling with Party Size

| Party Size | Enemy HP | Enemy Count | Spawner Rate | Potion Drops |
|-----------|----------|-------------|-------------|-------------|
| Solo | ×1.0 | ×1.0 | Normal | Normal |
| 2 | ×1.4 | ×1.2 | +15% | +10% |
| 3 | ×1.8 | ×1.4 | +30% | +15% |
| 4 | ×2.2 | ×1.6 | +50% | +20% |

### Multiplayer Roadmap
- **Launch:** Solo + AI companions
- **Post-launch:** Local co-op (swap AI for real players)
- **Stretch:** Online co-op

---

## 10. STORY & LORE

### Premise: The Gauntlet of Eternity
An ancient dungeon that manifests beneath a different city every century. Legends say reaching the bottom grants a single wish. Countless heroes have entered. None have returned. The dungeon feeds on their souls, growing deeper and more twisted with each generation. The five biomes are the corrupted memories of civilizations the dungeon consumed.

### Delivery: Environmental Storytelling Only
No cutscenes, no dialogue trees, no text dumps. Lore is communicated through:
- Wall murals and architecture
- Item flavor text and descriptions
- Environmental details and context clues
- Boss arena design

### Boss Lore (Corrupted Champions)

| Boss | Former Identity | Corruption |
|------|----------------|-----------|
| Bone Sovereign | A king who sought to resurrect his kingdom | His people returned as undead; he rules them forever |
| Sporemind | A druid who tried to purify the dungeon | Her power was absorbed and twisted into fungal corruption |
| Iron Warden | An engineer who tried to build a way out | His machines became his prison, fused to his body |
| Ember Tyrant | A warrior who wished for power to destroy the dungeon | He got the power but lost his mind |
| Void Architect | The very first hero, thousands of years ago | Wished to understand the dungeon — became the dungeon |

### Environmental Storytelling by Biome

**Crypt:** Throne room murals showing a king's descent. Coffin inscriptions. Crown fragments as loot.

**Fungal Caves:** Petrified trees with druidic symbols. Overgrown journals. Living walls that pulse like breathing.

**Iron Fortress:** Blueprint fragments for escape tunnels. Half-built machines. Gear inscriptions: "Almost free."

**Inferno:** Scorched battle standards. Melted weapon racks. Charred diary pages: "I can feel it consuming me."

**Abyss:** Rooms that loop. Architecture from ALL previous biomes merged. Void Architect's voice in item descriptions.

### Multiple Endings

Three moral choice moments appear at specific shrines (biomes 2, 3, 4). Wordless, communicated through visuals:

**Choice 1 — Fungal Caves (Compassion):** A trapped ghost reaches out. Free it (costs 20% HP) or walk past.

**Choice 2 — Iron Fortress (Mercy):** A weakened mini-boss surrenders. Spare it (no loot) or execute it (epic gear).

**Choice 3 — Inferno (Sacrifice):** Sacrifice your best equipment to restore a fallen companion, or keep your gear.

### Four Endings

| Choices | Ending | Description |
|---------|--------|-------------|
| 3 selfless | Liberation | Break the cycle, free all souls, bosses shown restored |
| 3 selfish | Ascension | Claim ultimate power, become the next dungeon boss |
| Mixed | Escape | Defeat Void Architect, escape, dungeon seals — bittersweet |
| All skipped | The Eternal | Become a wandering ghost narrator of future heroes' stories |

---

## 11. AUDIO DESIGN

### Music
- **Style:** Pure chiptune / 8-bit
- **Source:** AI-generated
- **System:** Dynamic intensity layering based on gameplay state

### Dynamic Music Layers

| Game State | Music Layer |
|-----------|------------|
| Exploring (no enemies) | Ambient base layer |
| Enemies nearby | +Percussion layer |
| Active combat | +Melody layer, full intensity |
| Low HP | +Heartbeat pulse, muted highs |
| Boss intro | Unique boss theme, dramatic buildup |
| Boss phase 3 | Tempo increase, added urgency |
| Shop/safe room | Calm, melodic, relief theme |
| Death | Music cuts → somber 4-bar phrase |

### Biome Musical Identity

| Biome | Style | Instruments |
|-------|-------|-------------|
| Crypt | Haunting, gothic, minor key | Organ, harpsichord, choir pads, bones percussion |
| Fungal Caves | Alien, trippy, unsettling | Detuned synths, plucked strings, tribal drums |
| Iron Fortress | Industrial, martial, driving | Anvil hits, brass stabs, snare marches |
| Inferno | Aggressive, chaotic, heavy | Distorted bass, war drums, screaming leads |
| Abyss | Cosmic dread, beautiful but wrong | Reversed reverbs, glass harmonics, silence gaps |

### Announcer (Classic Gauntlet Homage)

**Combat:** "[Class] needs food badly!" (HP <25%), "[Class] is about to die!" (HP <10%), "[Class] has been slain!"

**Discovery:** "A secret has been revealed!", "The gods offer a blessing...", "A worthy treasure!"

**Boss:** "A powerful foe awaits...", "[Boss] awakens!", "Phase two!", "Victory!"

**Flavor:** "Remember — don't shoot food!", "Someone needs to destroy those generators!", "Impressive!" (20+ kill streak)

### Audio Asset Estimate
~20 music tracks, ~30 combat SFX, ~15 UI SFX, ~20 environment SFX, ~25 announcer lines = ~110 total

---

## 12. ART DIRECTION

### Visual Identity
- 32×32 pixel art sprites and tiles
- Pure top-down camera (classic Gauntlet perspective)
- CRT post-processing shader (toggleable slider 0-100%, default 75%)
- Limited color palette per biome (~16-24 colors each)

### CRT Shader Components
- Scanlines (horizontal darkened lines)
- Slight RGB separation (chromatic aberration at edges)
- Vignette (darkened corners)
- Bloom/glow (spells and torches bleed light)
- Color banding (limited palette enforcement)
- Optional CRT curvature (barrel distortion)

### Color Palettes by Biome

| Biome | Dominant | Accent | Light Source |
|-------|----------|--------|-------------|
| Crypt | Grays, dark blues, bone white | Torch orange, ghostly green | Torches, candles |
| Fungal Caves | Deep purples, dark greens | Bioluminescent cyan, toxic yellow | Glowing mushrooms |
| Iron Fortress | Gun metal, rust brown, slate | Molten orange, electric blue | Forges, sparks |
| Inferno | Black, deep red, charcoal | Lava orange, hellfire yellow | Lava pools, fire |
| Abyss | Pure black, void purple | Eldritch pink, cosmic white | Floating runes |

### Animation Spec per Character

| Animation | Frames | Directions | Total |
|-----------|--------|------------|-------|
| Idle | 4 | 4 (N/S/E/W) | 16 |
| Walk | 6 | 4 | 24 |
| Attack | 4 | 4 | 16 |
| Dodge/Dash | 3 | 4 | 12 |
| Hit/Hurt | 2 | 1 | 2 |
| Death | 6 | 1 | 6 |
| **Per class** | | | **76** |

5 classes × 76 = 380 total character frames

### VFX
Moderate particles — spell impacts, death puffs, subtle ambiance. Not overwhelming.

### UI Style
CRT-styled throughout (scanlines on menus too, full commitment). Pixel art panels, buttons, health bars, minimap frame.

### Asset Source
All AI-generated (Claude creates all sprites, tilesets, UI, VFX sprites).

---

## 13. SAVE SYSTEM

### Storage
- **Method:** localStorage (browser-based, no account needed)
- **Profiles:** 3 save slots
- **Mid-run:** Auto-save between floors (resume if you quit)

### Permanent Data (persists forever)
Skill tree progress, Soul Shards, unlocked classes, cosmetics, achievements, best run stats, lore entries, endings seen

### Temporary Data (current run, lost on death)
Floor/room position, stats/HP/mana, gear, potions, gold, companion states, dungeon seed, moral choices

### Anti-Cheat (Light)
- Save data base64 encoded (deters casual edits)
- Simple checksum hash (detects tampering)
- No punishment — just a "modified" icon on profile for leaderboard filtering

---

## 14. ACCESSIBILITY

| Feature | Details |
|---------|---------|
| CRT intensity | Slider 0-100%, default 75% |
| Font scaling | Small / Medium / Large / Extra Large |
| Audio cues | Sound cues for key visual events |
| Game speed | Slider 50%-100%, default 100% |
| Controls | Full rebinding + 4 preset schemes |

### Control Presets

| Preset | Layout |
|--------|--------|
| Classic | WASD + Mouse aim + click attack |
| Arrow Keys | Arrows + ZXC for actions |
| Gamepad | Sticks + triggers |
| Accessible | Mouse-only, click to move, auto-aim nearest |

### Audio Cue System

| Visual Event | Audio Cue |
|-------------|-----------|
| Enemy entering screen | Directional audio ping |
| Projectile incoming | Warning whistle (pitch = distance) |
| Trap about to trigger | Ticking acceleration |
| Gear drop (by rarity) | Ascending tone pitch |
| Secret room nearby | Subtle chime pulse |
| Boss phase transition | Dramatic stinger |
| Low HP | Heartbeat rhythm |
| Companion downed | Distress call |

---

## 15. TUTORIAL & ONBOARDING

### Tutorial Type
Optional from main menu ("How to Play"). Skip if experienced.

### Coverage
Movement and combat basics only. Everything else learned through play.

### Optional Tutorial Flow (~60 seconds)
1. "WASD to move" → walk to marker
2. "Click to attack" → destroy 3 training dummies
3. "SPACE to dodge" → dodge through slow projectile
4. "E to use special" → use special on target cluster
5. "Q to drink potion" → heal from dummy damage
6. "You're ready. Enter the Gauntlet." → return to menu

### First-Run Contextual Prompts
Floating text appears once ever on first encounter:
- First enemies: "Click to attack"
- First damage taken: "SPACE to dodge"
- First potion drop: "Q to use potion"
- First spawner: "Destroy the spawner to stop enemies!"
- First gear drop: "Walk over gear to auto-equip upgrades"
- First shop: "Spend gold on supplies"
- First shrine: "Interact to receive a blessing... or a curse"
- First boss door: "Enter when ready. No turning back."

Stored in save profile. "Disable hints" option in settings.

---

## 16. DEVELOPMENT ROADMAP

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| Pre-production | 2-3 weeks | GDD finalized ✅, art style locked ✅, engine chosen ✅ |
| Prototype | 4-6 weeks | 1 class, 1 biome, basic WFC dungeon gen, combat working |
| Alpha | 8-12 weeks | All classes, 3 biomes, skill trees, companions, local save |
| Beta | 4-6 weeks | All 5 biomes, bosses, polish, audio, CRT shader |
| Launch | 2-3 weeks | Bug fixing, optimization, store/hosting setup |
| Post-launch | Ongoing | Local co-op, online co-op, additional content |
