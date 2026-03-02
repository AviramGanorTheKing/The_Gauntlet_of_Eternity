# CLAUDE.md — The Gauntlet of Eternity

## Project Overview

You are building **The Gauntlet of Eternity**, a 2D top-down roguelike dungeon crawler inspired by classic Gauntlet. Read `GDD.md` for the complete game design document. This file contains technical instructions for building the game.

## Tech Stack

- **Engine:** Phaser 3 (latest stable via CDN or npm)
- **Language:** JavaScript (ES6+)
- **Renderer:** WebGL (required for CRT post-processing shader)
- **Build:** No build step required for prototype — single HTML entry point. Add Vite/webpack later if needed.
- **Storage:** localStorage for save system
- **Audio:** Phaser built-in audio manager with Web Audio API

## Project Structure

```
gauntlet-of-eternity/
├── index.html                    # Entry point
├── CLAUDE.md                     # This file
├── GDD.md                        # Game Design Document
├── package.json                  # Dependencies (if using npm)
├── assets/
│   ├── sprites/
│   │   ├── characters/           # Player + companion sprite sheets
│   │   │   ├── warrior.png
│   │   │   ├── wizard.png
│   │   │   ├── archer.png
│   │   │   ├── valkyrie.png
│   │   │   └── necromancer.png
│   │   ├── enemies/              # Enemy sprite sheets per biome
│   │   │   ├── crypt/
│   │   │   ├── caves/
│   │   │   ├── fortress/
│   │   │   ├── inferno/
│   │   │   └── abyss/
│   │   ├── bosses/               # Boss sprite sheets
│   │   ├── items/                # Gear, potions, pickups
│   │   └── fx/                   # VFX sprite sheets
│   ├── tiles/
│   │   ├── crypt.png             # Biome tilesets
│   │   ├── caves.png
│   │   ├── fortress.png
│   │   ├── inferno.png
│   │   └── abyss.png
│   ├── ui/                       # HUD elements, menus, fonts
│   └── audio/
│       ├── music/                # Chiptune tracks per biome
│       └── sfx/                  # Sound effects
├── src/
│   ├── main.js                   # Phaser config + game boot
│   ├── config/
│   │   ├── GameConfig.js         # Game constants, balance numbers
│   │   ├── ClassData.js          # All class stats, abilities, skill trees
│   │   ├── EnemyData.js          # Enemy definitions per biome
│   │   ├── BiomeData.js          # Biome configs, tile rules, palettes
│   │   ├── BossData.js           # Boss definitions, phases, attacks
│   │   ├── GearData.js           # Weapon types, armor, accessories, properties
│   │   ├── TrapData.js           # Trap definitions per biome
│   │   ├── ShrineData.js         # Shrine types and effects
│   │   ├── PerkData.js           # Skill tree node definitions
│   │   └── LoreData.js           # Item descriptions, environmental text
│   ├── scenes/
│   │   ├── BootScene.js          # Asset preloading, splash screen
│   │   ├── MenuScene.js          # Title screen (CRT styled)
│   │   ├── ProfileScene.js       # Save slot selection (3 profiles)
│   │   ├── CharSelectScene.js    # Class + companion picker
│   │   ├── SkillTreeScene.js     # Persistent skill tree management
│   │   ├── GameScene.js          # Main gameplay loop
│   │   ├── UIScene.js            # HUD overlay (runs parallel to GameScene)
│   │   ├── PauseScene.js         # Pause menu, map, inventory
│   │   ├── BossIntroScene.js     # Boss intro animation
│   │   ├── DeathScene.js         # Run stats, shard earnings
│   │   ├── VictoryScene.js       # Ending scenes
│   │   └── TutorialScene.js      # Optional tutorial
│   ├── systems/
│   │   ├── WFCGenerator.js       # Wave Function Collapse dungeon generation
│   │   ├── DungeonManager.js     # Floor management, room transitions
│   │   ├── FogOfWar.js           # Tile-based visibility system
│   │   ├── CombatSystem.js       # Damage calc, knockback, status effects
│   │   ├── LootSystem.js         # Drop tables, rarity rolls, auto-equip
│   │   ├── StatusEffects.js      # Poison, burn, freeze, etc.
│   │   ├── SpawnerSystem.js      # Enemy generator logic
│   │   ├── TrapSystem.js         # Trap behavior and triggers
│   │   ├── ShrineSystem.js       # Shrine interactions and effects
│   │   ├── CompanionAI.js        # Companion behavior per class
│   │   ├── ProgressionManager.js # Skill trees, soul shards, unlocks
│   │   ├── SaveManager.js        # localStorage read/write, profiles
│   │   ├── AudioManager.js       # Dynamic music layering, SFX
│   │   ├── AnnouncerSystem.js    # Voice line triggers and playback
│   │   └── MoralChoiceSystem.js  # Track moral choices for endings
│   ├── entities/
│   │   ├── Player.js             # Player base class
│   │   ├── classes/
│   │   │   ├── Warrior.js
│   │   │   ├── Wizard.js
│   │   │   ├── Archer.js
│   │   │   ├── Valkyrie.js
│   │   │   └── Necromancer.js
│   │   ├── Companion.js          # AI companion wrapper
│   │   ├── Enemy.js              # Base enemy class
│   │   ├── enemies/
│   │   │   ├── Swarmer.js
│   │   │   ├── Bruiser.js
│   │   │   ├── RangedEnemy.js
│   │   │   ├── Bomber.js
│   │   │   └── Elite.js
│   │   ├── Boss.js               # Base boss class
│   │   ├── bosses/
│   │   │   ├── BoneSovereign.js
│   │   │   ├── Sporemind.js
│   │   │   ├── IronWarden.js
│   │   │   ├── EmberTyrant.js
│   │   │   └── VoidArchitect.js
│   │   ├── Spawner.js            # Monster generator entity
│   │   ├── Projectile.js         # Projectile base (arrows, fireballs, etc.)
│   │   ├── Pickup.js             # Potions, gold, gear drops
│   │   └── Trap.js               # Trap entity base
│   ├── ai/
│   │   ├── StateMachine.js       # Finite state machine for AI
│   │   ├── behaviors/
│   │   │   ├── ChasePlayer.js    # Swarmer behavior
│   │   │   ├── PatrolAndCharge.js # Bruiser behavior
│   │   │   ├── KeepDistance.js   # Ranged enemy behavior
│   │   │   ├── Kamikaze.js       # Bomber behavior
│   │   │   └── CompanionBehaviors.js # Per-class companion AI
│   │   └── Pathfinding.js        # A* or similar for navigation
│   ├── shaders/
│   │   └── CRTShader.js          # WebGL CRT post-processing pipeline
│   └── utils/
│       ├── MathUtils.js          # Vector math, random helpers
│       ├── ObjectPool.js         # Object pooling for performance
│       ├── EventBus.js           # Global event system
│       └── Constants.js          # Enums, magic numbers
```

