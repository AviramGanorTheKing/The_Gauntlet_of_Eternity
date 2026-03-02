import { GameConfig } from '../config/GameConfig.js';
import { RARITY_COLORS, RARITY_NAMES } from '../config/GearData.js';
import { EventBus, Events } from '../utils/EventBus.js';

/**
 * Pickup — base entity for items dropped on the floor.
 * Types: 'health_potion' | 'mana_potion' | 'gold' | 'gear'
 *
 * All pickups are physics-static sprites drawn as colored circles.
 * Player walks over them to collect (overlap in GameScene).
 */
export class Pickup extends Phaser.Physics.Arcade.Sprite {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     * @param {'health_potion'|'mana_potion'|'gold'|'gear'} type
     * @param {object} data - type-specific payload
     */
    constructor(scene, x, y, type, data = {}) {
        const textureKey = Pickup._textureKey(scene, type, data);
        super(scene, x, y, textureKey);

        scene.add.existing(this);
        scene.physics.add.existing(this, false);

        this.pickupType = type;
        this.pickupData = data;

        // Circular body for 32x32 pickup sprites
        const r = 12;
        this.body.setCircle(r, (32 / 2) - r, (32 / 2) - r);
        this.body.setAllowGravity(false);
        this.body.setImmovable(true);

        this.setDepth(7);
        this.alive = true;

        // Bob animation
        scene.tweens.add({
            targets: this,
            y: y - 4,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Label above pickup
        let labelStr = '';
        if (type === 'gold') labelStr = `${data.amount}g`;
        else if (type === 'gear') labelStr = data.name || 'Gear';
        else if (type === 'health_potion') labelStr = 'HP';
        else if (type === 'mana_potion') labelStr = 'MP';

        if (labelStr) {
            this._label = scene.add.text(x, y - 16, labelStr, {
                fontFamily: 'monospace',
                fontSize: '9px',
                color: type === 'gear'
                    ? '#' + (RARITY_COLORS[data.rarity] || 0xffffff).toString(16).padStart(6, '0')
                    : '#ffffff',
                stroke: '#000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(8);
        }
    }

    /**
     * Collect this pickup — called when player overlaps.
     * @param {import('../entities/Player.js').Player} player
     */
    collect(player) {
        if (!this.alive) return;
        this.alive = false;

        EventBus.emit(Events.PICKUP_COLLECTED, {
            player,
            type: this.pickupType,
            data: this.pickupData,
        });

        // Flash + disappear
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 150,
            onComplete: () => this.destroy()
        });

        if (this._label) {
            this.scene.tweens.add({
                targets: this._label,
                alpha: 0,
                y: this._label.y - 10,
                duration: 200,
                onComplete: () => this._label.destroy()
            });
        }
    }

    destroy(fromScene) {
        if (this._label && this._label.active) this._label.destroy();
        super.destroy(fromScene);
    }

    // ── Static helpers ────────────────────────────────────────────────────

    /**
     * Get or generate the texture key for this pickup type.
     */
    static _textureKey(scene, type, data) {
        let key, color;
        if (type === 'health_potion') { key = 'pickup_hp'; color = 0xee3333; }
        else if (type === 'mana_potion') { key = 'pickup_mp'; color = 0x3366ee; }
        else if (type === 'gold') { key = 'pickup_gold'; color = 0xffcc00; }
        else if (type === 'gear') {
            key = `pickup_gear_${data.rarity ?? 0}`;
            color = RARITY_COLORS[data.rarity ?? 0];
        } else { key = 'pickup_misc'; color = 0xffffff; }

        if (!scene.textures.exists(key)) {
            const gfx = scene.make.graphics({ add: false });
            // Outer glow
            gfx.fillStyle(color, 0.3);
            gfx.fillCircle(10, 10, 10);
            // Solid center
            gfx.fillStyle(color, 1);
            gfx.fillCircle(10, 10, 7);
            // Bright highlight
            gfx.fillStyle(0xffffff, 0.5);
            gfx.fillCircle(7, 7, 3);
            gfx.generateTexture(key, 20, 20);
            gfx.destroy();
        }

        return key;
    }
}
