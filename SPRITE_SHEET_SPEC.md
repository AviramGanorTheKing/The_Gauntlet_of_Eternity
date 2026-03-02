# Sprite Sheet Specification — The Gauntlet of Eternity

## Art Style
- **32x32 pixel art**, pure top-down perspective (looking straight down at characters)
- **Limited palette**: ~16-24 colors per biome
- **CRT retro aesthetic**: designed to look good with scanlines and slight glow
- **Dark dungeon-crawler tone**: Gauntlet / Enter the Gungeon inspired

---

## 1. PLAYER CHARACTERS (5 classes)

Each character needs a **sprite sheet** with all animation frames laid out in a grid.
**Per character: 76 frames total** (see table below).

### Animation Spec

| Animation | Frames | Directions | Subtotal |
|-----------|--------|------------|----------|
| Idle      | 4      | 4 (N/S/E/W) | 16     |
| Walk      | 6      | 4          | 24       |
| Attack    | 4      | 4          | 16       |
| Dodge/Dash| 3      | 4          | 12       |
| Hit/Hurt  | 2      | 1          | 2        |
| Death     | 6      | 1          | 6        |
| **Total** |        |            | **76**   |

### Layout
Sprite sheet grid: **each frame is 32x32 pixels**.
Suggested layout: rows = animation, columns = frames × directions.
Example: Row 1 = Idle North (4 frames), Idle East (4), Idle South (4), Idle West (4) = 16 cells wide.

---

### 1.1 WARRIOR
- **Colors**: Red armor, silver sword, brown leather
- **Palette**: #cc4444 (body), #882222 (dark armor), #cccccc (sword blade), #886633 (hilt/leather), #ddaa88 (skin)
- **Description**: Stocky armored knight with a broadsword. Wears a metal helmet with a T-shaped visor. Red tabard over chainmail. Sword held in right hand.
- **Idle**: Slight breathing motion, sword at rest
- **Walk**: Armored march, sword bobbing
- **Attack**: Wide 90° horizontal sword swing from right to left
- **Dodge**: Shoulder-first lunge/roll
- **Hit**: Knocked back, armor flash
- **Death**: Falls to knees, collapses forward

### 1.2 WIZARD
- **Colors**: Blue robes, brown staff, cyan magic crystal
- **Palette**: #4444cc (robes), #222288 (dark robe), #664422 (staff wood), #44ccff (crystal glow), #ddaa88 (skin)
- **Description**: Thin robed figure with a pointed hat and a wooden staff topped with a glowing blue crystal. Long flowing robes.
- **Idle**: Crystal pulses with light
- **Walk**: Robes flow, staff plants forward
- **Attack**: Thrusts staff forward, crystal fires a projectile (fireball)
- **Dodge**: Quick blink/teleport shimmer (semi-transparent)
- **Hit**: Stumbles back, hat tilts
- **Death**: Crumples, staff falls, crystal dims

### 1.3 ARCHER
- **Colors**: Green leather armor, brown bow, yellow-feathered arrows
- **Palette**: #44aa44 (armor), #226622 (dark leather), #886633 (bow wood), #ccaa44 (arrow/gold accents), #ddaa88 (skin)
- **Description**: Lean ranger in green leather armor with a hood. Carries a wooden shortbow. Quiver on back.
- **Idle**: Bow lowered, arrow nocked
- **Walk**: Quick light footsteps, hood bounces
- **Attack**: Draws bow back, releases arrow (projectile)
- **Dodge**: Acrobatic side-roll
- **Hit**: Knocked sideways
- **Death**: Collapses, bow slides away

### 1.4 VALKYRIE
- **Colors**: Golden armor, white wings (small), silver spear, blue cape
- **Palette**: #ddaa22 (gold armor), #887711 (dark gold), #cccccc (spear/silver), #ffffff (wings), #ddaa88 (skin)
- **Description**: Tall warrior woman in ornate golden armor with small decorative wings on the helmet/shoulders. Carries a spear in one hand and a round shield in the other.
- **Idle**: Spear upright, shield ready
- **Walk**: Confident stride, cape flows
- **Attack**: Narrow forward spear thrust
- **Dodge**: Shield-first dash
- **Hit**: Braces behind shield
- **Death**: Falls gracefully, wings fold