## Architecture Guidelines

### Scene Management
- `GameScene` and `UIScene` run in parallel (Phaser scene stacking)
- `UIScene` renders HUD on top of `GameScene`
- Scene transitions use Phaser's scene manager with fade effects
- Boss intro is a brief overlay scene, then returns to GameScene

### Entity System
- All entities (player, companions, enemies, bosses) extend a common base
- Every entity has an ID — this enables future multiplayer swap (AI → human)
- Use Phaser Groups for object pooling (enemies, projectiles, pickups)
- Companion entities use the same classes as Player but with AI input

### Input Abstraction
```javascript
// Input should be abstracted so AI and human input are interchangeable
class InputSource {
  getMovement() {}  // returns {x, y} normalized
  getAimDirection() {} // returns {x, y} normalized
  isAttackPressed() {}
  isDodgePressed() {}
  isSpecialPressed() {}
  isPotionPressed() {}
}

class KeyboardMouseInput extends InputSource { ... }
class GamepadInput extends InputSource { ... }
class AIInput extends InputSource { ... }  // For companions
```

### Combat System
- Use Phaser Arcade Physics for collision detection
- Hitboxes are separate from sprite bounds (attack hitboxes are temporary)
- Knockback applies velocity directly to physics body
- Damage numbers are pooled text objects with tween animations
- White flash uses `setTintFill(0xffffff)` with a timer reset

### WFC Dungeon Generator
- Input: biome tile rules (adjacency constraints), floor size
- Output: 2D grid of tile IDs
- Post-process: ensure connectivity (verify all rooms reachable)
- Place spawners, chests, shrines, secrets, traps after generation
- Room templates for special rooms (boss, shop, shrine, trap gauntlet)

### Fog of War
- Maintain a 2D boolean grid matching the tilemap
- Each tile starts hidden (dark overlay)
- Reveal tiles within player's vision radius each frame
- Previously seen tiles show at 50% brightness (explored but not visible)
- Minimap mirrors this state

### CRT Shader
- Implement as Phaser WebGL Pipeline (extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline)
- Uniforms: intensity (0-1), scanlineWeight, vignetteStrength, chromaticAmount, bloomStrength
- Apply to main camera as post-processing effect
- Must be toggleable via settings (slider 0-100%)

### Save System
```javascript
// Key format: "gauntlet_profile_[1|2|3]"
// Data structure: see GDD.md section 13
// Auto-save triggers: floor transition, boss defeat, shop exit
// Load on boot: check for active run in selected profile
// Base64 encode + checksum for light tamper detection
```

### Dynamic Audio
- Music tracks have 3 layers: ambient, percussion, melody
- Layers are separate audio files, played simultaneously
- Fade layers in/out based on game state (see GDD.md section 11)
- SFX use Phaser's sound manager with spatial audio for directional cues
- Announcer lines triggered by EventBus events

## Build Order (Recommended Implementation Sequence)

