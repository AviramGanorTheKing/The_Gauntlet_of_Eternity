import { ClassData } from '../config/ClassData.js';
import { EnemyData } from '../config/EnemyData.js';
import { GameConfig } from '../config/GameConfig.js';
import { CRTShader } from '../shaders/CRTShader.js';
import { preloadAllAudio } from '../audio/AudioAssets.js';

/**
 * BootScene — generates pixel-art style placeholder textures and initializes shaders.
 * When real art assets exist, this scene will preload them instead.
 */
export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Show loading bar
        this.createLoadingBar();

        // ── Load real PIPOYA sprite sheets (96×128 = 3 cols × 4 rows of 32×32) ──
        const characterClasses = ['warrior', 'wizard', 'archer', 'valkyrie', 'necromancer'];
        for (const cls of characterClasses) {
            this.load.spritesheet(`player_${cls}`, `assets/sprites/characters/${cls}.png`, {
                frameWidth: 32,
                frameHeight: 32
            });
            // Class portrait (640×640) for character select screen
            this.load.image(`portrait_${cls}`, `assets/sprites/Class/portrait_${cls}.png`);
        }

        // Enemy sprites per biome (same 96×128 layout)
        const biomes = ['crypt', 'fungalCaves', 'ironFortress', 'inferno', 'abyss'];
        const enemyTypes = ['swarmer', 'bruiser', 'ranged', 'bomber'];
        for (const biome of biomes) {
            for (const type of enemyTypes) {
                this.load.spritesheet(
                    `enemy_${type}_${biome}`,
                    `assets/sprites/enemies/${biome}/${type}.png`,
                    { frameWidth: 32, frameHeight: 32 }
                );
            }
        }
        // Default enemy keys (crypt) for backwards compat
        for (const type of enemyTypes) {
            this.load.spritesheet(
                `enemy_${type}`,
                `assets/sprites/enemies/crypt/${type}.png`,
                { frameWidth: 32, frameHeight: 32 }
            );
        }

        // Skeleton minion sprite
        this.load.spritesheet('skeleton_minion', 'assets/sprites/enemies/crypt/skeleton.png', {
            frameWidth: 32,
            frameHeight: 32
        });

        // Boss sprite (288×384 = 3 cols × 4 rows of 96×96)
        this.load.spritesheet('boss_sheet', 'assets/sprites/bosses/boss_default.png', {
            frameWidth: 96,
            frameHeight: 96
        });

        // ── Load "Dungeons and Pixels" tileset + props ──
        const dpBase = 'assets/Dungeons and Pixels — Free Demo';
        this.load.image('dungeon_tileset_src', `${dpBase}/Tilesets/Tileset_Dungeon.png`);
        this.load.image('door_front_closed', `${dpBase}/Props/Static/Front_Door_Closed.png`);
        this.load.image('door_front_open', `${dpBase}/Props/Static/Front_Door_Open.png`);
        this.load.image('door_side_closed', `${dpBase}/Props/Static/Side_Door_Closed.png`);
        this.load.image('prop_bones1', `${dpBase}/Props/Static/bones1.png`);
        this.load.image('prop_bones2', `${dpBase}/Props/Static/bones2.png`);
        this.load.image('prop_chest_closed', `${dpBase}/Props/Static/bronze_chest_closed.png`);
        this.load.image('prop_chest_open', `${dpBase}/Props/Static/bronze_chest_open.png`);
        this.load.image('item_health_potion', `${dpBase}/Items/health_potion.png`);
        this.load.image('item_mana_potion', `${dpBase}/Items/mana_potion.png`);
        this.load.spritesheet('prop_torch', `${dpBase}/Props/Animated/torch_strip.png`, {
            frameWidth: 32, frameHeight: 32
        });
        this.load.spritesheet('prop_trap1', `${dpBase}/Props/Animated/trap1_strip.png`, {
            frameWidth: 32, frameHeight: 32
        });

        // Track which real textures loaded successfully
        this._realTexturesLoaded = new Set();
        this.load.on('filecomplete', (key) => {
            this._realTexturesLoaded.add(key);
        });

        // ── Preload all audio files (music + SFX) ──
        preloadAllAudio(this);
    }

    create() {
        // Register CRT shader pipeline
        this.registerCRTShader();

        // Generate placeholder textures (only for assets that failed to load)
        this.generatePlaceholderTextures();

        // Create animations from real sprite sheets
        this.createRealAnimations();

        // Audio is preloaded in preload() via preloadAllAudio()

        // Show "click to continue" prompt and wait for user interaction
        this._showClickToContinue();
    }

    _showClickToContinue() {
        const width = this.game.config.width;
        const height = this.game.config.height;

        // Update loading text to show completion
        if (this._loadingText) {
            this._loadingText.setText('LOADING COMPLETE!');
        }

        // Create "click to continue" text with pulsing animation
        const clickText = this.add.text(width / 2, height / 2 + 50, 'CLICK ANYWHERE TO START', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#ffdd44'
        }).setOrigin(0.5).setAlpha(0);

        // Fade in the text
        this.tweens.add({
            targets: clickText,
            alpha: 1,
            duration: 300,
            onComplete: () => {
                // Pulse animation
                this.tweens.add({
                    targets: clickText,
                    alpha: 0.5,
                    duration: 600,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });

        // Wait for any input (click, tap, or key)
        const proceed = () => {
            // Resume audio context (required for browser autoplay policy)
            if (this.sound.context && this.sound.context.state === 'suspended') {
                this.sound.context.resume();
            }

            // Remove listeners
            this.input.off('pointerdown', proceed);
            this.input.keyboard.off('keydown', proceed);

            // Fade out and transition
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                // Route: IntroScene on first boot, MenuScene on subsequent
                const introSeen = localStorage.getItem('gauntlet_intro_seen');
                if (!introSeen) {
                    this.scene.start('IntroScene');
                } else {
                    this.scene.start('MenuScene');
                }
            });
        };

        this.input.on('pointerdown', proceed);
        this.input.keyboard.on('keydown', proceed);
    }

    createLoadingBar() {
        const width = this.game.config.width;
        const height = this.game.config.height;
        const barWidth = 300;
        const barHeight = 20;

        // Background
        this.add.rectangle(width / 2, height / 2, barWidth + 4, barHeight + 4, 0x222222);

        // Progress bar background (empty)
        this.add.rectangle(width / 2, height / 2, barWidth, barHeight, 0x111111).setOrigin(0.5);

        // Progress bar fill (starts empty, grows with progress)
        this._progressBar = this.add.rectangle(
            width / 2 - barWidth / 2, height / 2,
            0, barHeight,
            0x44ff44
        ).setOrigin(0, 0.5);

        // Loading text
        this._loadingText = this.add.text(width / 2, height / 2 - 40, 'LOADING... 0%', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Store bar width for progress calculation
        this._barWidth = barWidth;

        // Listen to load progress events
        this.load.on('progress', (value) => {
            const percent = Math.round(value * 100);
            this._progressBar.width = barWidth * value;
            this._loadingText.setText(`LOADING... ${percent}%`);
        });

        this.load.on('complete', () => {
            this._loadingText.setText('LOADING... 100%');
            this._progressBar.width = barWidth;
        });
    }

    registerCRTShader() {
        const renderer = this.game.renderer;
        if (renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
            try {
                renderer.pipelines.addPostPipeline('CRTShader', CRTShader);
            } catch (e) {
                console.warn('CRT shader registration failed:', e.message);
            }
        }
    }

    _hasRealTexture(key) {
        return this._realTexturesLoaded && this._realTexturesLoaded.has(key);
    }

    generatePlaceholderTextures() {
        const ts = GameConfig.TILE_SIZE;

        // Fallback tileset
        this.generateTileset('crypt_tileset', ts, [
            { color: 0x3a3a4a, border: 0x2e2e3e },
            { color: 0x1a1a2e, border: 0x121226 }
        ]);

        // Player character sprites — only generate procedural fallbacks for missing PNGs
        for (const [key, data] of Object.entries(ClassData)) {
            if (!this._hasRealTexture(`player_${key}`)) {
                this.generatePlayerSpriteSheet(`player_${key}`, data.size, data.color, key);
            }
        }

        // Create procedural player animations (will be overridden by real ones if available)
        this.createPlayerAnimations();

        // Skeleton minion (necromancer summon)
        if (!this._hasRealTexture('skeleton_minion')) {
            this.generateSkeletonSprite('skeleton_minion', 8);
        }

        // Direction indicator
        this.generateDirectionIndicator('aim_indicator', 8);

        // Enemy sprites — only generate procedural fallbacks for missing PNGs
        for (const [key, data] of Object.entries(EnemyData)) {
            if (!this._hasRealTexture(`enemy_${key}`)) {
                this.generateEnemySprite(`enemy_${key}`, data.size, data.color, key);
            }
        }

        // Attack hitbox
        this.generateAttackArc('attack_hitbox', 40);

        // Projectiles (larger for visibility)
        this.generateProjectile('projectile', 12, 0xffff00);
        this.generateProjectile('enemy_projectile', 12, 0xff44ff);

        // Throwing axe projectile (warrior)
        this.generateThrowingAxeProjectile('projectile_throwing_axe', 18);

        // Arrow projectile (archer)
        this.generateArrowProjectile('projectile_arrow', 18);

        // Spawner (portal-like)
        this.generateSpawnerSprite('spawner', 16);

        // Stairs marker
        this.generateStairsSprite('stairs_marker', 24);

        // Pickup textures
        this.generatePotionSprite('pickup_hp', 16, 0xee3333);
        this.generatePotionSprite('pickup_mp', 16, 0x3366ee);
        this.generateCoinSprite('pickup_gold', 14);

        // Gear rarity colors
        const rarityColors = {
            common: 0xaaaaaa,
            uncommon: 0x44cc44,
            rare: 0x4488ff,
            epic: 0xaa44ff,
            legendary: 0xffaa00
        };
        for (const [rarity, color] of Object.entries(rarityColors)) {
            this.generateGearSprite(`pickup_gear_${rarity}`, 18, color);
        }

        // Boss textures — only generate procedural fallback if PNG missing
        if (!this._hasRealTexture('boss_default')) {
            this.generateBossSprite('boss_default', 32, 0xff4444);
        }

        // UI elements
        this.generateUIElements();

        // Particle textures
        this.generateParticleTextures();
    }

    /**
     * Create animations from real PIPOYA sprite sheets.
     * PIPOYA layout: 96×128 = 3 columns × 4 rows of 32×32 frames.
     * Row 0 = south (down), Row 1 = left (west), Row 2 = right (east), Row 3 = north (up).
     * Columns: 0 = step-left, 1 = neutral/idle, 2 = step-right.
     */
    createRealAnimations() {
        // Direction mapping: PIPOYA row → game direction + frame offsets
        const dirMap = [
            { dir: 'south', start: 0 },  // row 0
            { dir: 'west', start: 3 },  // row 1
            { dir: 'east', start: 6 },  // row 2
            { dir: 'north', start: 9 },  // row 3
        ];

        // Player character animations
        const classKeys = Object.keys(ClassData);
        for (const classKey of classKeys) {
            const key = `player_${classKey}`;
            if (!this._hasRealTexture(key)) continue;

            for (const { dir, start } of dirMap) {
                // Remove old procedural animations if they exist
                if (this.anims.exists(`${key}_idle_${dir}`)) {
                    this.anims.remove(`${key}_idle_${dir}`);
                }
                if (this.anims.exists(`${key}_walk_${dir}`)) {
                    this.anims.remove(`${key}_walk_${dir}`);
                }

                // Idle: single neutral frame (middle column)
                this.anims.create({
                    key: `${key}_idle_${dir}`,
                    frames: [{ key, frame: start + 1 }],
                    frameRate: 1,
                    repeat: -1
                });

                // Walk: step-left → neutral → step-right → neutral (4-frame cycle)
                this.anims.create({
                    key: `${key}_walk_${dir}`,
                    frames: [
                        { key, frame: start + 0 },
                        { key, frame: start + 1 },
                        { key, frame: start + 2 },
                        { key, frame: start + 1 },
                    ],
                    frameRate: 8,
                    repeat: -1
                });
            }
        }

        // Enemy animations — default (crypt) keys
        for (const enemyKey of Object.keys(EnemyData)) {
            const key = `enemy_${enemyKey}`;
            if (!this._hasRealTexture(key)) continue;

            for (const { dir, start } of dirMap) {
                this.anims.create({
                    key: `${key}_idle_${dir}`,
                    frames: [{ key, frame: start + 1 }],
                    frameRate: 1,
                    repeat: -1
                });

                this.anims.create({
                    key: `${key}_walk_${dir}`,
                    frames: [
                        { key, frame: start + 0 },
                        { key, frame: start + 1 },
                        { key, frame: start + 2 },
                        { key, frame: start + 1 },
                    ],
                    frameRate: 8,
                    repeat: -1
                });
            }
        }

        // Enemy animations — per-biome variants
        const biomeKeys = ['crypt', 'fungalCaves', 'ironFortress', 'inferno', 'abyss'];
        const enemyTypeKeys = ['swarmer', 'bruiser', 'ranged', 'bomber'];
        for (const biome of biomeKeys) {
            for (const type of enemyTypeKeys) {
                const key = `enemy_${type}_${biome}`;
                if (!this._hasRealTexture(key)) continue;

                for (const { dir, start } of dirMap) {
                    this.anims.create({
                        key: `${key}_idle_${dir}`,
                        frames: [{ key, frame: start + 1 }],
                        frameRate: 1,
                        repeat: -1
                    });

                    this.anims.create({
                        key: `${key}_walk_${dir}`,
                        frames: [
                            { key, frame: start + 0 },
                            { key, frame: start + 1 },
                            { key, frame: start + 2 },
                            { key, frame: start + 1 },
                        ],
                        frameRate: 8,
                        repeat: -1
                    });
                }
            }
        }

        // Skeleton minion animations
        if (this._hasRealTexture('skeleton_minion')) {
            for (const { dir, start } of dirMap) {
                this.anims.create({
                    key: `skeleton_minion_idle_${dir}`,
                    frames: [{ key: 'skeleton_minion', frame: start + 1 }],
                    frameRate: 1,
                    repeat: -1
                });

                this.anims.create({
                    key: `skeleton_minion_walk_${dir}`,
                    frames: [
                        { key: 'skeleton_minion', frame: start + 0 },
                        { key: 'skeleton_minion', frame: start + 1 },
                        { key: 'skeleton_minion', frame: start + 2 },
                        { key: 'skeleton_minion', frame: start + 1 },
                    ],
                    frameRate: 8,
                    repeat: -1
                });
            }
        }

        // Boss animations from the boss_sheet (4 bosses, each row = one boss)
        // Row 0 = Bone Sovereign (crypt), Row 1 = Sporemind (caves),
        // Row 2 = Void Architect (abyss), Row 3 = Ember Tyrant (inferno)
        if (this._hasRealTexture('boss_sheet')) {
            const bossRows = [
                { bossKey: 'boneSovereign', row: 0 },
                { bossKey: 'sporemind', row: 1 },
                { bossKey: 'voidArchitect', row: 2 },
                { bossKey: 'emberTyrant', row: 3 },
            ];

            for (const { bossKey, row } of bossRows) {
                const texKey = `boss_${bossKey}`;
                // Create idle animation using the middle frame of each row
                // Boss sheet is 3 cols × 4 rows — all 12 frames sequential
                const baseFrame = row * 3; // row0=0, row1=3, row2=6, row3=9

                this.anims.create({
                    key: `${texKey}_idle`,
                    frames: [{ key: 'boss_sheet', frame: baseFrame + 1 }],
                    frameRate: 1,
                    repeat: -1
                });

                this.anims.create({
                    key: `${texKey}_walk`,
                    frames: [
                        { key: 'boss_sheet', frame: baseFrame + 0 },
                        { key: 'boss_sheet', frame: baseFrame + 1 },
                        { key: 'boss_sheet', frame: baseFrame + 2 },
                        { key: 'boss_sheet', frame: baseFrame + 1 },
                    ],
                    frameRate: 5,
                    repeat: -1
                });
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PLAYER SPRITES (32x32 pixel art with 4 directions and walk animation)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Generate a sprite sheet with all directions and walk frames.
     * Layout: 8 columns (4 directions × 2 walk frames), 1 row
     * Order: south_0, south_1, north_0, north_1, east_0, east_1, west_0, west_1
     */
    generatePlayerSpriteSheet(key, radius, color, classKey) {
        const S = 32; // 32x32 per frame
        const frames = 8; // 4 directions × 2 walk frames
        const totalWidth = S * frames;
        const gfx = this.make.graphics({ add: false });

        const directions = ['south', 'north', 'east', 'west'];
        const pixelData = this._getPlayerPixelsDirectional(classKey);

        let col = 0;
        for (const dir of directions) {
            // Frame 0 (idle/walk frame 1)
            this._drawPixelArtAt(gfx, pixelData.palette, pixelData.grids[dir][0], S, col * S, 0);
            col++;
            // Frame 1 (walk frame 2 - with leg movement)
            this._drawPixelArtAt(gfx, pixelData.palette, pixelData.grids[dir][1], S, col * S, 0);
            col++;
        }

        gfx.generateTexture(key, totalWidth, S);
        gfx.destroy();

        // Add frame data to the texture (numeric indices 0-7)
        const texture = this.textures.get(key);
        for (let i = 0; i < frames; i++) {
            texture.add(i, 0, i * S, 0, S, S);
        }
    }

    /**
     * Create Phaser animations for all player classes.
     */
    createPlayerAnimations() {
        const classKeys = Object.keys(ClassData);
        const directions = ['south', 'north', 'east', 'west'];

        for (const classKey of classKeys) {
            const key = `player_${classKey}`;
            // Skip if real PIPOYA texture was loaded — createRealAnimations() handles it
            if (this._hasRealTexture(key)) continue;

            for (const dir of directions) {
                // Idle animation (single frame, slight bob)
                this.anims.create({
                    key: `${key}_idle_${dir}`,
                    frames: [{ key, frame: this._getFrameIndex(dir, 0) }],
                    frameRate: 1,
                    repeat: -1
                });

                // Walk animation (2 frames)
                this.anims.create({
                    key: `${key}_walk_${dir}`,
                    frames: [
                        { key, frame: this._getFrameIndex(dir, 0) },
                        { key, frame: this._getFrameIndex(dir, 1) }
                    ],
                    frameRate: 8,
                    repeat: -1
                });
            }
        }
    }

    _getFrameIndex(direction, walkFrame) {
        const dirIndex = { south: 0, north: 1, east: 2, west: 3 };
        return dirIndex[direction] * 2 + walkFrame;
    }

    _drawPixelArtAt(gfx, palette, grid, size, offsetX, offsetY) {
        const pixelSize = size / grid.length;
        for (let y = 0; y < grid.length; y++) {
            const row = grid[y];
            for (let x = 0; x < row.length; x++) {
                const val = parseInt(row[x]);
                if (val === 0) continue;
                const color = palette[val];
                if (color === undefined) continue;
                gfx.fillStyle(color, 1);
                gfx.fillRect(offsetX + x * pixelSize, offsetY + y * pixelSize, pixelSize + 0.5, pixelSize + 0.5);
            }
        }
    }

    _getPlayerPixelsDirectional(classKey) {
        // Palettes: 0=transparent, 1=skin, 2=body, 3=dark body, 4=weapon/detail, 5=accent, 6=eye, 7=highlight, 8=hair
        const palettes = {
            warrior: { 1: 0xddaa88, 2: 0xcc4444, 3: 0x882222, 4: 0xcccccc, 5: 0x886633, 6: 0x111111, 7: 0xeeeeee, 8: 0x553322 },
            wizard: { 1: 0xddaa88, 2: 0x4444cc, 3: 0x222288, 4: 0x664422, 5: 0x44ccff, 6: 0x111111, 7: 0xaaddff, 8: 0x888888 },
            archer: { 1: 0xddaa88, 2: 0x44aa44, 3: 0x226622, 4: 0x886633, 5: 0xccaa44, 6: 0x111111, 7: 0x88ee88, 8: 0x664422 },
            valkyrie: { 1: 0xddaa88, 2: 0xddaa22, 3: 0x887711, 4: 0xcccccc, 5: 0xffffff, 6: 0x111111, 7: 0xffee88, 8: 0xeecc66 },
            necromancer: { 1: 0xbbaa99, 2: 0x6633aa, 3: 0x331166, 4: 0x220022, 5: 0x44ff44, 6: 0xff0000, 7: 0xcc88ff, 8: 0x222222 }
        };

        // 32x32 directional grids for each class
        const allGrids = {
            warrior: {
                south: [
                    [ // Frame 0 - facing down, standing
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000088880000000000000000',
                        '00000000000888888000000000000000',
                        '00000000008888888800000000000000',
                        '00000000001111111000000000000000',
                        '00000000011111111100000000000000',
                        '00000000011166611100000000000000',
                        '00000000011166611100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00000004442222222444000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000004422277722244000000000000',
                        '00000004422222222244000000000000',
                        '00000000022222222200000000000000',
                        '00000000002222222000000000000000',
                        '00000000003333333000000000000000',
                        '00000000003333333000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000330330000000000000000',
                        '00000000000330330000000000000000',
                        '00000000003300033000000000000000',
                        '00000000003300033000000000000000',
                        '00000000003300033000000000000000',
                        '00000000033300033300000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                    [ // Frame 1 - facing down, walking
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000088880000000000000000',
                        '00000000000888888000000000000000',
                        '00000000008888888800000000000000',
                        '00000000001111111000000000000000',
                        '00000000011111111100000000000000',
                        '00000000011166611100000000000000',
                        '00000000011166611100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00000004442222222444000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000004422277722244000000000000',
                        '00000004422222222244000000000000',
                        '00000000022222222200000000000000',
                        '00000000002222222000000000000000',
                        '00000000003333333000000000000000',
                        '00000000003333333000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000003300033000000000000000',
                        '00000000033000003300000000000000',
                        '00000000330000000330000000000000',
                        '00000000330000000330000000000000',
                        '00000003300000000033000000000000',
                        '00000003330000000333000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                ],
                north: [
                    [ // Frame 0 - facing up
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000088880000000000000000',
                        '00000000000888888000000000000000',
                        '00000000008888888800000000000000',
                        '00000000008888888800000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00000004442222222444000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000000022222222200000000000000',
                        '00000000002222222000000000000000',
                        '00000000003333333000000000000000',
                        '00000000003333333000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000330330000000000000000',
                        '00000000000330330000000000000000',
                        '00000000003300033000000000000000',
                        '00000000003300033000000000000000',
                        '00000000003300033000000000000000',
                        '00000000033300033300000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                    [ // Frame 1 - facing up, walking
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000088880000000000000000',
                        '00000000000888888000000000000000',
                        '00000000008888888800000000000000',
                        '00000000008888888800000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00000004442222222444000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000000022222222200000000000000',
                        '00000000002222222000000000000000',
                        '00000000003333333000000000000000',
                        '00000000003333333000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000003300033000000000000000',
                        '00000000033000003300000000000000',
                        '00000000330000000330000000000000',
                        '00000000330000000330000000000000',
                        '00000003300000000033000000000000',
                        '00000003330000000333000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                ],
                east: [
                    [ // Frame 0 - facing right
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000008888000000000000000',
                        '00000000000088888800000000000000',
                        '00000000000888888880000000000000',
                        '00000000000111111160000000000000',
                        '00000000001111111166000000000000',
                        '00000000001111111110000000000000',
                        '00000000001111111110000000000000',
                        '00000000000111111100000000000000',
                        '00000000000011111000000000000000',
                        '00000000002222222244400000000000',
                        '00000000022222222224400000000000',
                        '00000000022222222224400000000000',
                        '00000000022277722224400000000000',
                        '00000000022222222224400000000000',
                        '00000000022222222220000000000000',
                        '00000000002222222200000000000000',
                        '00000000003333333300000000000000',
                        '00000000003333333300000000000000',
                        '00000000000333333000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033033000000000000000',
                        '00000000000033003300000000000000',
                        '00000000000033003300000000000000',
                        '00000000000033003300000000000000',
                        '00000000000033003330000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                    [ // Frame 1 - facing right, walking
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000008888000000000000000',
                        '00000000000088888800000000000000',
                        '00000000000888888880000000000000',
                        '00000000000111111160000000000000',
                        '00000000001111111166000000000000',
                        '00000000001111111110000000000000',
                        '00000000001111111110000000000000',
                        '00000000000111111100000000000000',
                        '00000000000011111000000000000000',
                        '00000000002222222244400000000000',
                        '00000000022222222224400000000000',
                        '00000000022222222224400000000000',
                        '00000000022277722224400000000000',
                        '00000000022222222224400000000000',
                        '00000000022222222220000000000000',
                        '00000000002222222200000000000000',
                        '00000000003333333300000000000000',
                        '00000000003333333300000000000000',
                        '00000000000333333000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000330033000000000000000',
                        '00000000003300003300000000000000',
                        '00000000033000000330000000000000',
                        '00000000033000000330000000000000',
                        '00000000330000000033000000000000',
                        '00000000330000000033000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                ],
                west: [
                    [ // Frame 0 - facing left
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000088880000000000000000',
                        '00000000000888888000000000000000',
                        '00000000008888888800000000000000',
                        '00000000061111111000000000000000',
                        '00000000661111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00000004442222222200000000000000',
                        '00000044222222222200000000000000',
                        '00000044222222222200000000000000',
                        '00000044222277722200000000000000',
                        '00000044222222222200000000000000',
                        '00000000022222222200000000000000',
                        '00000000002222222000000000000000',
                        '00000000003333333000000000000000',
                        '00000000003333333000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333300000000000000000',
                        '00000000000333300000000000000000',
                        '00000000000333300000000000000000',
                        '00000000000330330000000000000000',
                        '00000000003300330000000000000000',
                        '00000000003300330000000000000000',
                        '00000000003300330000000000000000',
                        '00000000033300330000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                    [ // Frame 1 - facing left, walking
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000088880000000000000000',
                        '00000000000888888000000000000000',
                        '00000000008888888800000000000000',
                        '00000000061111111000000000000000',
                        '00000000661111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00000004442222222200000000000000',
                        '00000044222222222200000000000000',
                        '00000044222222222200000000000000',
                        '00000044222277722200000000000000',
                        '00000044222222222200000000000000',
                        '00000000022222222200000000000000',
                        '00000000002222222000000000000000',
                        '00000000003333333000000000000000',
                        '00000000003333333000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333300000000000000000',
                        '00000000000333300000000000000000',
                        '00000000000330033000000000000000',
                        '00000000003300003300000000000000',
                        '00000000033000000330000000000000',
                        '00000000033000000330000000000000',
                        '00000000330000000033000000000000',
                        '00000000330000000033000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                ],
            },
            wizard: {
                south: [
                    [
                        '00000000000000000000000000000000',
                        '00000000000000055500000000000000',
                        '00000000000000555550000000000000',
                        '00000000000005555000000000000000',
                        '00000000000088888000000000000000',
                        '00000000000888888800000000000000',
                        '00000000001111111100000000000000',
                        '00000000011166661110000000000000',
                        '00000000011166661110000000000000',
                        '00000000001111111100000000000000',
                        '00000000000111111000000000000000',
                        '00000000222222222222000000000000',
                        '00000002222222222222200000000000',
                        '00000022222222222222220000000000',
                        '00000022222277722222220000000000',
                        '00000022222222222222220000000000',
                        '00000002222222222222200000000000',
                        '00000000222222222222000000000000',
                        '00000000003333333300000000000000',
                        '00000000003333333300000000000000',
                        '00000000000333333000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000330033000000000000000',
                        '00000000003300003300000000000000',
                        '00000000003300003300000000000000',
                        '00000000003300003300000000000000',
                        '00000000033300003330000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                    [
                        '00000000000000000000000000000000',
                        '00000000000000055500000000000000',
                        '00000000000000555550000000000000',
                        '00000000000005555000000000000000',
                        '00000000000088888000000000000000',
                        '00000000000888888800000000000000',
                        '00000000001111111100000000000000',
                        '00000000011166661110000000000000',
                        '00000000011166661110000000000000',
                        '00000000001111111100000000000000',
                        '00000000000111111000000000000000',
                        '00000000222222222222000000000000',
                        '00000002222222222222200000000000',
                        '00000022222222222222220000000000',
                        '00000022222277722222220000000000',
                        '00000022222222222222220000000000',
                        '00000002222222222222200000000000',
                        '00000000222222222222000000000000',
                        '00000000003333333300000000000000',
                        '00000000003333333300000000000000',
                        '00000000000333333000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033330000000000000000',
                        '00000000003300003300000000000000',
                        '00000000033000000330000000000000',
                        '00000000330000000033000000000000',
                        '00000000330000000033000000000000',
                        '00000003300000000003300000000000',
                        '00000003330000000003330000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                ],
                north: [
                    [
                        '00000000000000000000000000000000',
                        '00000000000555000000000000000000',
                        '00000000005555500000000000000000',
                        '00000000000055550000000000000000',
                        '00000000000088888000000000000000',
                        '00000000000888888800000000000000',
                        '00000000001111111100000000000000',
                        '00000000011111111110000000000000',
                        '00000000011111111110000000000000',
                        '00000000001111111100000000000000',
                        '00000000000111111000000000000000',
                        '00000000222222222222000000000000',
                        '00000002222222222222200000000000',
                        '00000022222222222222220000000000',
                        '00000022222222222222220000000000',
                        '00000022222222222222220000000000',
                        '00000002222222222222200000000000',
                        '00000000222222222222000000000000',
                        '00000000003333333300000000000000',
                        '00000000003333333300000000000000',
                        '00000000000333333000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000330033000000000000000',
                        '00000000003300003300000000000000',
                        '00000000003300003300000000000000',
                        '00000000003300003300000000000000',
                        '00000000033300003330000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                    [
                        '00000000000000000000000000000000',
                        '00000000000555000000000000000000',
                        '00000000005555500000000000000000',
                        '00000000000055550000000000000000',
                        '00000000000088888000000000000000',
                        '00000000000888888800000000000000',
                        '00000000001111111100000000000000',
                        '00000000011111111110000000000000',
                        '00000000011111111110000000000000',
                        '00000000001111111100000000000000',
                        '00000000000111111000000000000000',
                        '00000000222222222222000000000000',
                        '00000002222222222222200000000000',
                        '00000022222222222222220000000000',
                        '00000022222222222222220000000000',
                        '00000022222222222222220000000000',
                        '00000002222222222222200000000000',
                        '00000000222222222222000000000000',
                        '00000000003333333300000000000000',
                        '00000000003333333300000000000000',
                        '00000000000333333000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033330000000000000000',
                        '00000000003300003300000000000000',
                        '00000000033000000330000000000000',
                        '00000000330000000033000000000000',
                        '00000000330000000033000000000000',
                        '00000003300000000003300000000000',
                        '00000003330000000003330000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                ],
                east: [
                    [
                        '00000000000000000000000000000000',
                        '00000000000000000555000000000000',
                        '00000000000000055555000000000000',
                        '00000000000000555500000000000000',
                        '00000000000008888004400000000000',
                        '00000000000088888804400000000000',
                        '00000000001111111104400000000000',
                        '00000000011111116604400000000000',
                        '00000000011111111100000000000000',
                        '00000000001111111100000000000000',
                        '00000000000111111000000000000000',
                        '00000000022222222220000000000000',
                        '00000000222222222222000000000000',
                        '00000002222222222222200000000000',
                        '00000002222277222222200000000000',
                        '00000002222222222222200000000000',
                        '00000000222222222222000000000000',
                        '00000000022222222220000000000000',
                        '00000000003333333300000000000000',
                        '00000000003333333300000000000000',
                        '00000000000333333000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033033000000000000000',
                        '00000000000033003300000000000000',
                        '00000000000033003300000000000000',
                        '00000000000033003300000000000000',
                        '00000000000033003330000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                    [
                        '00000000000000000000000000000000',
                        '00000000000000000555000000000000',
                        '00000000000000055555000000000000',
                        '00000000000000555500000000000000',
                        '00000000000008888004400000000000',
                        '00000000000088888804400000000000',
                        '00000000001111111104400000000000',
                        '00000000011111116604400000000000',
                        '00000000011111111100000000000000',
                        '00000000001111111100000000000000',
                        '00000000000111111000000000000000',
                        '00000000022222222220000000000000',
                        '00000000222222222222000000000000',
                        '00000002222222222222200000000000',
                        '00000002222277222222200000000000',
                        '00000002222222222222200000000000',
                        '00000000222222222222000000000000',
                        '00000000022222222220000000000000',
                        '00000000003333333300000000000000',
                        '00000000003333333300000000000000',
                        '00000000000333333000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000330033000000000000000',
                        '00000000003300003300000000000000',
                        '00000000033000000330000000000000',
                        '00000000033000000330000000000000',
                        '00000000330000000033000000000000',
                        '00000000330000000033000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                ],
                west: [
                    [
                        '00000000000000000000000000000000',
                        '00000000005550000000000000000000',
                        '00000000055555000000000000000000',
                        '00000000005555000000000000000000',
                        '00000000044008888000000000000000',
                        '00000000044088888800000000000000',
                        '00000000044011111110000000000000',
                        '00000000044066111111000000000000',
                        '00000000000111111110000000000000',
                        '00000000001111111100000000000000',
                        '00000000000111111000000000000000',
                        '00000000022222222220000000000000',
                        '00000000222222222222000000000000',
                        '00000002222222222222200000000000',
                        '00000002222222772222200000000000',
                        '00000002222222222222200000000000',
                        '00000000222222222222000000000000',
                        '00000000022222222220000000000000',
                        '00000000003333333300000000000000',
                        '00000000003333333300000000000000',
                        '00000000000333333000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000330330000000000000000',
                        '00000000003300330000000000000000',
                        '00000000003300330000000000000000',
                        '00000000003300330000000000000000',
                        '00000000033300330000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                    [
                        '00000000000000000000000000000000',
                        '00000000005550000000000000000000',
                        '00000000055555000000000000000000',
                        '00000000005555000000000000000000',
                        '00000000044008888000000000000000',
                        '00000000044088888800000000000000',
                        '00000000044011111110000000000000',
                        '00000000044066111111000000000000',
                        '00000000000111111110000000000000',
                        '00000000001111111100000000000000',
                        '00000000000111111000000000000000',
                        '00000000022222222220000000000000',
                        '00000000222222222222000000000000',
                        '00000002222222222222200000000000',
                        '00000002222222772222200000000000',
                        '00000002222222222222200000000000',
                        '00000000222222222222000000000000',
                        '00000000022222222220000000000000',
                        '00000000003333333300000000000000',
                        '00000000003333333300000000000000',
                        '00000000000333333000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000330033000000000000000',
                        '00000000003300003300000000000000',
                        '00000000033000000330000000000000',
                        '00000000033000000330000000000000',
                        '00000000330000000033000000000000',
                        '00000000330000000033000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                ],
            },
            archer: {
                south: [
                    [
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000088880000000000000000',
                        '00000000000888888000000000000000',
                        '00000000008888888800000000000000',
                        '00000000001111111000000000000000',
                        '00000000011111111100000000000000',
                        '00000000011166611100000000000000',
                        '00000000011166611100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00000000022222222200000000044400',
                        '00000000222222222220000000044400',
                        '00000000222222222220000000044400',
                        '00000000222277722220000000044400',
                        '00000000222222222220000000044400',
                        '00000000022222222200000000044400',
                        '00000000002222222000000000044400',
                        '00000000003333333000000000044400',
                        '00000000003333333000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000330330000000000000000',
                        '00000000000330330000000000000000',
                        '00000000003300033000000000000000',
                        '00000000003300033000000000000000',
                        '00000000003300033000000000000000',
                        '00000000033300033300000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                    [
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000088880000000000000000',
                        '00000000000888888000000000000000',
                        '00000000008888888800000000000000',
                        '00000000001111111000000000000000',
                        '00000000011111111100000000000000',
                        '00000000011166611100000000000000',
                        '00000000011166611100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00000000022222222200000000044400',
                        '00000000222222222220000000044400',
                        '00000000222222222220000000044400',
                        '00000000222277722220000000044400',
                        '00000000222222222220000000044400',
                        '00000000022222222200000000044400',
                        '00000000002222222000000000044400',
                        '00000000003333333000000000044400',
                        '00000000003333333000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000003300033000000000000000',
                        '00000000033000003300000000000000',
                        '00000000330000000330000000000000',
                        '00000000330000000330000000000000',
                        '00000003300000000033000000000000',
                        '00000003330000000333000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                ],
                north: [
                    [
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000088880000000000000000',
                        '00000000000888888000000000000000',
                        '00000000008888888800000000000000',
                        '00000000001111111000000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00044400022222222200000000000000',
                        '00044400222222222220000000000000',
                        '00044400222222222220000000000000',
                        '00044400222222222220000000000000',
                        '00044400222222222220000000000000',
                        '00044400022222222200000000000000',
                        '00044400002222222000000000000000',
                        '00044400003333333000000000000000',
                        '00000000003333333000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000330330000000000000000',
                        '00000000000330330000000000000000',
                        '00000000003300033000000000000000',
                        '00000000003300033000000000000000',
                        '00000000003300033000000000000000',
                        '00000000033300033300000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                    [
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000088880000000000000000',
                        '00000000000888888000000000000000',
                        '00000000008888888800000000000000',
                        '00000000001111111000000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00044400022222222200000000000000',
                        '00044400222222222220000000000000',
                        '00044400222222222220000000000000',
                        '00044400222222222220000000000000',
                        '00044400222222222220000000000000',
                        '00044400022222222200000000000000',
                        '00044400002222222000000000000000',
                        '00044400003333333000000000000000',
                        '00000000003333333000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000003300033000000000000000',
                        '00000000033000003300000000000000',
                        '00000000330000000330000000000000',
                        '00000000330000000330000000000000',
                        '00000003300000000033000000000000',
                        '00000003330000000333000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                ],
                east: [
                    [
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000008888000000000000000',
                        '00000000000088888800000000000000',
                        '00000000000888888880000000000000',
                        '00000000000111111160000000000000',
                        '00000000001111111166000000000000',
                        '00000000001111111110000000000000',
                        '00000000001111111110000000000000',
                        '00000000000111111100000000000000',
                        '00000000000011111000000044000000',
                        '00000000002222222200000440000000',
                        '00000000022222222200004400000000',
                        '00000000022222222200044000000000',
                        '00000000022277722200440000000000',
                        '00000000022222222204400000000000',
                        '00000000022222222244000000000000',
                        '00000000002222222240000000000000',
                        '00000000003333333300000000000000',
                        '00000000003333333300000000000000',
                        '00000000000333333000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033033000000000000000',
                        '00000000000033003300000000000000',
                        '00000000000033003300000000000000',
                        '00000000000033003300000000000000',
                        '00000000000033003330000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                    [
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000008888000000000000000',
                        '00000000000088888800000000000000',
                        '00000000000888888880000000000000',
                        '00000000000111111160000000000000',
                        '00000000001111111166000000000000',
                        '00000000001111111110000000000000',
                        '00000000001111111110000000000000',
                        '00000000000111111100000000000000',
                        '00000000000011111000000044000000',
                        '00000000002222222200000440000000',
                        '00000000022222222200004400000000',
                        '00000000022222222200044000000000',
                        '00000000022277722200440000000000',
                        '00000000022222222204400000000000',
                        '00000000022222222244000000000000',
                        '00000000002222222240000000000000',
                        '00000000003333333300000000000000',
                        '00000000003333333300000000000000',
                        '00000000000333333000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000330033000000000000000',
                        '00000000003300003300000000000000',
                        '00000000033000000330000000000000',
                        '00000000033000000330000000000000',
                        '00000000330000000033000000000000',
                        '00000000330000000033000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                ],
                west: [
                    [
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000088880000000000000000',
                        '00000000000888888000000000000000',
                        '00000000008888888800000000000000',
                        '00000000061111111000000000000000',
                        '00000000661111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000001111111000000000000000',
                        '00000044000011111000000000000000',
                        '00000044002222222200000000000000',
                        '00000440022222222200000000000000',
                        '00004400022222222200000000000000',
                        '00044000022277722200000000000000',
                        '00440000022222222200000000000000',
                        '04400000022222222200000000000000',
                        '04000000002222222000000000000000',
                        '00000000003333333000000000000000',
                        '00000000003333333000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333300000000000000000',
                        '00000000000333300000000000000000',
                        '00000000000333300000000000000000',
                        '00000000000330330000000000000000',
                        '00000000003300330000000000000000',
                        '00000000003300330000000000000000',
                        '00000000003300330000000000000000',
                        '00000000033300330000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                    [
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000088880000000000000000',
                        '00000000000888888000000000000000',
                        '00000000008888888800000000000000',
                        '00000000061111111000000000000000',
                        '00000000661111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000001111111000000000000000',
                        '00000044000011111000000000000000',
                        '00000044002222222200000000000000',
                        '00000440022222222200000000000000',
                        '00004400022222222200000000000000',
                        '00044000022277722200000000000000',
                        '00440000022222222200000000000000',
                        '04400000022222222200000000000000',
                        '04000000002222222000000000000000',
                        '00000000003333333000000000000000',
                        '00000000003333333000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333300000000000000000',
                        '00000000000333300000000000000000',
                        '00000000000330033000000000000000',
                        '00000000003300003300000000000000',
                        '00000000033000000330000000000000',
                        '00000000033000000330000000000000',
                        '00000000330000000033000000000000',
                        '00000000330000000033000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                ],
            },
            valkyrie: {
                south: [
                    [
                        '00000000000000000000000000000000',
                        '00000000550000000055000000000000',
                        '00000005550008888055500000000000',
                        '00000000500888888800500000000000',
                        '00000000008888888800000000000000',
                        '00000000001111111000000000000000',
                        '00000000011111111100000000000000',
                        '00000000011166611100000000000000',
                        '00000000011166611100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00000004442222222444000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000004422277722244000000000000',
                        '00000004422222222244000000000000',
                        '00000000022222222200000000000000',
                        '00000000002222222000000000000000',
                        '00000000003333333000000000000000',
                        '00000000003333333000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000330330000000000000000',
                        '00000000000330330000000000000000',
                        '00000000003300033000000000000000',
                        '00000000003300033000000000000000',
                        '00000000003300033000000000000000',
                        '00000000033300033300000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                    [
                        '00000000000000000000000000000000',
                        '00000000550000000055000000000000',
                        '00000005550008888055500000000000',
                        '00000000500888888800500000000000',
                        '00000000008888888800000000000000',
                        '00000000001111111000000000000000',
                        '00000000011111111100000000000000',
                        '00000000011166611100000000000000',
                        '00000000011166611100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00000004442222222444000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000004422277722244000000000000',
                        '00000004422222222244000000000000',
                        '00000000022222222200000000000000',
                        '00000000002222222000000000000000',
                        '00000000003333333000000000000000',
                        '00000000003333333000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000003300033000000000000000',
                        '00000000033000003300000000000000',
                        '00000000330000000330000000000000',
                        '00000000330000000330000000000000',
                        '00000003300000000033000000000000',
                        '00000003330000000333000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                ],
                north: [
                    [
                        '00000000000000000000000000000000',
                        '00000000550000000055000000000000',
                        '00000005550008888055500000000000',
                        '00000000500888888800500000000000',
                        '00000000008888888800000000000000',
                        '00000000008888888800000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00000004442222222444000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000000022222222200000000000000',
                        '00000000002222222000000000000000',
                        '00000000003333333000000000000000',
                        '00000000003333333000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000330330000000000000000',
                        '00000000000330330000000000000000',
                        '00000000003300033000000000000000',
                        '00000000003300033000000000000000',
                        '00000000003300033000000000000000',
                        '00000000033300033300000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                    [
                        '00000000000000000000000000000000',
                        '00000000550000000055000000000000',
                        '00000005550008888055500000000000',
                        '00000000500888888800500000000000',
                        '00000000008888888800000000000000',
                        '00000000008888888800000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00000004442222222444000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000000022222222200000000000000',
                        '00000000002222222000000000000000',
                        '00000000003333333000000000000000',
                        '00000000003333333000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333330000000000000000',
                        '00000000003300033000000000000000',
                        '00000000033000003300000000000000',
                        '00000000330000000330000000000000',
                        '00000000330000000330000000000000',
                        '00000003300000000033000000000000',
                        '00000003330000000333000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                ],
                east: [
                    [
                        '00000000000000000000000000000000',
                        '00000000000000000000550000000000',
                        '00000000000008888005550000000000',
                        '00000000000088888800050000000000',
                        '00000000000888888880000000000000',
                        '00000000000111111160000000000000',
                        '00000000001111111166000000000000',
                        '00000000001111111110000000000000',
                        '00000000001111111110000000000000',
                        '00000000000111111100000000000000',
                        '00000000000011111000000000000000',
                        '00000000002222222244400000000000',
                        '00000000022222222224400000000000',
                        '00000000022222222224400000000000',
                        '00000000022277722224400000000000',
                        '00000000022222222224400000000000',
                        '00000000022222222220000000000000',
                        '00000000002222222200000000000000',
                        '00000000003333333300000000000000',
                        '00000000003333333300000000000000',
                        '00000000000333333000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033033000000000000000',
                        '00000000000033003300000000000000',
                        '00000000000033003300000000000000',
                        '00000000000033003300000000000000',
                        '00000000000033003330000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                    [
                        '00000000000000000000000000000000',
                        '00000000000000000000550000000000',
                        '00000000000008888005550000000000',
                        '00000000000088888800050000000000',
                        '00000000000888888880000000000000',
                        '00000000000111111160000000000000',
                        '00000000001111111166000000000000',
                        '00000000001111111110000000000000',
                        '00000000001111111110000000000000',
                        '00000000000111111100000000000000',
                        '00000000000011111000000000000000',
                        '00000000002222222244400000000000',
                        '00000000022222222224400000000000',
                        '00000000022222222224400000000000',
                        '00000000022277722224400000000000',
                        '00000000022222222224400000000000',
                        '00000000022222222220000000000000',
                        '00000000002222222200000000000000',
                        '00000000003333333300000000000000',
                        '00000000003333333300000000000000',
                        '00000000000333333000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000033330000000000000000',
                        '00000000000330033000000000000000',
                        '00000000003300003300000000000000',
                        '00000000033000000330000000000000',
                        '00000000033000000330000000000000',
                        '00000000330000000033000000000000',
                        '00000000330000000033000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                ],
                west: [
                    [
                        '00000000000000000000000000000000',
                        '00000000055000000000000000000000',
                        '00000000555500888800000000000000',
                        '00000000050008888880000000000000',
                        '00000000000888888800000000000000',
                        '00000000061111111000000000000000',
                        '00000000661111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00000004442222222200000000000000',
                        '00000044222222222200000000000000',
                        '00000044222222222200000000000000',
                        '00000044222277722200000000000000',
                        '00000044222222222200000000000000',
                        '00000000022222222200000000000000',
                        '00000000002222222000000000000000',
                        '00000000003333333000000000000000',
                        '00000000003333333000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333300000000000000000',
                        '00000000000333300000000000000000',
                        '00000000000333300000000000000000',
                        '00000000000330330000000000000000',
                        '00000000003300330000000000000000',
                        '00000000003300330000000000000000',
                        '00000000003300330000000000000000',
                        '00000000033300330000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                    [
                        '00000000000000000000000000000000',
                        '00000000055000000000000000000000',
                        '00000000555500888800000000000000',
                        '00000000050008888880000000000000',
                        '00000000000888888800000000000000',
                        '00000000061111111000000000000000',
                        '00000000661111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00000004442222222200000000000000',
                        '00000044222222222200000000000000',
                        '00000044222222222200000000000000',
                        '00000044222277722200000000000000',
                        '00000044222222222200000000000000',
                        '00000000022222222200000000000000',
                        '00000000002222222000000000000000',
                        '00000000003333333000000000000000',
                        '00000000003333333000000000000000',
                        '00000000000333330000000000000000',
                        '00000000000333300000000000000000',
                        '00000000000333300000000000000000',
                        '00000000000330033000000000000000',
                        '00000000003300003300000000000000',
                        '00000000033000000330000000000000',
                        '00000000033000000330000000000000',
                        '00000000330000000033000000000000',
                        '00000000330000000033000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                ],
            },
            necromancer: {
                south: [
                    [
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000044440000000000000000',
                        '00000000000444444000000000000000',
                        '00000000004411114400000000000000',
                        '00000000001111111000000000000000',
                        '00000000011111111100000000000000',
                        '00000000011166611100000000000000',
                        '00000000011166611100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00000004442222222444000000000000',
                        '00000004422222222244000000000000',
                        '00000004422255522244000000000000',
                        '00000004422255522244000000000000',
                        '00000004422222222244000000000000',
                        '00000000022222222200000000000000',
                        '00000000002222222000000000000000',
                        '00000000004444444000000000000000',
                        '00000000004444444000000000000000',
                        '00000000000444440000000000000000',
                        '00000000000044400000000000000000',
                        '00000000000044400000000000000000',
                        '00000000000044400000000000000000',
                        '00000000000440440000000000000000',
                        '00000000004400044000000000000000',
                        '00000000004400044000000000000000',
                        '00000000004400044000000000000000',
                        '00000000044400044400000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                    [
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000044440000000000000000',
                        '00000000000444444000000000000000',
                        '00000000004411114400000000000000',
                        '00000000001111111000000000000000',
                        '00000000011111111100000000000000',
                        '00000000011166611100000000000000',
                        '00000000011166611100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00000004442222222444000000000000',
                        '00000004422222222244000000000000',
                        '00000004422255522244000000000000',
                        '00000004422255522244000000000000',
                        '00000004422222222244000000000000',
                        '00000000022222222200000000000000',
                        '00000000002222222000000000000000',
                        '00000000004444444000000000000000',
                        '00000000004444444000000000000000',
                        '00000000000444440000000000000000',
                        '00000000000044400000000000000000',
                        '00000000000044400000000000000000',
                        '00000000004400044000000000000000',
                        '00000000044000004400000000000000',
                        '00000000440000000440000000000000',
                        '00000000440000000440000000000000',
                        '00000004400000000044000000000000',
                        '00000004440000000444000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                ],
                north: [
                    [
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000044440000000000000000',
                        '00000000000444444000000000000000',
                        '00000000004411114400000000000000',
                        '00000000001111111000000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00000004442222222444000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000000022222222200000000000000',
                        '00000000002222222000000000000000',
                        '00000000004444444000000000000000',
                        '00000000004444444000000000000000',
                        '00000000000444440000000000000000',
                        '00000000000044400000000000000000',
                        '00000000000044400000000000000000',
                        '00000000000044400000000000000000',
                        '00000000000440440000000000000000',
                        '00000000004400044000000000000000',
                        '00000000004400044000000000000000',
                        '00000000004400044000000000000000',
                        '00000000044400044400000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                    [
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000044440000000000000000',
                        '00000000000444444000000000000000',
                        '00000000004411114400000000000000',
                        '00000000001111111000000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00000004442222222444000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000004422222222244000000000000',
                        '00000000022222222200000000000000',
                        '00000000002222222000000000000000',
                        '00000000004444444000000000000000',
                        '00000000004444444000000000000000',
                        '00000000000444440000000000000000',
                        '00000000000044400000000000000000',
                        '00000000000044400000000000000000',
                        '00000000004400044000000000000000',
                        '00000000044000004400000000000000',
                        '00000000440000000440000000000000',
                        '00000000440000000440000000000000',
                        '00000004400000000044000000000000',
                        '00000004440000000444000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                ],
                east: [
                    [
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000004444000000000000000',
                        '00000000000044444400000000000000',
                        '00000000000441114440000000000000',
                        '00000000000111111160000000000000',
                        '00000000001111111166000000000000',
                        '00000000001111111110000000000000',
                        '00000000001111111110000000000000',
                        '00000000000111111100000000000000',
                        '00000000000011111000000000000000',
                        '00000000002222222244400000000000',
                        '00000000022222222224400000000000',
                        '00000000022255222224400000000000',
                        '00000000022255222224400000000000',
                        '00000000022222222224400000000000',
                        '00000000022222222220000000000000',
                        '00000000002222222200000000000000',
                        '00000000004444444400000000000000',
                        '00000000004444444400000000000000',
                        '00000000000444444000000000000000',
                        '00000000000044440000000000000000',
                        '00000000000044440000000000000000',
                        '00000000000044440000000000000000',
                        '00000000000044044000000000000000',
                        '00000000000044004400000000000000',
                        '00000000000044004400000000000000',
                        '00000000000044004400000000000000',
                        '00000000000044004440000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                    [
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000004444000000000000000',
                        '00000000000044444400000000000000',
                        '00000000000441114440000000000000',
                        '00000000000111111160000000000000',
                        '00000000001111111166000000000000',
                        '00000000001111111110000000000000',
                        '00000000001111111110000000000000',
                        '00000000000111111100000000000000',
                        '00000000000011111000000000000000',
                        '00000000002222222244400000000000',
                        '00000000022222222224400000000000',
                        '00000000022255222224400000000000',
                        '00000000022255222224400000000000',
                        '00000000022222222224400000000000',
                        '00000000022222222220000000000000',
                        '00000000002222222200000000000000',
                        '00000000004444444400000000000000',
                        '00000000004444444400000000000000',
                        '00000000000444444000000000000000',
                        '00000000000044440000000000000000',
                        '00000000000044440000000000000000',
                        '00000000000440044000000000000000',
                        '00000000004400004400000000000000',
                        '00000000044000000440000000000000',
                        '00000000044000000440000000000000',
                        '00000000440000000044000000000000',
                        '00000000440000000044000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                ],
                west: [
                    [
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000044440000000000000000',
                        '00000000000444444000000000000000',
                        '00000000004441114400000000000000',
                        '00000000061111111000000000000000',
                        '00000000661111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00000004442222222200000000000000',
                        '00000044222222222200000000000000',
                        '00000044222225522200000000000000',
                        '00000044222225522200000000000000',
                        '00000044222222222200000000000000',
                        '00000000022222222200000000000000',
                        '00000000002222222000000000000000',
                        '00000000004444444000000000000000',
                        '00000000004444444000000000000000',
                        '00000000000444440000000000000000',
                        '00000000000044400000000000000000',
                        '00000000000044400000000000000000',
                        '00000000000044400000000000000000',
                        '00000000000440440000000000000000',
                        '00000000004400440000000000000000',
                        '00000000004400440000000000000000',
                        '00000000004400440000000000000000',
                        '00000000044400440000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                    [
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000044440000000000000000',
                        '00000000000444444000000000000000',
                        '00000000004441114400000000000000',
                        '00000000061111111000000000000000',
                        '00000000661111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000011111111100000000000000',
                        '00000000001111111000000000000000',
                        '00000000000111110000000000000000',
                        '00000004442222222200000000000000',
                        '00000044222222222200000000000000',
                        '00000044222225522200000000000000',
                        '00000044222225522200000000000000',
                        '00000044222222222200000000000000',
                        '00000000022222222200000000000000',
                        '00000000002222222000000000000000',
                        '00000000004444444000000000000000',
                        '00000000004444444000000000000000',
                        '00000000000444440000000000000000',
                        '00000000000044400000000000000000',
                        '00000000000044400000000000000000',
                        '00000000000440044000000000000000',
                        '00000000004400004400000000000000',
                        '00000000044000000440000000000000',
                        '00000000044000000440000000000000',
                        '00000000440000000044000000000000',
                        '00000000440000000044000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                        '00000000000000000000000000000000',
                    ],
                ],
            },
        };

        return {
            palette: palettes[classKey] || palettes.warrior,
            grids: allGrids[classKey] || allGrids.warrior
        };
    }

    _drawPixelArt(gfx, { palette, grid }, size) {
        const pixelSize = size / grid.length;
        for (let y = 0; y < grid.length; y++) {
            const row = grid[y];
            for (let x = 0; x < row.length; x++) {
                const val = parseInt(row[x]);
                if (val === 0) continue;
                const color = palette[val];
                if (color === undefined) continue;
                gfx.fillStyle(color, 1);
                gfx.fillRect(x * pixelSize, y * pixelSize, pixelSize + 0.5, pixelSize + 0.5);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ENEMY SPRITES (32x32 pixel art)
    // ─────────────────────────────────────────────────────────────────────────

    generateEnemySprite(key, halfSize, color, enemyType) {
        const S = 32;
        const gfx = this.make.graphics({ add: false });
        const pixels = this._getEnemyPixels(enemyType, color);
        this._drawPixelArt(gfx, pixels, S);
        gfx.generateTexture(key, S, S);
        gfx.destroy();
    }

    _getEnemyPixels(enemyType, color) {
        const dark = this.darkenColor(color, 0.3);
        const light = this.lightenColor(color, 0.2);

        const palettes = {
            swarmer: { 1: color, 2: dark, 3: 0xff0000, 4: 0x111111, 5: light },
            bruiser: { 1: color, 2: dark, 3: 0xff0000, 4: 0x444444, 5: light },
            ranged: { 1: color, 2: dark, 3: 0x44ff44, 4: 0x111111, 5: light },
            bomber: { 1: color, 2: dark, 3: 0xffff00, 4: 0xff4400, 5: 0x664422 },
        };

        const grids = {
            swarmer: [
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00002200000000000000002200000000',
                '00000220000000000000022000000000',
                '00000022000000000000220000000000',
                '00000002211111111122000000000000',
                '00000022111111111111220000000000',
                '00000221111555511111122000000000',
                '00002211111555511111112200000000',
                '00022111111111111111111220000000',
                '00221111111111111111111122000000',
                '02211111133111113311111122000000',
                '02211111133111113311111122000000',
                '00221111111111111111111122000000',
                '00022111111111111111111220000000',
                '00002211111111111111112200000000',
                '00000221111111111111122000000000',
                '00000022111111111111220000000000',
                '00002200221111111122002200000000',
                '00022000002211112200000220000000',
                '00220000000022220000000022000000',
                '02200000000000000000000002200000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
            ],
            bruiser: [
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000022220000000000000000',
                '00000000000222222000000000000000',
                '00000000002211112200000000000000',
                '00000000002213312200000000000000',
                '00000000002213312200000000000000',
                '00000000000211112000000000000000',
                '00000000000022220000000000000000',
                '00000000221111111122000000000000',
                '00000002211111111112200000000000',
                '00000022111111111111220000000000',
                '00000221111111111111122000000000',
                '00002211111155511111112200000000',
                '00002211111155511111112200000000',
                '00022111111111111111111220000000',
                '00022111111111111111111220000000',
                '00002211111111111111112200000000',
                '00000221111111111111122000000000',
                '00000022111111111111220000000000',
                '00000002222111112222000000000000',
                '00000000022211122200000000000000',
                '00000000022200022200000000000000',
                '00000000022200022200000000000000',
                '00000000022200022200000000000000',
                '00000000022200022200000000000000',
                '00000000022200022200000000000000',
                '00000000022200022200000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
            ],
            ranged: [
                '00000000000000000000000000000000',
                '00000000000022220000000000000000',
                '00000000002222222200000000000000',
                '00000000022222222220000000000000',
                '00000000222222222222000000000000',
                '00000000222244432222000000000000',
                '00000000222244432222000000000000',
                '00000000022222222220000000000000',
                '00000000002222222200000000000000',
                '00000000000111111000000000000000',
                '00000000001111111100000000000000',
                '00000000011111111110000000000000',
                '00000000011111111110000000000000',
                '00000000011115511110000000000000',
                '00000000011115511110000000000000',
                '00000000011111111110000000000000',
                '00000000011111111110000000000000',
                '00000000001111111100000000000000',
                '00000000000111111000000000000000',
                '00000000000011110000000000000000',
                '00000000000211120000000000000000',
                '00000000000211120000000000000000',
                '00000000000220022000000000000000',
                '00000000000220022000000000000000',
                '00000000000220022000000000000000',
                '00000000002200002200000000000000',
                '00000000002200002200000000000000',
                '00000000002200002200000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
            ],
            bomber: [
                '00000000000000000000000000000000',
                '00000000000005530000000000000000',
                '00000000000005530000000000000000',
                '00000000000055330000000000000000',
                '00000000000551110000000000000000',
                '00000000001111111000000000000000',
                '00000000011111111100000000000000',
                '00000000111111111110000000000000',
                '00000001111111111111000000000000',
                '00000001111133311111000000000000',
                '00000001111133311111000000000000',
                '00000001111111111111000000000000',
                '00000001114111114111000000000000',
                '00000001114111114111000000000000',
                '00000001111444441111000000000000',
                '00000001111444441111000000000000',
                '00000000111111111110000000000000',
                '00000000011111111100000000000000',
                '00000000001111111000000000000000',
                '00000000000111110000000000000000',
                '00000000000011100000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
            ],
        };

        const p = palettes[enemyType] || palettes.swarmer;
        const g = grids[enemyType] || grids.swarmer;
        return { palette: p, grid: g };
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SPECIAL ENTITIES
    // ─────────────────────────────────────────────────────────────────────────

    generateSkeletonSprite(key, halfSize) {
        const S = 32;
        const gfx = this.make.graphics({ add: false });
        const pixels = {
            palette: { 1: 0xddddcc, 2: 0xaaaaaa, 3: 0x111111, 4: 0x888877, 5: 0xccccbb },
            grid: [
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000011110000000000000000',
                '00000000000111111000000000000000',
                '00000000001111111100000000000000',
                '00000000001113311100000000000000',
                '00000000001113311100000000000000',
                '00000000000111111000000000000000',
                '00000000000011110000000000000000',
                '00000000000001100000000000000000',
                '00000000000011110000000000000000',
                '00000000002211112200000000000000',
                '00000000220115511022000000000000',
                '00000002200115511002200000000000',
                '00000022000115511000220000000000',
                '00000000000115511000000000000000',
                '00000000000115511000000000000000',
                '00000000000111111000000000000000',
                '00000000000011110000000000000000',
                '00000000000004400000000000000000',
                '00000000000044440000000000000000',
                '00000000000441144000000000000000',
                '00000000000440044000000000000000',
                '00000000000440044000000000000000',
                '00000000004400004400000000000000',
                '00000000004400004400000000000000',
                '00000000004400004400000000000000',
                '00000000044400004440000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
            ]
        };
        this._drawPixelArt(gfx, pixels, S);
        gfx.generateTexture(key, S, S);
        gfx.destroy();
    }

    generateBossSprite(key, radius, color) {
        const S = 32;
        const gfx = this.make.graphics({ add: false });
        const dark = this.darkenColor(color, 0.3);
        const light = this.lightenColor(color, 0.2);
        const pixels = {
            palette: { 1: color, 2: dark, 3: 0xff0000, 4: 0xffff00, 5: light, 6: 0x111111 },
            grid: [
                '00000000000000000000000000000000',
                '00002000000000000000000020000000',
                '00002200000000000000002200000000',
                '00002220000022220000022200000000',
                '00000222002222222200222000000000',
                '00000022222211122222200000000000',
                '00000002221134311222000000000000',
                '00000022211134311122200000000000',
                '00000221111111111111220000000000',
                '00002211111111111111122000000000',
                '00022111115111115111112200000000',
                '00021111111111111111111200000000',
                '00221111111111111111112200000000',
                '00211111111111111111111200000000',
                '00211155111111111155111200000000',
                '00211111111111111111111200000000',
                '00221111111111111111112200000000',
                '00022111111111111111112200000000',
                '00002211111111111111120000000000',
                '00000221111111111112200000000000',
                '00000022111111111122000000000000',
                '00000002221111112220000000000000',
                '00000000222222222200000000000000',
                '00000000022111220000000000000000',
                '00000000221000122000000000000000',
                '00000002210000012200000000000000',
                '00000002200000002200000000000000',
                '00000002200000002200000000000000',
                '00000022200000002220000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
            ]
        };
        this._drawPixelArt(gfx, pixels, S);
        gfx.generateTexture(key, S, S);
        gfx.destroy();
    }

    generateSpawnerSprite(key, halfSize) {
        const S = 32;
        const gfx = this.make.graphics({ add: false });
        const pixels = {
            palette: { 1: 0x660066, 2: 0x220022, 3: 0xff44ff, 4: 0xff88ff, 5: 0xffffff },
            grid: [
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000022220000000000000000',
                '00000000002222222200000000000000',
                '00000000022211112220000000000000',
                '00000000221133331122000000000000',
                '00000002211333331122000000000000',
                '00000002211334431122000000000000',
                '00000022113344443311220000000000',
                '00000022133445544331220000000000',
                '00000022133455554331220000000000',
                '00000022133455554331220000000000',
                '00000022133445544331220000000000',
                '00000022113344443311220000000000',
                '00000002211334431122000000000000',
                '00000002211333331122000000000000',
                '00000000221133331122000000000000',
                '00000000022211112220000000000000',
                '00000000002222222200000000000000',
                '00000000000022220000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
            ]
        };
        this._drawPixelArt(gfx, pixels, S);
        gfx.generateTexture(key, S, S);
        gfx.destroy();
    }

    generateStairsSprite(key, size) {
        const S = 32;
        const gfx = this.make.graphics({ add: false });
        const pixels = {
            palette: { 1: 0x4a4a3a, 2: 0x5a5a4a, 3: 0x6a6a5a, 4: 0x7a7a6a, 5: 0xffff44, 6: 0x2a2a2a },
            grid: [
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000005500000000000000000',
                '00000000000055550000000000000000',
                '00000000000555555000000000000000',
                '00000000000055550000000000000000',
                '00000000000005500000000000000000',
                '00000000000000000000000000000000',
                '00001111111111111111110000000000',
                '00001111111111111111110000000000',
                '00006666666666666666660000000000',
                '00006666666666666666660000000000',
                '00000022222222222222000000000000',
                '00000022222222222222000000000000',
                '00000066666666666666000000000000',
                '00000066666666666666000000000000',
                '00000000333333333300000000000000',
                '00000000333333333300000000000000',
                '00000000666666666600000000000000',
                '00000000666666666600000000000000',
                '00000000004444444000000000000000',
                '00000000004444444000000000000000',
                '00000000006666666000000000000000',
                '00000000006666666000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
            ]
        };
        this._drawPixelArt(gfx, pixels, S);
        gfx.generateTexture(key, S, S);
        gfx.destroy();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PICKUPS
    // ─────────────────────────────────────────────────────────────────────────

    generatePotionSprite(key, size, color) {
        const S = 32;
        const gfx = this.make.graphics({ add: false });
        const light = this.lightenColor(color, 0.3);
        const dark = this.darkenColor(color, 0.2);
        const pixels = {
            palette: { 1: color, 2: dark, 3: 0x886644, 4: 0x888888, 5: light, 6: 0xffffff },
            grid: [
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000033330000000000000000',
                '00000000000033330000000000000000',
                '00000000000044440000000000000000',
                '00000000000044440000000000000000',
                '00000000000044440000000000000000',
                '00000000000144441000000000000000',
                '00000000001111111100000000000000',
                '00000000011111111110000000000000',
                '00000000011166111110000000000000',
                '00000000111166111111000000000000',
                '00000000111111111111000000000000',
                '00000000111111111111000000000000',
                '00000000111155511111000000000000',
                '00000000111155511111000000000000',
                '00000000111111111111000000000000',
                '00000000111111111111000000000000',
                '00000000011111111110000000000000',
                '00000000001111111100000000000000',
                '00000000000222222000000000000000',
                '00000000000022220000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
            ]
        };
        this._drawPixelArt(gfx, pixels, S);
        gfx.generateTexture(key, S, S);
        gfx.destroy();
    }

    generateCoinSprite(key, size) {
        const S = 32;
        const gfx = this.make.graphics({ add: false });
        const pixels = {
            palette: { 1: 0xffcc00, 2: 0xddaa00, 3: 0xaa8800, 4: 0xffffff, 5: 0xffee88 },
            grid: [
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000022220000000000000000',
                '00000000002222222200000000000000',
                '00000000022111112200000000000000',
                '00000000221141111220000000000000',
                '00000000211111111120000000000000',
                '00000000211111111120000000000000',
                '00000000211155511120000000000000',
                '00000000211155511120000000000000',
                '00000000211111111120000000000000',
                '00000000211111111120000000000000',
                '00000000221111111220000000000000',
                '00000000022111112200000000000000',
                '00000000002233322200000000000000',
                '00000000000033330000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
                '00000000000000000000000000000000',
            ]
        };
        this._drawPixelArt(gfx, pixels, S);
        gfx.generateTexture(key, S, S);
        gfx.destroy();
    }

    generateGearSprite(key, size, color) {
        const gfx = this.make.graphics({ add: false });

        // Glow
        gfx.fillStyle(color, 0.3);
        gfx.fillCircle(size / 2, size / 2, size / 2);

        // Item box
        gfx.fillStyle(color, 1);
        gfx.fillRoundedRect(2, 2, size - 4, size - 4, 4);

        // Inner shine
        gfx.fillStyle(this.lightenColor(color, 0.4), 1);
        gfx.fillRoundedRect(4, 4, size - 8, size / 2 - 4, 2);

        // Star/quality indicator (diamond shape)
        gfx.fillStyle(0xffffff, 0.8);
        const cx = size / 2;
        const cy = size / 2 + 2;
        gfx.fillTriangle(cx, cy - 4, cx - 4, cy, cx + 4, cy);
        gfx.fillTriangle(cx, cy + 4, cx - 4, cy, cx + 4, cy);

        gfx.generateTexture(key, size, size);
        gfx.destroy();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PROJECTILES & EFFECTS
    // ─────────────────────────────────────────────────────────────────────────

    generateProjectile(key, size, color) {
        const gfx = this.make.graphics({ add: false });
        const cx = size / 2;
        const cy = size / 2;

        // Outer glow halo
        gfx.fillStyle(color, 0.2);
        gfx.fillCircle(cx, cy, size / 2);

        // Mid glow
        gfx.fillStyle(color, 0.5);
        gfx.fillCircle(cx, cy, size / 2 - 2);

        // Core
        gfx.fillStyle(color, 1);
        gfx.fillCircle(cx, cy, size / 3);

        // Bright center
        gfx.fillStyle(0xffffff, 0.9);
        gfx.fillCircle(cx, cy, size / 5);

        // Glow ring
        gfx.lineStyle(1, this.lightenColor(color, 0.3), 0.6);
        gfx.strokeCircle(cx, cy, size / 2 - 1);

        gfx.generateTexture(key, size, size);
        gfx.destroy();
    }

    generateAttackArc(key, size) {
        const gfx = this.make.graphics({ add: false });

        // Semi-transparent arc
        gfx.fillStyle(0xffffff, 0.3);
        gfx.slice(size / 2, size / 2, size / 2 - 2, -Math.PI / 3, Math.PI / 3, false);
        gfx.fillPath();

        // Edge highlight
        gfx.lineStyle(2, 0xffffff, 0.6);
        gfx.arc(size / 2, size / 2, size / 2 - 2, -Math.PI / 3, Math.PI / 3, false);
        gfx.strokePath();

        gfx.generateTexture(key, size, size);
        gfx.destroy();
    }

    generateThrowingAxeProjectile(key, size) {
        const gfx = this.make.graphics({ add: false });
        const cx = size / 2;
        const cy = size / 2;

        // Handle (vertical bar)
        gfx.fillStyle(0x8B5E3C, 1);
        gfx.fillRect(cx - 1, cy - size * 0.4, 2, size * 0.8);

        // Blade (triangle on top-right)
        gfx.fillStyle(0xcccccc, 1);
        gfx.fillTriangle(
            cx + 1, cy - size * 0.35,
            cx + size * 0.4, cy - size * 0.15,
            cx + 1, cy + size * 0.05
        );

        // Blade edge highlight
        gfx.fillStyle(0xffffff, 0.6);
        gfx.fillTriangle(
            cx + 1, cy - size * 0.3,
            cx + size * 0.25, cy - size * 0.18,
            cx + 1, cy - size * 0.05
        );

        gfx.generateTexture(key, size, size);
        gfx.destroy();
    }

    generateArrowProjectile(key, size) {
        const gfx = this.make.graphics({ add: false });
        const cx = size / 2;
        const cy = size / 2;

        // Shaft (horizontal line, arrow points right)
        gfx.fillStyle(0x8B5E3C, 1);
        gfx.fillRect(cx - size * 0.4, cy - 1, size * 0.6, 2);

        // Arrowhead (triangle pointing right)
        gfx.fillStyle(0xcccccc, 1);
        gfx.fillTriangle(
            cx + size * 0.4, cy,
            cx + size * 0.1, cy - size * 0.2,
            cx + size * 0.1, cy + size * 0.2
        );

        // Arrowhead edge highlight
        gfx.fillStyle(0xffffff, 0.5);
        gfx.fillTriangle(
            cx + size * 0.35, cy,
            cx + size * 0.15, cy - size * 0.12,
            cx + size * 0.15, cy + size * 0.02
        );

        // Fletching (small feathers at tail)
        gfx.fillStyle(0xcc4444, 0.8);
        gfx.fillTriangle(
            cx - size * 0.4, cy,
            cx - size * 0.25, cy - size * 0.15,
            cx - size * 0.25, cy
        );
        gfx.fillTriangle(
            cx - size * 0.4, cy,
            cx - size * 0.25, cy + size * 0.15,
            cx - size * 0.25, cy
        );

        gfx.generateTexture(key, size, size);
        gfx.destroy();
    }

    generateDirectionIndicator(key, size) {
        const gfx = this.make.graphics({ add: false });

        gfx.fillStyle(0xffffff, 0.9);
        gfx.fillTriangle(
            size, size / 2,      // Right point
            0, 0,                // Top left
            0, size              // Bottom left
        );

        // Inner darker triangle
        gfx.fillStyle(0xcccccc, 0.8);
        gfx.fillTriangle(
            size - 2, size / 2,
            2, 2,
            2, size - 2
        );

        gfx.generateTexture(key, size, size);
        gfx.destroy();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  UI ELEMENTS
    // ─────────────────────────────────────────────────────────────────────────

    generateUIElements() {
        // HP bar frame
        this.generateBarFrame('ui_hp_frame', 120, 16, 0x442222);

        // Mana bar frame
        this.generateBarFrame('ui_mp_frame', 100, 12, 0x222244);

        // Button
        this.generateButton('ui_button', 100, 30, 0x444444);
        this.generateButton('ui_button_hover', 100, 30, 0x666666);

        // Panel background
        this.generatePanel('ui_panel', 200, 150, 0x222222);

        // Minimap frame
        this.generateMinimapFrame('ui_minimap_frame', 100, 100);
    }

    generateBarFrame(key, width, height, color) {
        const gfx = this.make.graphics({ add: false });

        // Dark border
        gfx.fillStyle(0x111111, 1);
        gfx.fillRect(0, 0, width, height);

        // Inner background
        gfx.fillStyle(color, 1);
        gfx.fillRect(2, 2, width - 4, height - 4);

        // Highlight edge
        gfx.lineStyle(1, this.lightenColor(color, 0.3), 0.5);
        gfx.lineBetween(2, 2, width - 2, 2);

        gfx.generateTexture(key, width, height);
        gfx.destroy();
    }

    generateButton(key, width, height, color) {
        const gfx = this.make.graphics({ add: false });

        // Shadow
        gfx.fillStyle(0x111111, 1);
        gfx.fillRoundedRect(2, 2, width, height, 4);

        // Main button
        gfx.fillStyle(color, 1);
        gfx.fillRoundedRect(0, 0, width, height, 4);

        // Highlight
        gfx.fillStyle(this.lightenColor(color, 0.2), 1);
        gfx.fillRoundedRect(2, 2, width - 4, height / 2 - 2, 2);

        gfx.generateTexture(key, width + 2, height + 2);
        gfx.destroy();
    }

    generatePanel(key, width, height, color) {
        const gfx = this.make.graphics({ add: false });

        // Border
        gfx.fillStyle(0x111111, 1);
        gfx.fillRoundedRect(0, 0, width, height, 8);

        // Main panel
        gfx.fillStyle(color, 0.95);
        gfx.fillRoundedRect(2, 2, width - 4, height - 4, 6);

        // Inner border
        gfx.lineStyle(1, 0x444444, 1);
        gfx.strokeRoundedRect(4, 4, width - 8, height - 8, 4);

        gfx.generateTexture(key, width, height);
        gfx.destroy();
    }

    generateMinimapFrame(key, width, height) {
        const gfx = this.make.graphics({ add: false });

        // Outer border
        gfx.fillStyle(0x333333, 1);
        gfx.fillRect(0, 0, width, height);

        // Inner background
        gfx.fillStyle(0x111111, 1);
        gfx.fillRect(3, 3, width - 6, height - 6);

        // Corner decorations
        gfx.fillStyle(0x555555, 1);
        gfx.fillRect(0, 0, 6, 6);
        gfx.fillRect(width - 6, 0, 6, 6);
        gfx.fillRect(0, height - 6, 6, 6);
        gfx.fillRect(width - 6, height - 6, 6, 6);

        gfx.generateTexture(key, width, height);
        gfx.destroy();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PARTICLES
    // ─────────────────────────────────────────────────────────────────────────

    generateParticleTextures() {
        // Generic particle
        this.generateParticle('particle_white', 4, 0xffffff);
        this.generateParticle('particle_yellow', 4, 0xffff00);
        this.generateParticle('particle_red', 4, 0xff4444);
        this.generateParticle('particle_blue', 4, 0x4444ff);
        this.generateParticle('particle_green', 4, 0x44ff44);
        this.generateParticle('particle_purple', 4, 0xaa44ff);

        // Spark
        this.generateSpark('spark', 8, 0xffff88);

        // Blood/damage
        this.generateSplat('blood_splat', 6, 0xaa0000);

        // Magic burst
        this.generateBurst('magic_burst', 16, 0x8844ff);

        // Fire
        this.generateFlame('flame', 8);

        // Smoke
        this.generateSmoke('smoke', 12);
    }

    generateParticle(key, size, color) {
        const gfx = this.make.graphics({ add: false });
        gfx.fillStyle(color, 1);
        gfx.fillCircle(size / 2, size / 2, size / 2);
        gfx.generateTexture(key, size, size);
        gfx.destroy();
    }

    generateSpark(key, size, color) {
        const gfx = this.make.graphics({ add: false });

        // 4-pointed star
        gfx.fillStyle(color, 1);
        const cx = size / 2;
        const cy = size / 2;
        gfx.fillTriangle(cx, 0, cx - 2, cy, cx + 2, cy);
        gfx.fillTriangle(cx, size, cx - 2, cy, cx + 2, cy);
        gfx.fillTriangle(0, cy, cx, cy - 2, cx, cy + 2);
        gfx.fillTriangle(size, cy, cx, cy - 2, cx, cy + 2);

        // Bright center
        gfx.fillStyle(0xffffff, 1);
        gfx.fillCircle(cx, cy, 2);

        gfx.generateTexture(key, size, size);
        gfx.destroy();
    }

    generateSplat(key, size, color) {
        const gfx = this.make.graphics({ add: false });

        gfx.fillStyle(color, 1);
        gfx.fillCircle(size / 2, size / 2, size / 3);
        // Splatter dots
        gfx.fillCircle(2, size / 2, 2);
        gfx.fillCircle(size - 2, size / 2, 2);
        gfx.fillCircle(size / 2, 2, 2);

        gfx.generateTexture(key, size, size);
        gfx.destroy();
    }

    generateBurst(key, size, color) {
        const gfx = this.make.graphics({ add: false });

        // Outer glow
        gfx.fillStyle(color, 0.3);
        gfx.fillCircle(size / 2, size / 2, size / 2);

        // Inner burst
        gfx.fillStyle(color, 0.7);
        gfx.fillCircle(size / 2, size / 2, size / 3);

        // Core
        gfx.fillStyle(0xffffff, 0.8);
        gfx.fillCircle(size / 2, size / 2, size / 6);

        gfx.generateTexture(key, size, size);
        gfx.destroy();
    }

    generateFlame(key, size) {
        const gfx = this.make.graphics({ add: false });

        // Outer flame (red/orange)
        gfx.fillStyle(0xff6600, 0.8);
        gfx.fillTriangle(size / 2, 0, 0, size, size, size);

        // Inner flame (yellow)
        gfx.fillStyle(0xffcc00, 0.9);
        gfx.fillTriangle(size / 2, size / 4, size / 4, size, size * 3 / 4, size);

        // Core (white)
        gfx.fillStyle(0xffffcc, 1);
        gfx.fillTriangle(size / 2, size / 2, size / 3, size, size * 2 / 3, size);

        gfx.generateTexture(key, size, size);
        gfx.destroy();
    }

    generateSmoke(key, size) {
        const gfx = this.make.graphics({ add: false });

        gfx.fillStyle(0x888888, 0.6);
        gfx.fillCircle(size / 2, size / 2, size / 2);
        gfx.fillStyle(0xaaaaaa, 0.4);
        gfx.fillCircle(size / 2 - 2, size / 2 - 2, size / 3);

        gfx.generateTexture(key, size, size);
        gfx.destroy();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  LEGACY / COMPATIBILITY
    // ─────────────────────────────────────────────────────────────────────────

    generateTileset(key, ts, tiles) {
        const totalWidth = ts * tiles.length;
        const gfx = this.make.graphics({ add: false });
        tiles.forEach((tile, i) => {
            const x = i * ts;
            // Base fill
            gfx.fillStyle(tile.border, 1);
            gfx.fillRect(x, 0, ts, ts);
            gfx.fillStyle(tile.color, 1);
            gfx.fillRect(x + 1, 1, ts - 2, ts - 2);

            // Add texture details for more pixel-art feel
            const light = this.lightenColor(tile.color, 0.08);
            const dark = this.darkenColor(tile.color, 0.1);

            // Random speckles for texture
            for (let py = 2; py < ts - 2; py += 4) {
                for (let px = 2; px < ts - 2; px += 4) {
                    if (Math.random() > 0.6) {
                        gfx.fillStyle(Math.random() > 0.5 ? light : dark, 0.5);
                        gfx.fillRect(x + px, py, 2, 2);
                    }
                }
            }

            // Highlight top-left, shadow bottom-right
            gfx.fillStyle(light, 0.3);
            gfx.fillRect(x + 1, 1, ts - 2, 1);
            gfx.fillRect(x + 1, 1, 1, ts - 2);
            gfx.fillStyle(dark, 0.4);
            gfx.fillRect(x + 1, ts - 2, ts - 2, 1);
            gfx.fillRect(x + ts - 2, 1, 1, ts - 2);
        });
        gfx.generateTexture(key, totalWidth, ts);
        gfx.destroy();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  COLOR UTILITIES
    // ─────────────────────────────────────────────────────────────────────────

    lightenColor(color, amount) {
        const r = Math.min(255, ((color >> 16) & 0xFF) + 255 * amount);
        const g = Math.min(255, ((color >> 8) & 0xFF) + 255 * amount);
        const b = Math.min(255, (color & 0xFF) + 255 * amount);
        return (r << 16) | (g << 8) | b;
    }

    darkenColor(color, amount) {
        const r = Math.max(0, ((color >> 16) & 0xFF) * (1 - amount));
        const g = Math.max(0, ((color >> 8) & 0xFF) * (1 - amount));
        const b = Math.max(0, (color & 0xFF) * (1 - amount));
        return (r << 16) | (g << 8) | b;
    }
}
