import { GameConfig } from '../config/GameConfig.js';
import { KeyboardMouseInput } from '../entities/Player.js';
import { Warrior } from '../entities/classes/Warrior.js';
import { Wizard } from '../entities/classes/Wizard.js';
import { Archer } from '../entities/classes/Archer.js';
import { Valkyrie } from '../entities/classes/Valkyrie.js';
import { Necromancer } from '../entities/classes/Necromancer.js';
import { Swarmer } from '../entities/enemies/Swarmer.js';
import { Bruiser } from '../entities/enemies/Bruiser.js';
import { RangedEnemy } from '../entities/enemies/RangedEnemy.js';
import { Bomber } from '../entities/enemies/Bomber.js';
import { Boss } from '../entities/Boss.js';
import { BoneSovereign } from '../entities/bosses/BoneSovereign.js';
import { Sporemind } from '../entities/bosses/Sporemind.js';
import { IronWarden } from '../entities/bosses/IronWarden.js';
import { EmberTyrant } from '../entities/bosses/EmberTyrant.js';
import { VoidArchitect } from '../entities/bosses/VoidArchitect.js';
import { Spawner } from '../entities/Spawner.js';
import { Pickup } from '../entities/Pickup.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { DungeonManager } from '../systems/DungeonManager.js';
import { FogOfWar } from '../systems/FogOfWar.js';
import { LootSystem } from '../systems/LootSystem.js';
import { StatusEffects } from '../systems/StatusEffects.js';
import { TrapSystem } from '../systems/TrapSystem.js';
import { ShrineSystem } from '../systems/ShrineSystem.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { EventBus, Events } from '../utils/EventBus.js';
import { BiomeTrapSets } from '../config/TrapData.js';
import { getBossForFloor } from '../config/BossData.js';
import { ShopSystem } from '../systems/ShopSystem.js';
import { Companion } from '../entities/Companion.js';
import { applyCRTShader } from '../shaders/CRTShader.js';
import { saveManager } from '../systems/SaveManager.js';
import { ProgressionManager } from '../systems/ProgressionManager.js';
import { MoralChoiceSystem } from '../systems/MoralChoiceSystem.js';
import { AudioManager } from '../systems/AudioManager.js';
import { AnnouncerSystem } from '../systems/AnnouncerSystem.js';
import { TutorialPromptSystem } from '../systems/TutorialPromptSystem.js';
import { LoreData } from '../config/LoreData.js';
import { PauseScene } from './PauseScene.js';

// Player class lookup by key
const PLAYER_CLASSES = {
    warrior: Warrior,
    wizard: Wizard,
    archer: Archer,
    valkyrie: Valkyrie,
    necromancer: Necromancer,
};

// Enemy class lookup by type key
const ENEMY_CLASSES = {
    swarmer: Swarmer,
    bruiser: Bruiser,
    ranged: RangedEnemy,
    bomber: Bomber
};

// Boss class lookup by key
const BOSS_CLASSES = {
    boneSovereign: BoneSovereign,
    sporemind: Sporemind,
    ironWarden: IronWarden,
    emberTyrant: EmberTyrant,
    voidArchitect: VoidArchitect,
};

/**
 * GameScene — main gameplay scene.
 * Phase 3: loot/pickups, special abilities, status effects, traps, shrines.
 * UIScene runs parallel (launched here).
 */