### Phase 1: Core Loop (Get Something Playable)
1. `main.js` + `BootScene` + `MenuScene` — basic app structure
2. `GameScene` with a hardcoded test room (no generation yet)
3. `Player.js` — movement with WASD, mouse aiming
4. Basic attack (Warrior sword swing as first class)
5. `Enemy.js` — single Swarmer with chase AI
6. `CombatSystem.js` — damage, knockback, white flash, damage numbers
7. Dodge mechanic with i-frames
8. Death → restart loop

### Phase 2: Dungeon Generation
9. `WFCGenerator.js` — implement WFC algorithm
10. Crypt tileset (first biome)
11. `DungeonManager.js` — room transitions, floor progression
12. `FogOfWar.js` — visibility system
13. `Spawner.js` — enemy generators
14. Multiple enemy types (Swarmer, Bruiser, Ranged, Bomber)
15. Floor stairs → next floor

### Phase 3: Game Systems
16. `LootSystem.js` — gear drops, auto-equip, rarity
17. `Pickup.js` — potions, gold
18. Health + Mana potion system
19. Special abilities (mana cost + cooldown)
20. `UIScene` — full HUD (HP, mana, minimap, gold, potions, floor)
21. `StatusEffects.js` — poison, burn, freeze, etc.
22. `TrapSystem.js` — traps per biome
23. `ShrineSystem.js` — shrine interactions

### Phase 4: Content
24. All 5 character classes with unique attacks + specials
25. `CompanionAI.js` — AI companions with class personalities
26. All 5 biome tilesets + WFC rules
27. All boss encounters (5 bosses, 3 phases each)
28. `BossIntroScene.js` — boss intro sequences
29. Shops and shop UI
30. Secret rooms

### Phase 5: Progression
31. `ProgressionManager.js` — skill trees, soul shards
32. `SkillTreeScene.js` — skill tree UI
33. `SaveManager.js` — full save/load system, 3 profiles
34. Class unlocking (Valkyrie at floor 11, Necromancer at floor 20 boss)
35. Cosmetic unlocks + achievement tracking
36. `MoralChoiceSystem.js` — 3 moral choices + 4 endings

### Phase 6: Polish
37. `CRTShader.js` — full CRT post-processing
38. `AudioManager.js` — dynamic music layering
39. `AnnouncerSystem.js` — voice line triggers
40. All VFX (particles, spell impacts, death animations)
41. Menu polish (title screen, char select, death screen)
42. `TutorialScene.js` — optional tutorial + contextual prompts
43. Settings menu (CRT slider, font size, game speed, rebinding)
44. Accessibility features (audio cues, control presets)

## Code Style

- Use ES6 classes and modules
- Phaser scenes use `create()`, `update(time, delta)` pattern
- Use `EventBus` for cross-system communication (not direct references)
- Constants in ALL_CAPS
- All balance numbers in config files (not hardcoded in logic)
- Comment complex algorithms (especially WFC and pathfinding)
- Use JSDoc for public methods

## Performance Targets

- 60 FPS on modern browsers
- Object pooling for all frequently created/destroyed entities
- Limit active enemies to ~50 per room
- Limit active projectiles to ~100
- Fog of war updates only on player movement (not every frame)
- Tilemap culling (only render visible tiles)

## Key Phaser 3 Patterns to Use

```javascript
// Object pooling
this.enemyPool = this.physics.add.group({
  classType: Enemy,
  maxSize: 50,
  runChildUpdate: true
});

// Timed events
this.time.addEvent({ delay: 1500, callback: this.onDodgeCooldownReset, callbackScope: this });

// Tweens for juice
this.tweens.add({ targets: enemy, alpha: 0, duration: 200, yoyo: true }); // flash

// Camera effects
this.cameras.main.flash(100); // on boss phase transition
this.cameras.main.setZoom(1); // base zoom

// Tilemap from WFC output
const map = this.make.tilemap({ data: wfcOutput, tileWidth: 32, tileHeight: 32 });
```

## Asset Generation Notes

All art assets will be AI-generated as PNG sprite sheets:
- Characters: single sprite sheet per class, all animations in a grid
- Tilesets: standard tilemap format (rows of 32×32 tiles)
- VFX: small sprite sheets for animated effects
- UI: individual PNG elements for HUD components

Color palettes per biome are defined in GDD.md section 12. Each biome uses ~16-24 colors maximum.

## Testing Checklist

Before each phase is "done":
- [ ] No console errors
- [ ] 60 FPS maintained
- [ ] All inputs responsive (keyboard, mouse)
- [ ] No soft-locks (player can always progress or die)
- [ ] Save/load doesn't corrupt data
- [ ] Fog of war reveals correctly
- [ ] Enemies don't spawn in walls
- [ ] All rooms are reachable (WFC connectivity check)
- [ ] Potions heal correct amount
- [ ] Damage numbers are accurate
- [ ] Dodge i-frames work against all damage sources
