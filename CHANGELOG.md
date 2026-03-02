# Changelog

All notable changes to **The Gauntlet of Eternity** will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Known Issues
- **Boss not spawning on floor 5** - First boss (Bone Sovereign) does not appear

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
| 0.6.1 | 2026-03-02 | Alternative aim mode (movement-based shooting) |
| 0.6.0 | 2026-03-02 | Initial release |
