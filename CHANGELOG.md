 # Changelog

All notable changes to **The Gauntlet of Eternity** will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

---

## [0.7.0] - 2026-03-06

### Added
- **FeatureFlags System**: Master on/off switches for every experimental feature
  - `src/config/FeatureFlags.js` — all flags default to `false`; game is identical to baseline until a flag is enabled
  - Exposed on `window.FeatureFlags` so flags can be toggled live in browser devtools during a run
  - Stable baseline tagged as `v0.6.2-stable` in git — always revertable
- **Balance Panel — FEATURES Tab**: New 5th tab in the G-key debug panel
  - Lists all feature flags grouped by category (Graphics, Combat Feel, UX & Polish, Content & Design)
  - Implemented flags show a live **ON/OFF** toggle that writes directly to `FeatureFlags` — no reload needed
  - Unimplemented flags are grayed out with a **SOON** badge
- **SCREEN_SHAKE** *(flag: off by default)*: Camera shake on combat hits
  - Light shake (80ms / 0.002) on every enemy hit
  - Stronger shake (150ms / 0.005) when the player takes damage
- **DAMAGE_VIGNETTE** *(flag: off by default)*: Red border flash when player is hit
  - Four Graphics rects at screen edges, depth 999, fixed to camera, fade out in 250ms
- **WEAPON_SWAP_SFX** *(flag: off by default)*: Plays `sfx_equip` sound on weapon swap
- **CRIT_SYSTEM** *(flag: off by default)*: Crit rolls in combat
  - Checks `source.critChance` before defence is applied; 1.5× damage multiplier on crit
  - Emits `isCrit` flag on `ENTITY_DAMAGED` event for downstream systems
- **DYNAMIC_DAMAGE_NUMBERS** *(flag: off by default)*: Damage numbers vary by hit type
  - Crits: gold `20px` text with `!` suffix, scale 1.25×, floats 55px
  - Heals: green, slower float (1.3× duration)
  - Normal hits: unchanged from baseline
- **HIT_PARTICLES** *(flag: off by default)*: Spark burst at point of impact
  - 6 Arc GameObjects (no texture needed) radiate from hit position in attacker's class colour
  - Crits spawn 10 larger particles
- **DEATH_PARTICLES** *(flag: off by default)*: Particle burst when enemy dies
  - 12 coloured circles explode radially; colour matches enemy type
  - (swarmer=brown, bruiser=tan, ranged=blue, bomber=orange, elite=purple)
- **DODGE_IFRAME_AURA** *(flag: off by default)*: Blue pulsing ring during dodge iframes
  - Appears exactly when iframes start, disappears when they end (not tied to full animation)
  - Pulsing scale tween (1.0→1.25×) makes the protection window clearly readable
- **WEAPON_LEVELUP_FANFARE** *(flag: off by default)*: Celebration on weapon progression
  - Level-up: white camera flash + powerup SFX (`sfx_sounds_powerup4`)
  - Perk unlock: gold camera flash + fanfare SFX (`sfx_sounds_fanfare2`) + subtle shake
  - Effects routed through GameScene camera so the UIScene overlay stays crisp
- **BOSS_PHASE_VFX** *(flag: off by default)*: Replaces plain orange flash on phase change
  - 6-frame boss blink sequence (rapid alpha flicker over 300ms)
  - Expanding shockwave ring (scale 1→6, alpha 1→0 over 500ms) in boss colour
  - 16-particle radial burst matching boss colour
  - Camera shake 250ms / 0.008 intensity
- **FLOOR_DIFFICULTY_SCALE** *(flag: off by default)*: Enemy stat scaling per floor
  - HP: `baseHp × (1 + (floor - 1) × 0.12)` — floor 10 enemies have ~2× HP
  - Damage: `baseDmg × (1 + (floor - 1) × 0.08)`
  - Applied after entity construction so all enemy subclasses benefit automatically
- **FLOOR_TRANSITION_SCREEN** *(flag: off by default)*: Per-floor stats summary on floor descent
  - Snapshots kills, gold earned, damage dealt, and time on the current floor before advancing
  - Stats displayed as a text block during the dark overlay (1800ms hold vs 800ms without flag)
  - Stats reset after the new floor is built
