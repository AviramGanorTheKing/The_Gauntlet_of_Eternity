# Changelog

All notable changes to **The Gauntlet of Eternity** will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

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
| 0.6.2 | 2026-03-03 | Music system, loading screen improvements, boss spawn fixes |
| 0.6.1 | 2026-03-02 | Alternative aim mode (movement-based shooting) |
| 0.6.0 | 2026-03-02 | Initial release |