### 1.5 NECROMANCER
- **Colors**: Dark purple robes, black hood, green glowing eyes, skull motif
- **Palette**: #6633aa (robes), #331166 (dark cloak), #220022 (hood shadow), #44ff44 (green glow), #bbaa99 (pale skin)
- **Description**: Sinister hooded figure in tattered dark purple robes. Face hidden in shadow except for glowing green eyes. Carries a skull-topped staff. Cloak edges ragged.
- **Idle**: Green energy wisps around hands
- **Walk**: Glides more than walks, robes trail
- **Attack**: Fires a dark wave cone (purple energy spread)
- **Dodge**: Phase-shift (body briefly turns translucent/ghostly)
- **Hit**: Recoils, hood falls back briefly
- **Death**: Dissolves into purple smoke

---

## 2. ENEMIES

Each enemy needs the same animation set but simpler (fewer directions).
**Per enemy: 24 frames**.

| Animation | Frames | Directions | Subtotal |
|-----------|--------|------------|----------|
| Idle      | 2      | 1          | 2        |
| Walk      | 4      | 4 (N/S/E/W) | 16     |
| Attack    | 3      | 1          | 3        |
| Death     | 3      | 1          | 3        |
| **Total** |        |            | **24**   |

---

### 2.1 SWARMER
- **Size**: 32x32
- **Colors**: Sickly green body, red eyes, dark legs
- **Description**: Small spider-like creature with 8 legs. Round bulbous body, two glowing red eyes. Skitters quickly. Think dungeon spider/tick.
- **Idle**: Legs twitch, eyes glow
- **Walk**: Fast skittering motion
- **Attack**: Lunges forward with fangs
- **Death**: Legs curl inward, flips onto back

### 2.2 BRUISER
- **Size**: 32x32 (fills most of the frame — this is a big enemy)
- **Colors**: Brown/tan hide, red eyes, dark gray fists
- **Description**: Large hulking ogre/troll creature. Massive shoulders, small head, huge fists. Armored with bone plates. Slow but menacing.
- **Idle**: Pounds fists together
- **Walk**: Heavy stomping gait
- **Attack**: Overhead slam with both fists (has a red telegraph flash before charging)
- **Death**: Falls forward with a thud

### 2.3 RANGED ENEMY
- **Size**: 32x32
- **Colors**: Dark purple/magenta robes, glowing green eyes, shadowy
- **Description**: Hooded cultist/mage figure. Triangular silhouette (wide robe base, narrow hood top). Holds a glowing orb between hands. Fires magical projectiles.
- **Idle**: Orb pulses between hands
- **Walk**: Floats/glides slightly above ground
- **Attack**: Thrusts orb forward, fires a magenta energy bolt
- **Death**: Robe collapses empty (body vanishes)

### 2.4 BOMBER
- **Size**: 32x32
- **Colors**: Dark gray/black round body, yellow fuse spark, orange grin, red glow when close
- **Description**: Round bomb-shaped creature with stubby legs. Has a lit fuse on top with a yellow spark. Evil grinning face. Pulses red when near player (about to explode). Suicide enemy.
- **Idle**: Fuse sparks, slight wobble
- **Walk**: Rolls/waddles toward player, fuse burns shorter
- **Attack**: Swells up, turns bright red, EXPLODES (AoE)
- **Death**: Same as attack — explosion animation

### 2.5 ELITE ENEMY
- **Size**: 32x32
- **Colors**: Dark version of any base enemy type + golden/white glow aura
- **Description**: A larger, glowing version of any base enemy. Has a bright aura outline and glowing eyes. Visually distinct "this one is dangerous" read.
- **Variations**: Elite Swarmer, Elite Bruiser, Elite Ranged, Elite Bomber (4 variants, each is a slightly modified base enemy with glow)

---

## 3. BOSSES (5 unique bosses)

Each boss needs more animation frames due to multi-phase combat.
**Per boss: ~40 frames. Size: 64x64 pixels** (2x normal entity size).

| Animation | Frames | Subtotal |
|-----------|--------|----------|
| Idle      | 4      | 4        |
| Walk/Move | 4      | 4        |
| Attack 1  | 6      | 6        |
| Attack 2  | 6      | 6        |
| Attack 3  | 6      | 6        |
| Telegraph | 4      | 4        |
| Hit       | 2      | 2        |
| Phase Transition | 4 | 4     |
| Death     | 6      | 6        |
| **Total** |        | **42**   |

---