- **TUTORIAL_HINTS** *(flag: off by default)*: Contextual first-run hints for new players
  - Gates the existing `TutorialPromptSystem` — all prompts are suppressed until flag is enabled
  - Each hint shown exactly once per save profile (persisted via `saveManager.updatePermanent`)
  - Typewriter reveal, auto-dismiss after 4 seconds, or on relevant player action
- **LOW_HEALTH_HEARTBEAT** *(flag: off by default)*: Looping alarm audio when player HP is critical
  - Starts `announcer_health_warning` loop when HP drops below 25%
  - Switches to `announcer_health_critical` loop if HP drops below 10%
  - Stops immediately when HP recovers above 25%
  - Automatically silenced on floor transitions via `resetCombatState()`
- **LOOT_PITY** *(flag: off by default)*: Guaranteed legendary after 50 non-legendary gear drops
  - Pity counter tracks non-legendary gear drops within a run (resets on run end)
  - When counter reaches 50, the next gear drop is forced to `RARITY.LEGENDARY` and counter resets
  - Counter also resets on any natural legendary drop
- **BIOME_COLOR_GRADING** *(flag: off by default)*: Per-biome fullscreen color tint overlay
  - Fullscreen rectangle at depth 800 / scrollFactor 0 — sits above game objects, below UIScene
  - Crossfades over 800ms on biome entry (Sine ease)
  - Crypt: deep purple (α 0.15) · Fungal Caves: sickly green (α 0.12) · Iron Fortress: cold steel blue (α 0.12) · Inferno: hot orange-red (α 0.15) · The Abyss: void black-purple (α 0.18)
  - No shader changes required — works in both Canvas and WebGL
- **BOSS_ENTRANCE** *(flag: off by default)*: Dramatic 2-second sequence when boss spawns
  - Boss starts at alpha 0 (invisible)
  - Black camera flash (300ms) + shake (400ms / 0.012)
  - Boss fades in over 600ms with red expanding shockwave ring at spawn point
  - Falls back to original 200ms shake when flag is off

### Added
- **Dual Weapon System**: Players carry two weapons and swap with 1/2 keys
  - Each weapon type has distinct attack behavior (range, arc, speed, knockback)
  - Auto-equip fills empty slots first, then replaces inactive weapon if better
  - 300ms swap cooldown prevents spam
- **Weapon XP & Leveling**: Weapons gain XP from kills and level up during a run
  - 5 levels per weapon (XP thresholds: 50/150/350/700)
  - XP per kill: 10 normal, 25 elite, 100 boss
  - Per-run only — lost on death
- **Weapon Perks**: 2 unique perks per weapon type, unlocking at levels 2 and 4
  - Examples: Sword gets Wide Sweep (+20 arc) at Lv.2, Long Blade (+8 range) at Lv.4
- **Valkyrie Weapons**: Spear (narrow thrust), Halberd (wide arc), Lance (long reach)
- **Necromancer Weapons**: Scythe (cone), Cursed Tome (piercing projectile), Bone Wand (homing)
- **New Combat Mechanics**: MultiShot (angular spread), Homing projectiles, Stun Chance on melee/cone hits
- **Weapon HUD**: Dual weapon display with XP bars, active highlight, level-up and perk-unlock notifications

### Changed
- Weapons moved from `gear.weapon` to dedicated `weapons[0,1]` array on Player
- Attack behavior now driven by equipped weapon's `attackStyle` instead of fixed class data
- Pause menu inventory shows both weapon slots with level and rarity
- Shop weapon purchases route through dual-weapon equip logic
- Moral choice "sacrifice" clears both weapon slots

### Fixed
- **Pause menu inventory crash**: Rarity display called `.toUpperCase()` on a number; now uses `rarityName` string

### Performance
- **Boss attack listener cleanup**: All boss attack methods (projectile, homing, beam, spin, aoe_zone, cone_breath, gravity_well) now properly track and clean up their update listeners when the boss dies or scene shuts down
- **Projectile listener tracking**: Player projectiles in CombatSystem now track their update listeners and clean them up on scene destroy
- **EventBus listener hygiene**: Moved PLAYER_ATTACK listener registration from buildFloor() to create() to prevent potential accumulation
- **Status effect icon cleanup**: Icons are now destroyed immediately when effects are removed, regardless of entity state

