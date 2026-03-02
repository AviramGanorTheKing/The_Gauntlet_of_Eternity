import { ShrineData } from '../config/ShrineData.js';
import { GameConfig } from '../config/GameConfig.js';
import { EventBus, Events } from '../utils/EventBus.js';

/**
 * ShrineSystem — manages shrine entities and interactions.
 *
 * Shrines are placed by DungeonManager (via GameScene).
 * Each shrine has a zone; when the player enters, an "F to activate" prompt appears.
 * Pressing F triggers the shrine effect.
 */
export class ShrineSystem {
    /** @param {Phaser.Scene} scene */
    constructor(scene) {
        this.scene = scene;
        this.shrines = [];  // array of shrine state objects
        this._fKey = null;
    }

    init() {
        // F key for shrine interaction
        this._fKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    }

    /**
     * Place a shrine at a world position.
     * @param {number} worldX
     * @param {number} worldY
     * @param {string} shrineType - key from ShrineData
     */
    placeShrine(worldX, worldY, shrineType) {
        const def = ShrineData[shrineType];
        if (!def) return;

        const ts = GameConfig.TILE_SIZE;
        const shrineState = {
            def,
            x: worldX,
            y: worldY,
            used: false,
            playerInRange: false,
        };

        // Visual: glowing pedestal
        const gfx = this.scene.add.graphics();
        this._drawShrine(gfx, worldX, worldY, def, false);
        shrineState.gfx = gfx;

        // Prompt text (hidden by default)
        const prompt = this.scene.add.text(worldX, worldY - ts, '[F] ' + def.label, {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#' + def.color.toString(16).padStart(6, '0'),
            stroke: '#000000',
            strokeThickness: 3,
            backgroundColor: '#000000aa',
            padding: { x: 4, y: 2 }
        }).setOrigin(0.5).setDepth(60).setVisible(false);
        shrineState.prompt = prompt;

        // Interaction zone
        const interactRange = GameConfig.SHRINE_INTERACT_RANGE;
        const zone = this.scene.add.zone(worldX, worldY, interactRange, interactRange);
        this.scene.physics.add.existing(zone, true);
        shrineState.zone = zone;

        // Overlap detection
        this.scene.physics.add.overlap(this.scene.player, zone, () => {
            shrineState.playerInRange = true;
        });

        this.shrines.push(shrineState);
        return shrineState;
    }

    update() {
        const fJustPressed = this._fKey && Phaser.Input.Keyboard.JustDown(this._fKey);
        const player = this.scene.player;
        if (!player?.alive) return;

        for (const shrine of this.shrines) {
            if (shrine.used) {
                shrine.prompt?.setVisible(false);
                continue;
            }

            // Check player distance manually (physics overlap resets each frame)
            const dx = player.x - shrine.x;
            const dy = player.y - shrine.y;
            const distSq = dx * dx + dy * dy;
            const interactR = GameConfig.SHRINE_INTERACT_RANGE / 2;
            const inRange = distSq <= interactR * interactR;

            shrine.playerInRange = inRange;
            shrine.prompt?.setVisible(inRange);

            if (inRange && fJustPressed) {
                this._activate(shrine, player);
            }
        }
    }

    _activate(shrine, player) {
        shrine.used = true;
        shrine.prompt?.setVisible(false);

        const def = shrine.def;
        const result = def.effect(player, this.scene);

        // Shrine of Sacrifice — spawn a rare item
        if (def.id === 'sacrifice' && result === true) {
            this.scene.lootSystem?.spawnRareItem(shrine.x, shrine.y, player.classKey);
        }

        // Shrine of Forgotten — reveal full map
        if (def.id === 'forgotten') {
            this._revealFullMap();
            // Spawn an elite — reuse Swarmer as placeholder
            this.scene.spawnEnemyFromSpawner?.(shrine.x + 50, shrine.y, 'bruiser');
        }

        // Grey out shrine visual
        this._drawShrine(shrine.gfx, shrine.x, shrine.y, def, true);

        // Camera flash
        this.scene.cameras.main.flash(200, 255, 220, 50);

        EventBus.emit(Events.SHRINE_ACTIVATED, { shrineType: def.id, player });
    }

    _revealFullMap() {
        const fog = this.scene.fogOfWar;
        if (!fog) return;
        const gw = fog.gridWidth;
        const gh = fog.gridHeight;
        // Mark entire grid as revealed
        fog.fogGrid.fill(1); // 1 = FOG_REVEALED
        fog.redrawFog();
    }

    _drawShrine(gfx, x, y, def, used) {
        gfx.clear();
        const ts = GameConfig.TILE_SIZE;
        const color = used ? 0x444444 : def.color;
        const alpha = used ? 0.5 : 1;

        // Pedestal base
        gfx.fillStyle(0x222222, alpha);
        gfx.fillRect(x - ts / 2 + 2, y - ts / 2 + 2, ts - 4, ts - 4);

        // Glowing top
        gfx.fillStyle(color, alpha);
        gfx.fillRect(x - ts / 3, y - ts / 2, (2 * ts) / 3, 6);

        // Glow aura
        if (!used) {
            gfx.fillStyle(color, 0.15);
            gfx.fillCircle(x, y, ts * 0.8);
        }

        gfx.setDepth(2);

        // Pulsing tween on the graphics object (on new shrines)
        if (!used) {
            this.scene.tweens.add({
                targets: gfx,
                alpha: { from: 0.85, to: 1 },
                duration: 900,
                yoyo: true,
                repeat: -1,
            });
        }
    }

    clearAll() {
        for (const shrine of this.shrines) {
            shrine.zone?.destroy();
            shrine.gfx?.destroy();
            shrine.prompt?.destroy();
        }
        this.shrines = [];
    }

    destroy() {
        this.clearAll();
    }
}