export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init(data) {
        this.startFloor = (data && data.floor) || 1;
        this.classKey = (data && data.classKey) || 'warrior';
        this.companionKeys = (data && data.companions) || [];
    }

    create() {
        this.currentFloor = this.startFloor;

        // ── Apply CRT shader (subtle in gameplay) ────────────────────────
        this.crtPipeline = applyCRTShader(this, 'classic');

        // ── Phase 5 systems ─────────────────────────────────────────────
        this.progression = new ProgressionManager();
        this.progression.resetRunTracking();
        this.progression.computeActiveEffects(this.classKey);
        this.moralChoices = new MoralChoiceSystem(this);
        this.runStartTime = Date.now();

        // ── Audio & Announcer ─────────────────────────────────────────
        this.audioManager = new AudioManager(this);
        this.audioManager.resumeAudioContext();
        this.announcer = new AnnouncerSystem(this, this.audioManager, this.classKey);

        // ── Tutorial prompts (contextual first-run hints) ─────────────
        this.tutorialPrompts = new TutorialPromptSystem(this);

        // ── Apply saved settings ─────────────────────────────────────
        const savedSettings = PauseScene.loadSettings();
        if (this.crtPipeline) this.crtPipeline.setIntensity(savedSettings.crtIntensity);
        this.audioManager.setMusicVolume(savedSettings.musicVolume);
        this.audioManager.setSFXVolume(savedSettings.sfxVolume);

        // ── Core systems ────────────────────────────────────────────────
        this.dungeonManager = new DungeonManager(this);
        this.combatSystem = new CombatSystem(this);
        this.statusEffects = new StatusEffects(this);
        this.lootSystem = new LootSystem(this);
        this.trapSystem = new TrapSystem(this);
        this.shrineSystem = new ShrineSystem(this);
        this.shrineSystem.init();
        this.shopSystem = new ShopSystem(this);
        this.particles = new ParticleSystem(this);

        // ── Groups ──────────────────────────────────────────────────────
        this.enemies = this.physics.add.group({ runChildUpdate: true });
        this.spawners = this.physics.add.staticGroup();
        this.enemyProjectiles = this.physics.add.group({ runChildUpdate: true });
        this.pickups = this.physics.add.group();

        // ── Batched HP bar renderer (single Graphics for ALL entity HP bars) ─
        this._hpBarGfx = this.add.graphics().setDepth(100);
        this._hpBarGfx.setScrollFactor(1); // follows camera

        // Maintain enemy counter (avoids filter() every spawn tick)
        this.activeEnemyCount = 0;

        // ── Build first floor ────────────────────────────────────────────
        this.buildFloor(this.currentFloor);

        // Start biome music after first floor is built
        const firstBiome = this.dungeonManager?.getBiome()?.key;
        if (firstBiome) {
            this.audioManager.playBiomeMusic(firstBiome);
        }

        // ── Launch UIScene in parallel (no camera, runs above game) ─────
        if (!this.scene.isActive('UIScene')) {
            this.scene.launch('UIScene');
        }

        // ── EventBus ─────────────────────────────────────────────────────
        EventBus.on(Events.ENEMY_DIED, this.onEnemyDied, this);
        EventBus.on(Events.PLAYER_DEATH, this.onPlayerDeath, this);
        EventBus.on(Events.ENEMY_SPAWNED, this.onEnemySpawned, this);
        EventBus.on('BOSS_DEFEATED', this.onBossDefeated, this);

        // ESC to pause
        this.input.keyboard.on('keydown-ESC', () => this._openPauseMenu());

        // Clean up on scene shutdown
        this.events.on('shutdown', this.cleanup, this);
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  buildFloor
    // ──────────────────────────────────────────────────────────────────────────

    buildFloor(floorNumber) {
        // Clear previous floor
        this.enemies.clear(true, true);
        this.spawners.clear(true, true);
        this.enemyProjectiles.clear(true, true);
        this.pickups.clear(true, true);
        if (this.fogOfWar) this.fogOfWar.destroy();
        if (this.stairsZone) this.stairsZone.destroy();
        this.trapSystem.clearAll();
        this.shrineSystem.clearAll();
        this.shopSystem.clearAll();
        this.activeEnemyCount = 0;

        // Generate dungeon
        const floorData = this.dungeonManager.generateFloor(floorNumber);
        const wallLayer = this.dungeonManager.getCollisionLayer();
        this.floorData = floorData;

        // ── Player ───────────────────────────────────────────────────────
        if (!this.player) {
            const PlayerClass = PLAYER_CLASSES[this.classKey] || Warrior;
            this.player = new PlayerClass(this, floorData.startPosition.x, floorData.startPosition.y);
            const inputSource = new KeyboardMouseInput(this);
            inputSource.setAimMode(PauseScene.loadSettings().aimMode || 'mouse');
            this.player.setInputSource(inputSource);

            this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
            this.cameras.main.setZoom(GameConfig.CAMERA_ZOOM);

            // Spawn companions with formation indices
            this.companions = [];
            const offsets = [[24, 0], [-24, 0], [0, 24]];
            for (let i = 0; i < this.companionKeys.length; i++) {
                const ck = this.companionKeys[i];
                const off = offsets[i] || [0, 0];
                const comp = new Companion(
                    this,
                    floorData.startPosition.x + off[0],
                    floorData.startPosition.y + off[1],
                    ck,
                    this.player
                );
                comp.formationIndex = i;
                this.companions.push(comp);

                // Companion collides with walls
                // (will be set up below with wallLayer)
            }
        } else {
            this.player.setPosition(floorData.startPosition.x, floorData.startPosition.y);
            this.player.body.enable = true;

            // Reposition companions
            const offsets = [[24, 0], [-24, 0], [0, 24]];
            for (let i = 0; i < (this.companions || []).length; i++) {
                const comp = this.companions[i];
                if (comp.alive) {
                    const off = offsets[i] || [0, 0];
                    comp.setPosition(
                        floorData.startPosition.x + off[0],
                        floorData.startPosition.y + off[1]
                    );
                }
            }
        }

        // Set world bounds to match tilemap dimensions (prevents tunneling)
        const ts = GameConfig.TILE_SIZE;
        this.physics.world.setBounds(0, 0, floorData.width * ts, floorData.height * ts);

        this.cameras.main.fadeIn(400);

        // ── Physics colliders ────────────────────────────────────────────
        // Order matters: player-wall MUST be last so it resolves AFTER
        // enemy-player separation (which can push the player toward walls).
        this.physics.add.collider(this.enemies, wallLayer);
        this.physics.add.collider(this.enemies, this.enemies);

        // Companion wall colliders
        for (const comp of (this.companions || [])) {
            if (comp.alive) {
                this.physics.add.collider(comp, wallLayer);
            }
        }

        // Enemy → player: physical collision + contact damage
        this.physics.add.collider(this.player, this.enemies, (player, enemy) => {
            this.combatSystem.dealContactDamage(enemy, player);
        });

        // Player-wall LAST — final authority on keeping player out of walls
        this.physics.add.collider(this.player, wallLayer);

        // Player attacks hit spawners
        EventBus.on(Events.PLAYER_ATTACK, this.onPlayerAttackSpawners, this);

        // Enemy projectile → player
        this.physics.add.overlap(this.player, this.enemyProjectiles, (player, proj) => {
            if (player.isInvincible || !player.alive) return;
            const angle = Math.atan2(player.y - proj.y, player.x - proj.x);
            this.combatSystem.dealDamageToPlayer({ id: 'projectile' }, player, proj.projDamage || 10, angle);
            if (proj._trail) proj._trail.destroy();
            proj.destroy();
        });

        // Enemy projectile → wall
        this.physics.add.collider(this.enemyProjectiles, wallLayer, proj => {
            if (proj._trail) proj._trail.destroy();
            proj.destroy();
        });

        // Pickup collection overlap
        this.physics.add.overlap(this.player, this.pickups, (player, pickup) => {
            if (!pickup.alive) return;
            pickup.collect(player);
        });

        // ── Spawners ─────────────────────────────────────────────────────
        for (const sp of floorData.spawnerPositions) {
            const spawner = new Spawner(this, sp.worldX, sp.worldY, sp.enemyType);
            this.spawners.add(spawner);
        }

        // ── Stairs ───────────────────────────────────────────────────────
        if (floorData.stairsPosition) {
            const sx = floorData.stairsPosition.x;
            const sy = floorData.stairsPosition.y;
            this.stairsZone = this.add.zone(sx, sy, GameConfig.TILE_SIZE, GameConfig.TILE_SIZE);
            this.physics.add.existing(this.stairsZone, true);

            this.stairsMarker = this.add.sprite(sx, sy, 'stairs_marker');
            this.stairsMarker.setDepth(2);
            this.tweens.add({
                targets: this.stairsMarker, alpha: 0.4,
                duration: 800, yoyo: true, repeat: -1
            });

            this.physics.add.overlap(this.player, this.stairsZone, () => this.descendFloor());
        }

        // ── Fog of War ────────────────────────────────────────────────────
        this.fogOfWar = new FogOfWar(
            this,
            floorData.width,
            floorData.height,
            floorData.grid,
            this.dungeonManager.getBiome().tiles
        );

        // ── Traps (Phase 3.5) ─────────────────────────────────────────────
        this._placeTrapSet(floorData);

        // ── Shrines (Phase 3.6) ───────────────────────────────────────────
        this._placeShrines(floorData);

        // ── Boss (Phase 4) ────────────────────────────────────────────
        this._spawnBossIfNeeded(floorNumber, floorData);

        // ── Shops (Phase 4.5) ──────────────────────────────────────────
        this.shopSystem.placeShop(floorData, floorNumber);

        // ── Secret rooms (Phase 4.6) ───────────────────────────────────
        this._placeSecretRooms(floorData);

        // ── Phase 5: Moral choices ──────────────────────────────────────
        if (this.moralChoices) {
            this.moralChoices.checkForChoice(floorNumber);
        }

        // ── Phase 5: Class unlock check ─────────────────────────────────
        if (this.progression) {
            this.progression.checkClassUnlocks(floorNumber, null);
        }

        // ── Phase 5: Auto-save on floor transition ──────────────────────
        this._autoSave();
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Phase 3 placement helpers
    // ──────────────────────────────────────────────────────────────────────────

    _placeTrapSet(floorData) {
        const biome = this.dungeonManager.getBiome();
        const trapSet = BiomeTrapSets[biome.key] || BiomeTrapSets.crypt;
        const ts = GameConfig.TILE_SIZE;

        const [minTraps, maxTraps] = GameConfig.TRAPS_PER_FLOOR;
        const trapCount = Phaser.Math.Between(minTraps, maxTraps);

        // Pick random floor tiles to place traps on
        const floorTiles = this._collectFloorTiles(floorData);
        Phaser.Utils.Array.Shuffle(floorTiles);

        let placed = 0;
        for (const tile of floorTiles) {
            if (placed >= trapCount) break;
            // Avoid spawning traps right next to the start
            const dx = tile.x * ts - floorData.startPosition.x;
            const dy = tile.y * ts - floorData.startPosition.y;
            if (dx * dx + dy * dy < (4 * ts) * (4 * ts)) continue; // 4 tiles buffer

            const trapType = Phaser.Utils.Array.GetRandom(trapSet);
            this.trapSystem.placeTrapAt(tile.x * ts + ts / 2, tile.y * ts + ts / 2, trapType);
            placed++;
        }
    }

    _placeShrines(floorData) {
        const ts = GameConfig.TILE_SIZE;
        const [minShrines, maxShrines] = GameConfig.SHRINES_PER_FLOOR;
        const shrineCount = Phaser.Math.Between(minShrines, maxShrines);
        const shrineTypes = ['power', 'fate', 'sacrifice', 'forgotten'];

        const floorTiles = this._collectFloorTiles(floorData);
        Phaser.Utils.Array.Shuffle(floorTiles);

        let placed = 0;
        for (const tile of floorTiles) {
            if (placed >= shrineCount) break;
            const dx = tile.x * ts - floorData.startPosition.x;
            const dy = tile.y * ts - floorData.startPosition.y;
            if (dx * dx + dy * dy < (6 * ts) * (6 * ts)) continue; // 6 tiles buffer

            const shrineType = shrineTypes[placed % shrineTypes.length];
            this.shrineSystem.placeShrine(tile.x * ts + ts / 2, tile.y * ts + ts / 2, shrineType);
            placed++;
        }
    }

    _collectFloorTiles(floorData) {
        const FLOOR_TILE = this.dungeonManager.getBiome().tiles.FLOOR;
        const tiles = [];
        for (let y = 0; y < floorData.height; y++) {
            for (let x = 0; x < floorData.width; x++) {
                if (floorData.grid[y][x] === FLOOR_TILE) {
                    tiles.push({ x, y });
                }
            }
        }
        return tiles;
    }

    /**
     * Place 1-2 secret rooms per floor.
     * Picks wall tiles adjacent to rooms, marks them with cracked texture,
     * reveals a hidden loot area when attacked.
     */
    _placeSecretRooms(floorData) {
        // Clean up leftover graphics from previous floor
        if (this._secretWalls) {
            for (const sw of this._secretWalls) {
                sw.gfx?.destroy();
                sw.pulse?.destroy();
            }
        }
        this._secretWalls = [];

        const grid = floorData.grid;
        const T = this.dungeonManager.getBiome().tiles;
        const ts = GameConfig.TILE_SIZE;
        const candidates = [];

        // Find wall tiles that have at least one floor neighbor
        for (let y = 2; y < floorData.height - 2; y++) {
            for (let x = 2; x < floorData.width - 2; x++) {
                if (grid[y][x] !== T.WALL) continue;

                const neighbors = [
                    grid[y - 1]?.[x], grid[y + 1]?.[x],
                    grid[y]?.[x - 1], grid[y]?.[x + 1]
                ];
                const hasFloor = neighbors.some(n => n === T.FLOOR || n === T.CORRIDOR);
                if (!hasFloor) continue;

                // Ensure there's another wall behind it (for a hidden alcove)
                let behindIsWall = false;
                if (grid[y - 1]?.[x] === T.FLOOR && grid[y + 1]?.[x] === T.WALL) behindIsWall = true;
                if (grid[y + 1]?.[x] === T.FLOOR && grid[y - 1]?.[x] === T.WALL) behindIsWall = true;
                if (grid[y]?.[x - 1] === T.FLOOR && grid[y]?.[x + 1] === T.WALL) behindIsWall = true;
                if (grid[y]?.[x + 1] === T.FLOOR && grid[y]?.[x - 1] === T.WALL) behindIsWall = true;

                if (behindIsWall) candidates.push({ x, y });
            }
        }

        Phaser.Utils.Array.Shuffle(candidates);
        const count = Math.min(candidates.length, 1 + Math.floor(Math.random() * 2));

        for (let i = 0; i < count; i++) {
            const pos = candidates[i];
            const wx = pos.x * ts + ts / 2;
            const wy = pos.y * ts + ts / 2;

            // Cracked wall visual
            const gfx = this.add.graphics().setDepth(3);
            gfx.fillStyle(0x4a4a4a, 0.6);
            gfx.fillRect(wx - ts / 2, wy - ts / 2, ts, ts);
            gfx.lineStyle(1, 0x666666, 0.8);
            gfx.lineBetween(wx - 4, wy - 8, wx + 2, wy + 6);
            gfx.lineBetween(wx + 2, wy + 6, wx + 6, wy - 2);
            gfx.lineBetween(wx - 6, wy + 2, wx + 4, wy + 8);

            // Proximity hint pulse (golden glow, visible when close)
            const pulse = this.add.graphics().setDepth(2).setAlpha(0);
            pulse.fillStyle(0xffdd44, 0.3);
            pulse.fillCircle(wx, wy, 24);

            this._secretWalls.push({
                x: pos.x, y: pos.y, wx, wy, gfx, pulse,
                revealed: false
            });
        }
    }

    /**
     * Check if a player attack hit a secret wall.
     * Supports melee, cone, AND projectile attack types.
     */
    _checkSecretWallHit(angle, attackData) {
        if (!this._secretWalls) return;
        const player = this.player;
        const isProjectile = attackData.type === 'projectile';
        const range = isProjectile ? (attackData.range || 280) : (attackData.range || 48);

        for (const sw of this._secretWalls) {
            if (sw.revealed) continue;
            const dx = sw.wx - player.x;
            const dy = sw.wy - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > range * 1.5) continue;

            // For projectiles: check if wall is roughly in aim direction
            if (isProjectile) {
                const wallAngle = Math.atan2(dy, dx);
                const diff = Math.abs(Phaser.Math.Angle.Wrap(wallAngle - angle));
                if (diff > Phaser.Math.DegToRad(20)) continue;
            }

            this._revealSecretWall(sw);
        }
    }

    /**
     * Reveal a secret wall — fix colliders, award shards, spawn loot.
     */
    _revealSecretWall(sw) {
        sw.revealed = true;
        sw.gfx?.destroy();
        sw.pulse?.destroy();

        // Convert wall tile to floor
        const T = this.dungeonManager.getBiome().tiles;
        this.floorData.grid[sw.y][sw.x] = T.FLOOR;

        // Rebuild tilemap and ALL colliders (fixes duplicate collider bug)
        this.dungeonManager.buildTilemap();
        this._rebuildColliders();

        // Award shard reward (25 shards)
        this.progression?.awardShards('secret_found', this.currentFloor);

        // Emit event for announcer/achievements
        EventBus.emit(Events.SECRET_FOUND, {
            x: sw.wx, y: sw.wy, floor: this.currentFloor
        });

        // Update run stats
        const run = saveManager.getActiveRun();
        if (run) {
            saveManager.saveRun({
                secretsFound: (run.secretsFound || 0) + 1
            });
        }

        // Reveal text
        const revealText = this.add.text(sw.wx, sw.wy - 16, 'SECRET!', {
            fontFamily: 'monospace', fontSize: '12px',
            color: '#ffdd00', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(100);

        this.tweens.add({
            targets: revealText, y: revealText.y - 20, alpha: 0,
            duration: 1500, onComplete: () => revealText.destroy()
        });

        // Spawn loot: gear + gold
        this.lootSystem?.spawnPickup(sw.wx, sw.wy, 'gear');
        this.lootSystem?.spawnPickup(sw.wx + 12, sw.wy, 'gold', 75);
    }

    /**
     * Destroy all physics colliders and re-add them fresh.
     * Called after tilemap rebuild (secret reveal, floor transition).
     */
    _rebuildColliders() {
        this.physics.world.colliders.destroy();

        const wallLayer = this.dungeonManager.getCollisionLayer();
        this.physics.add.collider(this.player, wallLayer);
        this.physics.add.collider(this.enemies, wallLayer);
        this.physics.add.collider(this.enemies, this.enemies);

        for (const comp of (this.companions || [])) {
            if (comp.alive) this.physics.add.collider(comp, wallLayer);
        }

        // Enemy-player contact damage
        this.physics.add.collider(this.player, this.enemies, (player, enemy) => {
            this.combatSystem.dealContactDamage(enemy, player);
        });

        // Enemy projectiles
        this.physics.add.overlap(this.player, this.enemyProjectiles, (player, proj) => {
            if (player.isInvincible || !player.alive) return;
            const angle = Math.atan2(player.y - proj.y, player.x - proj.x);
            this.combatSystem.dealDamageToPlayer(
                { id: 'projectile' }, player, proj.projDamage || 10, angle
            );
            if (proj._trail) proj._trail.destroy();
            proj.destroy();
        });

        this.physics.add.collider(this.enemyProjectiles, wallLayer, proj => {
            if (proj._trail) proj._trail.destroy();
            proj.destroy();
        });

        // Pickups
        this.physics.add.overlap(this.player, this.pickups, (player, pickup) => {
            if (!pickup.alive) return;
            pickup.collect(player);
        });

        // Boss wall collider
        if (this.activeBoss?.alive) {
            this.physics.add.collider(this.activeBoss, wallLayer);
        }

        // Stairs overlap
        if (this.stairsZone?.active) {
            this.physics.add.overlap(this.player, this.stairsZone, () => this.descendFloor());
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Floor progression
    // ──────────────────────────────────────────────────────────────────────────

    descendFloor() {
        if (this._descending) return;
        this._descending = true;
        this.currentFloor++;

        // Track previous biome for transition detection
        const prevBiome = this.dungeonManager?.getBiome()?.key;

        // Floor transition: flash + stair descent with loading tip
        this.cameras.main.flash(200, 255, 255, 200);

        // Dark overlay with loading tip text
        const W = this.game.config.width;
        const H = this.game.config.height;
        const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0)
            .setScrollFactor(0).setDepth(900);

        // Pick a tip from LoreData
        const tips = LoreData.floorTransitionTips;
        const tip = tips[Math.floor(Math.random() * tips.length)];

        const tipText = this.add.text(W / 2, H / 2, '', {
            fontFamily: 'monospace', fontSize: '11px',
            color: '#888899', stroke: '#000', strokeThickness: 2,
            align: 'center', wordWrap: { width: 400 },
        }).setOrigin(0.5).setScrollFactor(0).setDepth(901).setAlpha(0);

        const floorLabel = this.add.text(W / 2, H / 2 - 30, `FLOOR ${this.currentFloor}`, {
            fontFamily: 'monospace', fontSize: '16px',
            color: '#ffcc00', stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(901).setAlpha(0);

        // Fade overlay in
        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 300,
            onComplete: () => {
                // Show floor label and tip
                floorLabel.setAlpha(1);
                tipText.setAlpha(1);
                tipText.setText(tip);

                // Build floor while screen is dark
                this.physics.world.colliders.destroy();
                EventBus.off(Events.PLAYER_ATTACK, this.onPlayerAttackSpawners, this);
                if (this.stairsMarker) this.stairsMarker.destroy();
                this.buildFloor(this.currentFloor);

                // Update music for new biome if changed
                const newBiome = this.dungeonManager?.getBiome()?.key;
                if (newBiome && this.audioManager) {
                    this.audioManager.playBiomeMusic(newBiome);
                }

                // Announcer floor transition
                if (this.announcer) {
                    this.announcer.triggerFloorTransition(
                        this.currentFloor, newBiome !== prevBiome
                    );
                }

                // Moral choice room-entry consequences
                if (this.moralChoices) {
                    this.moralChoices.applyRoomEntryConsequences();
                }

                // Hold for reading, then fade out
                this.time.delayedCall(800, () => {
                    this.tweens.add({
                        targets: [overlay, tipText, floorLabel],
                        alpha: 0,
                        duration: 400,
                        onComplete: () => {
                            overlay.destroy();
                            tipText.destroy();
                            floorLabel.destroy();
                            this._descending = false;
                        }
                    });
                });
            }
        });
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Enemy spawning
    // ──────────────────────────────────────────────────────────────────────────

    spawnEnemyFromSpawner(x, y, enemyType) {
        if (this.activeEnemyCount >= GameConfig.MAX_ENEMIES_PER_ROOM) return null;

        const EnemyClass = ENEMY_CLASSES[enemyType] || Swarmer;
        const enemy = new EnemyClass(this, x, y);

        // Swap to biome-specific sprite if available
        const biome = this.dungeonManager?.getBiome();
        if (biome) {
            const biomeTexKey = `enemy_${enemyType}_${biome.key}`;
            if (this.textures.exists(biomeTexKey)) {
                enemy.setTexture(biomeTexKey, 1); // frame 1 = idle south
                enemy._textureKey = biomeTexKey;
                enemy._hasWalkAnims = this.anims.exists(`${biomeTexKey}_walk_south`);
                if (enemy._hasWalkAnims) {
                    enemy.play(`${biomeTexKey}_idle_south`, true);
                }
            }
        }

        enemy.setTarget(this.player);
        this.enemies.add(enemy);
        this.activeEnemyCount++;
        EventBus.emit(Events.ENEMY_SPAWNED, { enemy });
        return enemy;
    }

    /**
     * Spawn an enemy at an arbitrary position (used by boss summons).
     */
    spawnEnemyAt(x, y, enemyType) {
        return this.spawnEnemyFromSpawner(x, y, enemyType);
    }

    /**
     * Set up boss trigger zone on boss floors.
     * Boss spawns after intro scene completes.
     */
    _spawnBossIfNeeded(floorNumber, floorData) {
        const bossInfo = getBossForFloor(floorNumber);
        if (!bossInfo) return;

        // Find the largest room for the boss
        const rooms = floorData.rooms;
        let bossRoom = rooms[0];
        let maxArea = 0;
        for (const room of rooms) {
            const area = room.w * room.h;
            if (area > maxArea) {
                maxArea = area;
                bossRoom = room;
            }
        }

        const ts = GameConfig.TILE_SIZE;
        const bx = (bossRoom.x + bossRoom.w / 2) * ts;
        const by = (bossRoom.y + bossRoom.h / 2) * ts;

        // Store boss spawn info
        this._pendingBoss = { bossInfo, bx, by };

        // Create trigger zone at boss room entrance
        const triggerWidth = bossRoom.w * ts * 0.6;
        const triggerHeight = bossRoom.h * ts * 0.6;
        this._bossTriggerZone = this.add.zone(bx, by, triggerWidth, triggerHeight);
        this.physics.add.existing(this._bossTriggerZone, true);

        // Add "boss ahead" warning text
        this._bossWarning = this.add.text(bx, by - 60, '⚠ DANGER AHEAD', {
            fontFamily: 'monospace', fontSize: '10px',
            color: '#ff4444', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(10).setAlpha(0.7);

        this.tweens.add({
            targets: this._bossWarning,
            alpha: 0.3, duration: 600, yoyo: true, repeat: -1
        });

        // When player enters the trigger zone, start boss intro
        this.physics.add.overlap(this.player, this._bossTriggerZone, () => {
            console.log('[GameScene] Boss trigger zone overlap!', {
                alreadyTriggered: this._bossIntroTriggered,
                hasBoss: !!this.activeBoss
            });
            if (this._bossIntroTriggered || this.activeBoss) return;
            this._bossIntroTriggered = true;
            console.log('[GameScene] Triggering boss intro...');
            this._triggerBossIntro();
        });
    }

    /**
     * Trigger the boss intro scene, then spawn the boss.
     */
    _triggerBossIntro() {
        const { bossInfo, bx, by } = this._pendingBoss;

        // Clean up warning
        if (this._bossWarning) {
            this._bossWarning.destroy();
            this._bossWarning = null;
        }

        // Pause player input briefly
        this.player.body.setVelocity(0, 0);

        // Track if boss was spawned by intro callback
        let bossSpawned = false;

        // Launch boss intro scene as overlay
        this.scene.launch('BossIntroScene', {
            bossData: bossInfo,
            onComplete: () => {
                if (!bossSpawned) {
                    bossSpawned = true;
                    this._spawnBoss(bossInfo, bx, by);
                }
            }
        });

        // Safety fallback: spawn boss after 4 seconds if intro callback doesn't fire
        this.time.delayedCall(4000, () => {
            if (!bossSpawned && !this.activeBoss) {
                console.warn('[GameScene] Boss intro callback did not fire, spawning boss directly');
                bossSpawned = true;
                this._spawnBoss(bossInfo, bx, by);
            }
        });
    }

    /**
     * Actually spawn the boss after intro completes.
     */
    _spawnBoss(bossInfo, bx, by) {
        console.log('[GameScene] _spawnBoss called', { key: bossInfo.key, bx, by });
        const BossClass = BOSS_CLASSES[bossInfo.key] || Boss;
        console.log('[GameScene] Boss class:', BossClass?.name || 'Unknown');
        const boss = new BossClass(this, bx, by, bossInfo);
        console.log('[GameScene] Boss created:', boss);
        boss.setTarget(this.player);
        this.enemies.add(boss);
        this.activeBoss = boss;

        // Boss contact damage
        this.physics.add.overlap(this.player, boss, () => {
            if (!this.player.alive || this.player.isInvincible || !boss.alive) return;
            const now = this.time.now;
            if ((boss._lastContactTime || 0) + 1000 > now) return;
            boss._lastContactTime = now;
            const angle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
            this.combatSystem.dealDamageToPlayer(boss, this.player, 15, angle);
        });

        // Boss collides with walls
        const wallLayer = this.dungeonManager.getCollisionLayer();
        this.physics.add.collider(boss, wallLayer);

        // Camera shake for dramatic effect
        this.cameras.main.shake(200, 0.01);
    }

    /**
     * Handle boss defeat — show reward and create stairs.
     */
    onBossDefeated({ boss, key, reward }) {
        this.activeBoss = null;

        // Reward floating text
        const text = this.add.text(boss.x, boss.y - 40, '🏆 BOSS DEFEATED!', {
            fontFamily: 'monospace', fontSize: '14px',
            color: '#ffdd00', stroke: '#000', strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        this.tweens.add({
            targets: text, y: text.y - 30, alpha: 0,
            duration: 2000, ease: 'Power2',
            onComplete: () => text.destroy()
        });

        // Grant shards reward
        if (reward?.shards) {
            this.player.gold = (this.player.gold || 0) + Math.floor(reward.shards / 5);
            EventBus.emit(Events.GOLD_CHANGED, { gold: this.player.gold });
        }

        // Heal reward
        if (reward?.heal) {
            if (reward.heal.hp) this.player.hp = this.player.maxHp;
            if (reward.heal.mana) this.player.mana = this.player.maxMana;
            if (reward.heal.potions) {
                this.player.hpPotions = Math.min(6, this.player.hpPotions + reward.heal.potions);
                this.player.mpPotions = Math.min(4, this.player.mpPotions + (reward.heal.potions - 1));
            }
        }

        // Phase 5: Check class unlocks on boss defeat
        if (this.progression) {
            const unlocked = this.progression.checkClassUnlocks(this.currentFloor, this.currentFloor);
            for (const cls of unlocked) {
                const className = cls.charAt(0).toUpperCase() + cls.slice(1);
                const unlockText = this.add.text(boss.x, boss.y - 70, `🔓 ${className} UNLOCKED!`, {
                    fontFamily: 'monospace', fontSize: '12px',
                    color: '#cc88ff', stroke: '#000', strokeThickness: 3,
                }).setOrigin(0.5).setDepth(100);
                this.tweens.add({
                    targets: unlockText, y: unlockText.y - 40, alpha: 0,
                    duration: 3000, ease: 'Power2', onComplete: () => unlockText.destroy(),
                });
            }
        }

        // Phase 5: Auto-save after boss defeat
        this._autoSave();

        // Phase 5: Victory on final boss (floor 25)
        if (this.currentFloor >= 25) {
            this._triggerVictory();
            return;
        }

        // Create stairs at boss position for next floor
        if (this.currentFloor < 25) {
            const sx = boss.x;
            const sy = boss.y;
            this.stairsZone = this.add.zone(sx, sy, GameConfig.TILE_SIZE, GameConfig.TILE_SIZE);
            this.physics.add.existing(this.stairsZone, true);

            this.stairsMarker = this.add.sprite(sx, sy, 'stairs_marker');
            this.stairsMarker.setDepth(2);
            this.tweens.add({
                targets: this.stairsMarker, alpha: 0.4,
                duration: 800, yoyo: true, repeat: -1
            });

            this.physics.add.overlap(this.player, this.stairsZone, () => this.descendFloor());
        }
    }

    createEnemyProjectile(x, y, dirX, dirY, speed, damage) {
        const proj = this.physics.add.sprite(x, y, 'enemy_projectile');
        proj.setDepth(8);
        proj.setScale(1.0);
        proj.body.setVelocity(dirX * speed, dirY * speed);
        proj.body.setAllowGravity(false);
        proj.projDamage = damage;
        this.enemyProjectiles.add(proj);

        // Particle trail for visibility
        if (this.textures.exists('particle_purple')) {
            const trail = this.add.particles(0, 0, 'particle_purple', {
                follow: proj,
                speed: { min: 3, max: 10 },
                scale: { start: 0.5, end: 0 },
                alpha: { start: 0.6, end: 0 },
                lifespan: 180,
                frequency: 40,
                tint: 0xff44ff
            }).setDepth(7);
            proj._trail = trail;
        }

        this.time.delayedCall(3000, () => {
            if (proj.active) {
                if (proj._trail) proj._trail.destroy();
                proj.destroy();
            }
        });
        return proj;
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Event handlers
    // ──────────────────────────────────────────────────────────────────────────

    onPlayerAttackSpawners({ player, angle, attackData, attackPower }) {
        // Secret wall check applies to ALL attack types (melee, projectile, cone)
        this._checkSecretWallHit(angle, attackData);

        // Spawner damage: melee/cone only
        if (attackData.type !== 'melee' && attackData.type !== 'cone') return;

        const range = attackData.range;
        const arcRad = Phaser.Math.DegToRad(attackData.arc);

        this.spawners.getChildren().forEach(spawner => {
            if (!spawner.alive) return;
            const dist = Phaser.Math.Distance.Between(player.x, player.y, spawner.x, spawner.y);
            if (dist > range * 1.5) return;

            const angleToSpawner = Math.atan2(spawner.y - player.y, spawner.x - player.x);
            const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angleToSpawner - angle));
            if (angleDiff <= arcRad / 2) {
                const dmg = spawner.takeDamage(attackPower);
                if (dmg > 0) {
                    this.combatSystem.applyWhiteFlash(spawner);
                    this.combatSystem.showDamageNumber(spawner.x, spawner.y, dmg);
                }
            }
        });
    }

    onEnemyDied({ enemy, x, y }) {
        if (this.activeEnemyCount > 0) this.activeEnemyCount--;

        // Death particle effects
        if (this.particles) {
            const color = enemy.enemyData?.color || 0xff4444;
            this.particles.deathExplosion(x, y, color);
        }

        // Light screen shake
        this.shakeLight();
    }

    onEnemySpawned() { /* counter incremented in spawnEnemyFromSpawner */ }

    onPlayerDeath(data) {
        // Phase 5: Calculate death bonus and finalize shards
        const deathBonus = this.progression?.calculateDeathBonus(this.currentFloor) || 0;
        const shardsEarned = this.progression?.finalizeRunShards() || 0;
        const shardBreakdown = this.progression?.getShardBreakdown() || {};

        // End run in save manager
        saveManager.endRun({ floor: this.currentFloor });

        this.time.delayedCall(1500, () => {
            // Red skull wipe transition
            const cam = this.cameras.main;
            const cx = cam.scrollX + cam.width / 2;
            const cy = cam.scrollY + cam.height / 2;

            const skull = this.add.graphics().setDepth(999);

            // Draw skull shape (red)
            skull.fillStyle(0xcc2222, 1);
            skull.fillCircle(0, 0, 30);       // head
            skull.fillRect(-20, 0, 40, 25);   // lower face

            skull.fillStyle(0x000000, 1);
            skull.fillCircle(-10, -5, 8);      // left eye
            skull.fillCircle(10, -5, 8);       // right eye
            skull.fillTriangle(0, 5, -4, 15, 4, 15); // nose

            skull.lineStyle(2, 0x000000, 0.8);
            for (let i = -3; i <= 3; i++) {
                skull.lineBetween(i * 5, 25, i * 5, 35); // jaw
            }

            skull.setPosition(cx, cy);
            skull.setScale(0);

            this.tweens.add({
                targets: skull,
                scale: 20,
                duration: 800,
                ease: 'Cubic.easeIn',
                onComplete: () => {
                    this.scene.stop('UIScene');
                    this.scene.start('DeathScene', {
                        killCount: data.killCount,
                        damageDealt: data.damageDealt,
                        floor: this.currentFloor,
                        gold: this.player?.gold || 0,
                        shardsEarned,
                        shardBreakdown,
                    });
                }
            });
        });
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Update
    // ──────────────────────────────────────────────────────────────────────────

    update(time, delta) {
        if (!this.player) return;

        // Safety net: if player is on a non-walkable tile, snap back
        if (this.player.alive && this.dungeonManager) {
            const ts = GameConfig.TILE_SIZE;
            const tx = (this.player.x / ts) | 0;
            const ty = (this.player.y / ts) | 0;
            if (!this.dungeonManager.isWalkable(tx, ty)) {
                if (this._lastSafeX !== undefined) {
                    this.player.setPosition(this._lastSafeX, this._lastSafeY);
                    this.player.body.setVelocity(0, 0);
                }
            } else {
                this._lastSafeX = this.player.x;
                this._lastSafeY = this.player.y;
            }
        }

        // Fog of war
        if (this.fogOfWar && this.player.alive) {
            this.fogOfWar.update(this.player.x, this.player.y);
        }

        // Status effects tick
        this.statusEffects.update(delta);

        // Trap system tick
        this.trapSystem.update(time, delta);

        // Shrine system tick (checks F key)
        this.shrineSystem.update();

        // Secret wall proximity hint
        if (this._secretWalls && this.player.alive) {
            for (const sw of this._secretWalls) {
                if (sw.revealed || !sw.pulse?.active) continue;
                const dx = sw.wx - this.player.x;
                const dy = sw.wy - this.player.y;
                const distSq = dx * dx + dy * dy;
                const hintRange = 80;
                if (distSq < hintRange * hintRange) {
                    const proximity = 1 - Math.sqrt(distSq) / hintRange;
                    const pulseAlpha = 0.15 + 0.15 * Math.sin(time * 0.005);
                    sw.pulse.setAlpha(pulseAlpha * proximity);
                } else {
                    sw.pulse.setAlpha(0);
                }
            }
        }

        // Batched HP bar rendering (single draw call for ALL entities)
        this._renderHpBars();
    }

    /**
     * Render all enemy + companion HP bars in a single batched Graphics pass.
     * Replaces per-entity Graphics objects (~50+ draw calls → 1 draw call).
     */
    _renderHpBars() {
        const gfx = this._hpBarGfx;
        if (!gfx) return;
        gfx.clear();

        // Enemy + Boss HP bars
        const enemies = this.enemies.getChildren();
        for (let i = 0, len = enemies.length; i < len; i++) {
            const e = enemies[i];
            if (!e.alive || !e.visible) continue;

            const isBoss = !!e.bossData;
            const w = isBoss ? 60 : 28;
            const h = isBoss ? 5 : 4;
            const yOff = isBoss ? (e.bossData.size + 8) : 19; // offset above sprite
            const bx = e.x - w / 2;
            const by = e.y - yOff;

            const frac = e.maxHp > 0 ? e.hp / e.maxHp : 0;

            // Skip full HP bars to reduce overdraw
            if (frac >= 1) continue;

            // Background
            gfx.fillStyle(0x000000, isBoss ? 0.7 : 0.6);
            gfx.fillRect(bx - 1, by - 1, w + 2, h + 2);

            // Empty track
            gfx.fillStyle(0x440000, 1);
            gfx.fillRect(bx, by, w, h);

            // Fill — bosses use orange-red, enemies shift green→yellow→red
            const color = isBoss
                ? (frac > 0.3 ? 0xee6622 : 0xee2222)
                : (frac > 0.5 ? 0x44cc44 : frac > 0.25 ? 0xeecc00 : 0xee2222);
            gfx.fillStyle(color, 1);
            gfx.fillRect(bx, by, Math.round(w * frac), h);
        }

        // Companion HP bars
        const comps = this.companions || [];
        for (let i = 0, len = comps.length; i < len; i++) {
            const c = comps[i];
            if (!c.alive || !c.visible) continue;

            const w = 20;
            const h = 3;
            const bx = c.x - w / 2;
            const by = c.y - 16 - h - 3;

            const frac = c.maxHp > 0 ? c.hp / c.maxHp : 0;

            // Background
            gfx.fillStyle(0x000000, 0.5);
            gfx.fillRect(bx - 1, by - 1, w + 2, h + 2);

            // Empty track
            gfx.fillStyle(0x111144, 1);
            gfx.fillRect(bx, by, w, h);

            // Fill
            gfx.fillStyle(c.downed ? 0x888888 : 0x4488ff, 1);
            gfx.fillRect(bx, by, Math.round(w * frac), h);
        }

        // Skeleton minion HP bars (allies — green)
        const minions = this.minions?.getChildren() || [];
        for (let i = 0, len = minions.length; i < len; i++) {
            const m = minions[i];
            if (!m.alive || !m.visible) continue;

            const w = 24;
            const h = 3;
            const bx = m.x - w / 2;
            const by = m.y - 19;

            const frac = m.maxHp > 0 ? m.hp / m.maxHp : 0;
            if (frac >= 1) continue;

            gfx.fillStyle(0x000000, 0.5);
            gfx.fillRect(bx - 1, by - 1, w + 2, h + 2);
            gfx.fillStyle(0x440000, 1);
            gfx.fillRect(bx, by, w, h);
            gfx.fillStyle(0x44cc44, 1);
            gfx.fillRect(bx, by, Math.round(w * frac), h);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Screen Shake & Juice Effects
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Small screen shake for light impacts.
     */
    shakeLight() {
        this.cameras.main.shake(80, 0.003);
    }

    /**
     * Medium screen shake for significant impacts.
     */
    shakeMedium() {
        this.cameras.main.shake(120, 0.008);
    }

    /**
     * Heavy screen shake for boss attacks, explosions.
     */
    shakeHeavy() {
        this.cameras.main.shake(200, 0.015);
    }

    /**
     * Directional shake (towards a point).
     */
    shakeTowards(x, y, intensity = 0.01) {
        const dx = x - this.player.x;
        const dy = y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const factor = Math.max(0.2, 1 - dist / 300);
        this.cameras.main.shake(100, intensity * factor);
    }

    /**
     * Hit pause effect (brief freeze frame for impact).
     */
    hitPause(duration = 50) {
        this.physics.pause();
        this.time.delayedCall(duration, () => {
            this.physics.resume();
        });
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Phase 5: Auto-save, Pause, Victory
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Auto-save current run state to SaveManager.
     */
    _autoSave() {
        if (!saveManager.activeProfile) return;
        const p = this.player;
        if (!p) return;

        saveManager.saveRun({
            floor: this.currentFloor,
            hp: p.hp,
            mana: p.mana,
            gold: p.gold || 0,
            gear: p.gear || {},
            hpPotions: p.hpPotions || 0,
            mpPotions: p.mpPotions || 0,
            killCount: p.killCount || 0,
            damageDealt: p.damageDealt || 0,
            moralChoices: this.moralChoices?.getState() || {},
            companionStates: (this.companions || []).map(c => ({
                classKey: c.classKey, alive: c.alive, downed: c.downed, hp: c.hp,
            })),
        });
    }

    /**
     * Open pause menu as overlay scene.
     */
    _openPauseMenu() {
        if (this.scene.isActive('PauseScene')) return;
        this.scene.pause();
        this.scene.launch('PauseScene', {
            player: {
                classKey: this.classKey,
                hp: this.player?.hp || 0,
                maxHp: this.player?.maxHp || 0,
                mana: this.player?.mana || 0,
                maxMana: this.player?.maxMana || 100,
                attack: this.player?.attack || 0,
                defense: this.player?.defense || 0,
                speed: this.player?.speed || 'medium',
                gold: this.player?.gold || 0,
                hpPotions: this.player?.hpPotions || 0,
                mpPotions: this.player?.mpPotions || 0,
                killCount: this.player?.killCount || 0,
                damageDealt: this.player?.damageDealt || 0,
                gear: this.player?.gear || {},
            },
            floor: this.currentFloor,
            biome: this.dungeonManager?.getBiome()?.key || 'crypt',
            runTime: Date.now() - (this.runStartTime || Date.now()),
            companions: (this.companions || []).map(c => ({
                classKey: c.classKey, alive: c.alive, downed: c.downed, hp: c.hp,
            })),
            discoveredLore: saveManager.getPermanent()?.discoveredLore || [],
            mapData: {
                rooms: this.dungeonManager?.currentData?.rooms || [],
                fogGrid: this.fogOfWar?.fogGrid || null,
                gridWidth: this.fogOfWar?.gridWidth || 0,
                gridHeight: this.fogOfWar?.gridHeight || 0,
                playerTileX: this.player ? Math.floor(this.player.x / 32) : 0,
                playerTileY: this.player ? Math.floor(this.player.y / 32) : 0,
                stairsPos: this.dungeonManager?.currentData?.stairsPosition || null,
            },
        });
    }

    /**
     * Trigger victory sequence after defeating the final boss (floor 25).
     */
    _triggerVictory() {
        // Finalize run shards
        const shardsEarned = this.progression?.finalizeRunShards() || 0;
        const shardBreakdown = this.progression?.getShardBreakdown() || {};

        // Determine ending
        const ending = this.moralChoices?.determineEnding() || 'escape';

        // End run in save manager
        saveManager.endRun({ floor: this.currentFloor });

        // Check achievements
        this.progression?.checkAchievements({
            victory: true,
            classKey: this.classKey,
        });

        this.time.delayedCall(2000, () => {
            this.cameras.main.fadeOut(800, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.stop('UIScene');
                this.scene.start('VictoryScene', {
                    ending,
                    killCount: this.player?.killCount || 0,
                    damageDealt: this.player?.damageDealt || 0,
                    floor: this.currentFloor,
                    gold: this.player?.gold || 0,
                    shardsEarned,
                    shardBreakdown,
                    classKey: this.classKey,
                });
            });
        });
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Cleanup
    // ──────────────────────────────────────────────────────────────────────────

    cleanup() {
        EventBus.off(Events.ENEMY_DIED, this.onEnemyDied, this);
        EventBus.off(Events.ENEMY_SPAWNED, this.onEnemySpawned, this);
        EventBus.off(Events.PLAYER_DEATH, this.onPlayerDeath, this);
        EventBus.off(Events.PLAYER_ATTACK, this.onPlayerAttackSpawners, this);

        if (this._hpBarGfx) this._hpBarGfx.destroy();
        this.combatSystem?.destroy();
        this.dungeonManager?.destroy();
        this.fogOfWar?.destroy();
        this.lootSystem?.destroy();
        this.statusEffects?.destroy();
        this.trapSystem?.destroy();
        this.shrineSystem?.destroy();
        this.particles?.destroy();
        this.progression?.destroy();
        this.moralChoices?.destroy();
        this.audioManager?.destroy();
        this.announcer?.destroy();
        this.tutorialPrompts?.destroy();
    }
}