### Fixed
- **Removed debug visuals**: Removed red debug rectangle from boss trigger zones

### Known Issues
| # | Bug | Description | Discovered | Fixed |
|---|-----|-------------|------------|-------|
| 3 | Monsters spawn offset from spawners | Enemies don't spawn exactly on the spawner positions | 2026-03-02 | - |
| 4 | Player spawn doesn't match staircase | Player appears at random location instead of near staircase entrance | 2026-03-02 | - |
| 5 | No mana cooldown visual | Missing visual indicator when mana ability is on cooldown | 2026-03-02 | - |

---

## [0.6.2] - 2026-03-03

### Added
- **Music System**: Full 8-bit soundtrack integration (CodeManu music pack)
  - 20 music tracks across menus, gameplay, bosses, shops, and more
  - Title Theme for menus and character selection
  - Main Theme for all gameplay biomes
  - Boss Battle theme for regular bosses
  - Final Boss theme for Void Architect (floor 25)
  - Take Some Rest theme for shops
  - Victory fanfare for boss defeats
  - Game Over and Ending themes
- **Loading Screen Improvements**
  - Real-time loading bar with percentage display (0% → 100%)
  - "Click anywhere to start" prompt after loading completes
  - Click-to-start unlocks audio context (fixes browser autoplay policy)
  - Smooth fade transition to menu

### Fixed
- **Boss not spawning on teleport**: Reset `_bossIntroTriggered` flag on scene restart
- **Stairs visible on boss floors**: Stairs now only appear after boss is defeated
- **Double music playing**: Fixed title music overlapping with gameplay music during scene transitions
- **DungeonManager tileset flag**: Fixed `_useFullTileset` not being set on scene restart
- **Boss attack scene references**: Captured scene references in all boss attack methods to prevent null errors

### Changed
- AudioManager now stops any lingering title music when starting biome music
- CharSelectScene stops title music immediately instead of using tweens
- MenuScene simplified music handling (audio context already unlocked by BootScene)
- Biome music now uses Main Theme for all gameplay areas (unified soundtrack)

---

## [0.6.1] - 2026-03-02

### Added
- **Alternative Aim Mode**: New "Movement Aim" control scheme
  - Toggle between Mouse Aim and Movement Aim in settings
  - Mouse Aim (default): Click to attack, Spacebar to dodge, aim follows cursor
  - Movement Aim: Spacebar to attack, Shift to dodge, aim follows WASD direction
  - Setting persists across sessions via localStorage
- **Main Menu Settings Panel**: Full settings overlay accessible from title screen
  - CRT intensity slider
  - Music/SFX volume sliders
  - Aim mode toggle with keybind info
  - Animated open/close with ESC support
- **In-Game Settings**: Aim mode toggle added to pause menu (ESC > SETTINGS tab)
  - Shows dynamic keybind info based on current mode
  - Changes apply immediately without restart

### Changed
- `KeyboardMouseInput` class now tracks last movement direction for movement-based aiming
- Settings system extended with `aimMode` property

---

## [0.6.0] - 2026-03-02

### Added
- Initial release of The Gauntlet of Eternity
- 5 playable classes: Warrior, Wizard, Archer, Valkyrie, Necromancer
- 5 biomes: Crypt, Fungal Caves, Iron Fortress, Inferno, The Abyss
- 25 floors with procedural dungeon generation (Wave Function Collapse)
- 5 boss encounters with multi-phase fights
- Companion AI system
- Fog of war with minimap
- Loot system with rarity tiers
- Shop system
- Shrine interactions
- Trap system per biome
- Secret rooms
- Skill tree progression with Soul Shards
- 3 save profiles
- Moral choice system with 4 endings
- CRT post-processing shader
- Dynamic audio with biome-specific music
- Announcer voice lines
- Tutorial prompt system

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 0.7.0 | 2026-03-06 | FeatureFlags system, 17 experimental features, dual weapons, weapon XP & perks |
| 0.6.2 | 2026-03-03 | Music system, loading screen improvements, boss spawn fixes |
| 0.6.1 | 2026-03-02 | Alternative aim mode (movement-based shooting) |
| 0.6.0 | 2026-03-02 | Initial release |