### 3.1 THE BONE SOVEREIGN (Crypt Boss, Floor 5)
- **Colors**: Bone white, dark eye sockets, tattered royal purple cape, golden crown
- **Description**: Massive skeletal king sitting on a bone throne (that's part of his body). Wears a cracked golden crown. Holds a huge bone sword. Tattered purple cape. Eye sockets glow with ghostly green fire.
- **Attack 1**: Sword slam — raises sword overhead, slams down (AoE circle)
- **Attack 2**: Bone spear throw — hurls a bone lance in a line
- **Attack 3**: Detaches arm — arm flies as homing projectile, then returns
- **Phase Transition**: Body crumbles and reassembles larger/angrier

### 3.2 THE SPOREMIND (Fungal Caves Boss, Floor 10)
- **Colors**: Sickly green/purple, bioluminescent cyan spots, toxic yellow spores
- **Description**: Giant pulsating fungal mass rooted to the floor. Multiple eye-stalks with glowing cyan eyes. Extending tendrils/vines. Cannot move — the room is its weapon. Mushroom growths cover its body.
- **Attack 1**: Spore cloud — releases toxic yellow puffs (AoE poison zones)
- **Attack 2**: Tendril sweep — extends vines across the arena floor
- **Attack 3**: Room pulse — entire body contracts then pulses with damage wave
- **Phase Transition**: Shrinks inward, then erupts larger with more eyes

### 3.3 THE IRON WARDEN (Iron Fortress Boss, Floor 15)
- **Colors**: Gun metal gray, rust brown joints, blue electric eyes, orange forge glow
- **Description**: Colossal mechanical knight/golem. Riveted armor plates, glowing blue eyes through visor slit. Gears visible at joints. Changes weapons between phases (sword+shield → dual axes → cannon arm).
- **Attack 1**: Charge attack — shield forward, rushes across arena
- **Attack 2**: Spin combo — whirls with axes extended
- **Attack 3**: Cannon barrage — arm transforms into cannon, fires explosive rounds
- **Phase Transition**: Mechanical transformation, gears grind, sparks fly

### 3.4 THE EMBER TYRANT (Inferno Boss, Floor 20)
- **Colors**: Deep red/black skin, fire orange flames, yellow hellfire eyes
- **Description**: Demonic warlord wreathed in flames. Massive horns, burning sword, cloven hooves. Leaves fire trails when moving. Wings of pure flame on back. The most aggressive, fearsome boss.
- **Attack 1**: Flame sword combo — 3-hit chain of fire slashes
- **Attack 2**: Fire breath — cone of flames from mouth
- **Attack 3**: Teleport-slash — disappears in fire, reappears behind player with a slash
- **Phase Transition**: Erupts in a pillar of fire, arena lava rises

### 3.5 THE VOID ARCHITECT (Abyss Boss, Floor 25)
- **Colors**: Deep void purple/black, cosmic white/pink accents, eldritch/alien
- **Description**: Eldritch floating entity — not humanoid. Geometric impossible shape (shifting polyhedron?) with multiple eyes and tendrils of void energy. Reality warps around it. Stars and void visible inside its body. The final boss.
- **Attack 1**: Void beam — rotating laser lines from body
- **Attack 2**: Black hole — creates a gravity well that pulls player
- **Attack 3**: Reality shatter — CRT glitch effect, screen fragments, clones spawn
- **Phase Transition**: Reality tears apart, reforms in new configuration

---

## 4. COMPANION / SUMMON

### 4.1 SKELETON MINION (Necromancer summon)
- **Size**: 32x32
- **Colors**: Bone white, dark eye sockets
- **Description**: Simple skeleton warrior. Skull head, visible ribcage, bony arms and legs. Carries a small rusty sword. Slightly hunched posture.
- **Frames**: Idle (2), Walk (4 × 4 dir = 16), Attack (3), Death (3) = **24 frames**

---

## 5. SPAWNERS (enemy generators)

### 5.1 GENERIC SPAWNER / PORTAL
- **Size**: 32x32
- **Colors**: Dark purple base, magenta/pink swirling energy, white center glow
- **Description**: A dark portal/vortex on the ground. Swirling purple energy with a bright magenta core. Arcane rune circle around it. Enemies emerge from the center. Destructible — cracks appear as it takes damage.
- **Frames**: Active loop (4 frames — swirl animation), Damaged (2 frames — cracked), Destroyed (4 frames — implodes) = **10 frames**

---

## 6. TILESETS (5 biomes)

Each biome needs a **tileset image** with these tile types.
**Each tile is 32x32 pixels**. Layout: single row or grid of tiles.

### Tiles needed per biome (7 tile types):

| Tile # | Type       | Description |
|--------|------------|-------------|
| 0      | Void       | Pure black / empty space |
| 1      | Floor      | Walkable ground tile (main biome texture) |
| 2      | Wall       | Solid impassable wall (top-down view, so you see the top face) |
| 3      | Corridor   | Walkable path between rooms (slightly different from floor) |
| 4      | Door       | Doorway connecting rooms |
| 5      | Stairs     | Descent point to next floor (golden/glowing) |
| 6      | Spawner Pad| Dark ground marking where a spawner sits |

**Tileset image size**: 224 x 32 pixels (7 tiles in a row, each 32x32).

---

### 6.1 THE CRYPT (Floors 1-5)
- **Style**: Ancient stone dungeon, cobwebs, coffins, torchlight
- **Palette**: Grays, dark blues, bone white | Accent: torch orange, ghostly green
- **Floor**: Gray cobblestone with cracks and moss
- **Wall**: Dark blue-gray stone bricks, top face visible
- **Corridor**: Lighter stone path, slightly worn
- **Door**: Wooden door frame with iron bands
- **Stairs**: Stone steps descending, golden glow

### 6.2 FUNGAL CAVES (Floors 6-10)
- **Style**: Organic cave, bioluminescent mushrooms, dripping moisture
- **Palette**: Deep purples, dark greens | Accent: bioluminescent cyan, toxic yellow
- **Floor**: Damp earth with small mushroom growths
- **Wall**: Organic cave rock with glowing fungal patches
- **Corridor**: Narrow cave path with luminescent lichen
- **Door**: Vine-covered natural opening
- **Stairs**: Root-wrapped descending path

### 6.3 IRON FORTRESS (Floors 11-15)
- **Style**: Industrial, mechanical, forges and gears
- **Palette**: Gun metal, rust brown, slate | Accent: molten orange, electric blue
- **Floor**: Metal grate floor panels with rivets
- **Wall**: Riveted iron plates with pipes
- **Corridor**: Narrow metal walkway with rail
- **Door**: Heavy blast door with wheel lock
- **Stairs**: Metal staircase with handrail

### 6.4 THE INFERNO (Floors 16-20)
- **Style**: Volcanic hellscape, lava, obsidian
- **Palette**: Black, deep red, charcoal | Accent: lava orange, hellfire yellow
- **Floor**: Cracked obsidian with ember glow in cracks
- **Wall**: Black volcanic rock with veins of lava
- **Corridor**: Narrow stone path over lava (lava visible on sides)
- **Door**: Scorched stone archway
- **Stairs**: Descending into deeper red glow

### 6.5 THE ABYSS (Floors 21-25)
- **Style**: Void/eldritch, floating platforms, cosmic horror
- **Palette**: Pure black, void purple | Accent: eldritch pink, cosmic white
- **Floor**: Floating dark purple platform tile with starfield visible
- **Wall**: Crystallized void matter, shifting purple edges
- **Corridor**: Narrow bridge over void (stars below)
- **Door**: Tear in reality / portal frame
- **Stairs**: Spiraling descent into deeper void

---

## 7. PROJECTILES

### 7.1 PLAYER PROJECTILE — FIREBALL (Wizard)
- **Size**: 16x16
- **Colors**: Orange/yellow fire, white hot center
- **Description**: Flaming orb with trailing fire wisps
- **Frames**: 4 (spinning/flickering animation)

### 7.2 PLAYER PROJECTILE — ARROW (Archer)
- **Size**: 16x16
- **Colors**: Brown shaft, gray tip, yellow feather
- **Description**: Pixel art arrow in flight. Needs 4 rotation variants (N/S/E/W) or just one facing right (engine rotates it).
- **Frames**: 1 (static, engine rotates)

### 7.3 ENEMY PROJECTILE — MAGIC BOLT
- **Size**: 16x16
- **Colors**: Magenta/pink energy, white center
- **Description**: Glowing pink-purple energy orb with slight trail
- **Frames**: 4 (pulsing animation)

### 7.4 BOSS PROJECTILE — BONE SPEAR
- **Size**: 16x32 (elongated)
- **Colors**: Bone white, dark outline
- **Description**: Thrown bone lance
- **Frames**: 1 (static, engine rotates)

### 7.5 BOSS PROJECTILE — FIREBALL (Ember Tyrant)
- **Size**: 24x24
- **Colors**: Deep red/orange, hellfire
- **Description**: Large flaming meteor
- **Frames**: 4 (spinning fire)

### 7.6 BOSS PROJECTILE — VOID BEAM SEGMENT
- **Size**: 16x16
- **Colors**: Purple/white void energy
- **Description**: Segment of a rotating laser beam
- **Frames**: 2 (flicker)

### 7.7 VALKYRIE SHIELD (Special ability projectile)
- **Size**: 16x16
- **Colors**: Gold/silver round shield
- **Description**: Spinning round shield (boomerang)
- **Frames**: 4 (rotation animation)

---

## 8. PICKUPS & ITEMS

All pickups are **16x16 pixels**, with 2-frame bob animation (up/down).

### 8.1 HEALTH POTION
- **Colors**: Red liquid, glass bottle, brown cork
- **Description**: Classic RPG health potion — round glass bottle filled with red liquid, brown cork stopper, small white shine highlight on glass

### 8.2 MANA POTION
- **Colors**: Blue liquid, glass bottle, brown cork
- **Description**: Same bottle shape as health potion but filled with glowing blue liquid

### 8.3 GOLD COIN
- **Colors**: Gold/yellow, darker gold edge
- **Description**: Single round gold coin with a cross or "G" stamped on it. Slight shine highlight.

### 8.4 GEAR — COMMON (White)
- **Colors**: Gray/white, simple
- **Description**: Small treasure chest or wrapped bundle, plain gray

### 8.5 GEAR — UNCOMMON (Green)
- **Colors**: Green glow
- **Description**: Same item shape but with green border glow

### 8.6 GEAR — RARE (Blue)
- **Colors**: Blue glow
- **Description**: Item with blue magical glow

### 8.7 GEAR — EPIC (Purple)
- **Colors**: Purple glow, more intense
- **Description**: Item with pulsing purple aura

### 8.8 GEAR — LEGENDARY (Gold)
- **Colors**: Golden glow, brightest
- **Description**: Item with radiant golden aura, sparkle particles

---

## 9. TRAPS

All traps are **32x32 pixels** (tile-sized), viewed from top-down.

### 9.1 SPIKE TRAP
- **Description**: Metal floor grate with retractable spikes. Spikes pop up rhythmically.
- **Frames**: Inactive/retracted (1), Rising (1), Extended/active (1), Retracting (1) = **4 frames**

### 9.2 PRESSURE PLATE
- **Description**: Slightly depressed stone tile with visible seam lines. Triggers when stepped on.
- **Frames**: Inactive (1), Pressed down (1) = **2 frames**

### 9.3 PIT TRAP
- **Description**: Cracked/damaged floor tile that breaks when walked over, revealing a dark pit below.
- **Frames**: Intact/cracked (1), Breaking (1), Open pit/dark hole (1) = **3 frames**

### 9.4 COFFIN (Crypt biome)
- **Description**: Stone coffin lid viewed from top. Bursts open to release an enemy.
- **Frames**: Closed (1), Lid sliding (1), Open/empty (1) = **3 frames**

### 9.5 SPORE VENT (Fungal biome)
- **Description**: Pulsating mushroom vent in the ground. Releases poison cloud.
- **Frames**: Dormant (1), Swelling (1), Releasing spores (1) = **3 frames**

### 9.6 SAW BLADE (Fortress biome)
- **Description**: Circular saw blade embedded in track on floor. Patrols back and forth.
- **Frames**: 4 (rotation animation)

### 9.7 LAVA GEYSER (Inferno biome)
- **Description**: Cracked ground with orange glow. Erupts with lava.
- **Frames**: Warning glow (1), Erupting (1), Lava pool (1) = **3 frames**

### 9.8 GRAVITY WELL (Abyss biome)
- **Description**: Dark purple swirl on the ground that pulls entities toward its center.
- **Frames**: 4 (swirling animation)

---

## 10. SHRINES

All shrines are **32x32 pixels**.

### 10.1 SHRINE OF POWER (Orange)
- **Colors**: Orange glow, stone pedestal, sword icon
- **Description**: Stone altar with a glowing orange sword symbol. Cracked stone base with warm light emanating.
- **Frames**: Inactive (1), Active/glowing (2 frame pulse) = **3 frames**

### 10.2 SHRINE OF FATE (Purple)
- **Colors**: Purple glow, stone pedestal, dice/question mark icon
- **Description**: Mysterious altar with swirling purple energy and a question mark rune.
- **Frames**: 3

### 10.3 SHRINE OF SACRIFICE (Red)
- **Colors**: Red glow, stone pedestal, skull icon
- **Description**: Dark altar with a glowing red skull symbol. Blood stains on stone.
- **Frames**: 3

### 10.4 SHRINE OF THE FORGOTTEN (Blue)
- **Colors**: Blue glow, stone pedestal, eye icon
- **Description**: Ancient altar with a glowing blue all-seeing eye symbol.
- **Frames**: 3

---

## 11. VFX / PARTICLES

Small sprites used for particle effects. **Simple shapes, 1-4 frames each**.

| Name | Size | Colors | Shape | Frames |
|------|------|--------|-------|--------|
| Spark | 8x8 | Yellow/white | 4-pointed star | 1 |
| Blood drop | 8x8 | Dark red | Splatter/droplet | 1 |
| Magic burst | 16x16 | Purple/white | Expanding ring | 4 |
| Flame | 8x8 | Orange→yellow→white | Fire teardrop | 4 |
| Smoke puff | 12x12 | Gray, semi-transparent | Soft circle | 3 |
| Heal sparkle | 8x8 | Green/white | Small cross or plus | 2 |
| Mana sparkle | 8x8 | Blue/white | Small diamond | 2 |
| Gold sparkle | 8x8 | Yellow/gold | Small star | 2 |
| Poison drip | 8x8 | Toxic green | Droplet | 2 |
| Ice crystal | 8x8 | Light blue/white | Hexagonal snowflake | 1 |
| Stun star | 8x8 | Yellow | Cartoon star | 2 (spin) |
| Burn ember | 8x8 | Orange/red | Small flame wisp | 2 |
| Void wisp | 8x8 | Purple/pink | Ethereal tendril | 2 |
| Dash trail | 8x8 | White, semi-transparent | Soft blur circle | 1 |

---

## 12. UI ELEMENTS

### 12.1 HUD ELEMENTS
| Element | Size | Description |
|---------|------|-------------|
| HP bar frame | 120x16 | Dark red border frame for health bar |
| MP bar frame | 100x12 | Dark blue border frame for mana bar |
| Potion icon (HP) | 16x16 | Small red potion icon for HUD counter |
| Potion icon (MP) | 16x16 | Small blue potion icon for HUD counter |
| Gold icon | 16x16 | Small coin icon for HUD counter |
| Minimap frame | 100x100 | Ornate border frame for the minimap panel |

### 12.2 MENU ELEMENTS
| Element | Size | Description |
|---------|------|-------------|
| Button normal | 100x30 | Gray pixel art button (rounded rect) |
| Button hover | 100x30 | Brighter version of button |
| Panel background | 200x150 | Dark panel with decorative border for menus |
| Class portrait frame | 48x48 | Ornate frame for character select portraits |

### 12.3 CLASS PORTRAITS (for character select screen)
Each class needs a **48x48 pixel close-up portrait** (face/upper body):
- Warrior portrait
- Wizard portrait
- Archer portrait
- Valkyrie portrait
- Necromancer portrait

---

## 13. MISCELLANEOUS SPRITES

| Sprite | Size | Description |
|--------|------|-------------|
| Aim indicator | 8x8 | Small white arrow/triangle pointing right (engine rotates) |
| Stairs marker | 32x32 | Glowing golden staircase descending downward |
| Cracked wall | 32x32 | Wall tile with visible cracks (secret room hint) |
| Shop sign | 32x32 | Wooden merchant sign/cart top-down view |
| Chest (closed) | 32x32 | Wooden treasure chest, closed |
| Chest (open) | 32x32 | Same chest, lid open, empty |
| Torch (wall) | 16x32 | Wall-mounted torch with flickering flame (4 frames) |
| Fog tile | 32x32 | Pure black square (used for fog of war overlay) |
| Boss door | 32x64 | Large ornate door with biome motif (before boss room) |

---

## SUMMARY — TOTAL ASSET COUNT

| Category | Items | Frames Each | Total Frames |
|----------|-------|-------------|-------------|
| Player Characters | 5 | 76 | **380** |
| Base Enemies | 4 | 24 | **96** |
| Elite Enemies | 4 | 24 | **96** |
| Bosses | 5 | 42 | **210** |
| Skeleton Minion | 1 | 24 | **24** |
| Spawner | 1 | 10 | **10** |
| Biome Tilesets | 5 | 7 tiles | **35 tiles** |
| Projectiles | 7 | ~2.5 avg | **18** |
| Pickups | 8 | 2 | **16** |
| Traps | 8 | ~3 avg | **25** |
| Shrines | 4 | 3 | **12** |
| VFX Particles | 14 | ~2 avg | **28** |
| UI Elements | 10 | 1 | **10** |
| Class Portraits | 5 | 1 | **5** |
| Misc Sprites | 9 | ~2 avg | **18** |
| **GRAND TOTAL** | | | **~983 frames** |

---

## FILE NAMING CONVENTION

```
assets/sprites/characters/warrior.png      (sprite sheet 76 frames)
assets/sprites/characters/wizard.png
assets/sprites/characters/archer.png
assets/sprites/characters/valkyrie.png
assets/sprites/characters/necromancer.png

assets/sprites/enemies/swarmer.png          (sprite sheet 24 frames)
assets/sprites/enemies/bruiser.png
assets/sprites/enemies/ranged.png
assets/sprites/enemies/bomber.png
assets/sprites/enemies/elite_swarmer.png
assets/sprites/enemies/elite_bruiser.png
assets/sprites/enemies/elite_ranged.png
assets/sprites/enemies/elite_bomber.png

assets/sprites/bosses/bone_sovereign.png    (sprite sheet 42 frames)
assets/sprites/bosses/sporemind.png
assets/sprites/bosses/iron_warden.png
assets/sprites/bosses/ember_tyrant.png
assets/sprites/bosses/void_architect.png

assets/sprites/allies/skeleton_minion.png

assets/sprites/items/pickup_hp.png
assets/sprites/items/pickup_mp.png
assets/sprites/items/pickup_gold.png
assets/sprites/items/gear_common.png
assets/sprites/items/gear_uncommon.png
assets/sprites/items/gear_rare.png
assets/sprites/items/gear_epic.png
assets/sprites/items/gear_legendary.png

assets/sprites/fx/projectile_fireball.png
assets/sprites/fx/projectile_arrow.png
assets/sprites/fx/projectile_magic_bolt.png
assets/sprites/fx/projectile_bone_spear.png
assets/sprites/fx/projectile_boss_fireball.png
assets/sprites/fx/projectile_void_beam.png
assets/sprites/fx/projectile_shield.png
assets/sprites/fx/particles.png             (all particles in one sheet)

assets/tiles/crypt.png
assets/tiles/fungal_caves.png
assets/tiles/iron_fortress.png
assets/tiles/inferno.png
assets/tiles/abyss.png

assets/sprites/objects/spawner.png
assets/sprites/objects/stairs.png
assets/sprites/objects/traps.png            (all traps in one sheet)
assets/sprites/objects/shrines.png          (all shrines in one sheet)
assets/sprites/objects/chest.png
assets/sprites/objects/torch.png
assets/sprites/objects/boss_door.png
assets/sprites/objects/shop_sign.png

assets/ui/hp_frame.png
assets/ui/mp_frame.png
assets/ui/minimap_frame.png
assets/ui/button.png
assets/ui/panel.png
assets/ui/portraits.png                     (all 5 class portraits in one sheet)
```

---

## NOTES FOR AI ART GENERATION

- **Perspective**: All sprites are PURE TOP-DOWN (bird's eye view, looking straight down). Characters show the top of their head/hat, shoulders, and body from above. NOT side-view or isometric.
- **Consistency**: All characters should share the same proportions and style. Enemies should be visually distinct from allies.
- **Readability**: Silhouettes must be distinct at 32x32. Each enemy type should be immediately recognizable.
- **Color coding**: Players = warm/bright class colors. Enemies = darker, more muted. Bosses = vibrant and threatening.
- **Animation**: Frames should be smooth pixel art animation, not just shifted sprites. Anticipation frames before attacks.
- **Background**: All sprites should have **transparent backgrounds** (PNG with alpha channel).
- **Anti-aliasing**: NONE. Pure pixel art, no smoothing, no sub-pixel rendering.
