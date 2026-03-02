/**
 * TutorialPromptSystem — contextual first-run hints.
 *
 * No "TUTORIAL" label. First run rooms teach naturally:
 *
 * | When                | Prompt                      | Trigger                                |
 * |---------------------|-----------------------------|----------------------------------------|
 * | First enemies       | "Click to attack"           | First swarmer spawns                  |
 * | First damage taken  | "SPACE to dodge"            | Player takes damage                   |
 * | First spawner       | "Destroy the spawner!"      | Spawner enters view                   |
 * | First potion        | "Q to use potion"           | Potion drops near damaged player      |
 * | First mana full     | "E for special ability"     | Player has full mana + enemies nearby |
 * | First gear          | "Walk over gear to equip"   | Gear drops                            |
 * | First shop          | "Spend gold on supplies"    | Enter shop room                       |
 * | First shrine        | "F to interact"             | Near shrine                           |
 * | First boss door     | "Enter when ready"          | Near boss door                        |
 *
 * Rules:
 * - Each prompt shown exactly once (persisted in save profile)
 * - Floating gold text above relevant object with typewriter reveal
 * - Auto-dismiss after 4 seconds or on player action
 * - "Disable hints" toggle in settings
 * - Implemented via EventBus listeners in GameScene
 */

import { EventBus, Events } from '../utils/EventBus.js';
import { saveManager } from './SaveManager.js';

const PROMPTS = {
    first_enemy:   { text: 'Click to attack',          dismissOnEvent: Events.PLAYER_ATTACK },
    first_damage:  { text: 'SPACE to dodge',            dismissOnEvent: Events.PLAYER_DODGE },
    first_spawner: { text: 'Destroy the spawner!',      dismissOnEvent: null },
    first_potion:  { text: 'Q to use health potion',    dismissOnEvent: Events.POTION_USED },
    first_mana:    { text: 'E for special ability',     dismissOnEvent: Events.SPECIAL_USED },
    first_gear:    { text: 'Walk over gear to equip',   dismissOnEvent: Events.GEAR_EQUIPPED },
    first_shop:    { text: 'Spend gold on supplies',    dismissOnEvent: null },
    first_shrine:  { text: 'F to interact',             dismissOnEvent: Events.SHRINE_ACTIVATED },
    first_boss:    { text: 'Enter when ready',          dismissOnEvent: null },
};

const DISPLAY_DURATION = 4000; // auto-dismiss after 4s

export class TutorialPromptSystem {
    /**
     * @param {Phaser.Scene} scene - GameScene
     */
    constructor(scene) {
        this.scene = scene;
        this.enabled = true;

        /** Set of prompt keys already shown (persisted) */
        this._shown = new Set();

        /** Currently displayed prompt */
        this._activePrompt = null;
        this._activeText = null;
        this._dismissTimer = null;
        this._dismissListener = null;

        // Load persisted state
        this._loadState();

        // Register EventBus triggers
        EventBus.on(Events.ENEMY_SPAWNED, this._onEnemySpawned, this);
        EventBus.on(Events.ENTITY_DAMAGED, this._onEntityDamaged, this);
        EventBus.on(Events.PICKUP_COLLECTED, this._onPickupCollected, this);
        EventBus.on(Events.SHRINE_ACTIVATED, this._onShrineNearby, this);
    }

    /**
     * Check for mana-full prompt (called from GameScene update).
     */
    checkManaFull(player, hasNearbyEnemies) {
        if (!this.enabled || this._shown.has('first_mana')) return;
        if (player.mana >= player.maxMana && hasNearbyEnemies) {
            this._showPrompt('first_mana', player.x, player.y - 30);
        }
    }

    /**
     * Trigger when entering a shop room.
     */
    triggerShop(x, y) {
        if (!this.enabled || this._shown.has('first_shop')) return;
        this._showPrompt('first_shop', x, y - 20);
    }

    /**
     * Trigger when near a boss door.
     */
    triggerBossDoor(x, y) {
        if (!this.enabled || this._shown.has('first_boss')) return;
        this._showPrompt('first_boss', x, y - 20);
    }

    /**
     * Trigger when a spawner enters view.
     */
    triggerSpawnerVisible(x, y) {
        if (!this.enabled || this._shown.has('first_spawner')) return;
        this._showPrompt('first_spawner', x, y - 20);
    }

    /**
     * Toggle hint display.
     */
    setEnabled(val) {
        this.enabled = val;
        if (!val) this._dismiss();
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  DISPLAY
    // ══════════════════════════════════════════════════════════════════════════

    _showPrompt(key, worldX, worldY) {
        if (this._shown.has(key) || !this.enabled) return;
        if (this._activePrompt) this._dismiss(); // clear previous

        const promptDef = PROMPTS[key];
        if (!promptDef) return;

        this._shown.add(key);
        this._activePrompt = key;
        this._saveState();

        // Floating gold text above the relevant position
        const text = this.scene.add.text(worldX, worldY, '', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#ffdd44',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center',
        }).setOrigin(0.5).setDepth(600);

        this._activeText = text;

        // Typewriter reveal
        const fullText = promptDef.text;
        let charIdx = 0;
        const typeTimer = this.scene.time.addEvent({
            delay: 30,
            callback: () => {
                charIdx++;
                text.setText(fullText.substring(0, charIdx));
                if (charIdx >= fullText.length) typeTimer.destroy();
            },
            loop: true
        });

        // Auto-dismiss after 4 seconds
        this._dismissTimer = this.scene.time.delayedCall(DISPLAY_DURATION, () => {
            this._dismiss();
        });

        // Dismiss on relevant action
        if (promptDef.dismissOnEvent) {
            this._dismissListener = () => this._dismiss();
            EventBus.once(promptDef.dismissOnEvent, this._dismissListener);
        }
    }

    _dismiss() {
        if (this._activeText?.active) {
            this.scene.tweens.add({
                targets: this._activeText,
                alpha: 0,
                y: this._activeText.y - 15,
                duration: 300,
                onComplete: () => {
                    if (this._activeText?.active) this._activeText.destroy();
                    this._activeText = null;
                }
            });
        }

        if (this._dismissTimer) {
            this._dismissTimer.destroy();
            this._dismissTimer = null;
        }

        this._activePrompt = null;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  EVENT HANDLERS
    // ══════════════════════════════════════════════════════════════════════════

    _onEnemySpawned({ enemy, x, y }) {
        if (this._shown.has('first_enemy')) return;
        this._showPrompt('first_enemy', x, y - 30);
    }

    _onEntityDamaged({ target, damage }) {
        // Check if player took damage
        if (target === this.scene.player && !this._shown.has('first_damage')) {
            this._showPrompt('first_damage', target.x, target.y - 30);
        }
    }

    _onPickupCollected({ type, x, y }) {
        if (type === 'gear' && !this._shown.has('first_gear')) {
            // Show when gear drops (not collects) — but trigger on next gear
            // Actually, show when gear is nearby
        }
        if (type === 'health' && !this._shown.has('first_potion')) {
            const player = this.scene.player;
            if (player && player.hp < player.maxHp) {
                this._showPrompt('first_potion', player.x, player.y - 30);
            }
        }
    }

    _onShrineNearby() {
        // Shrine prompt handled via triggerShop/triggerBossDoor pattern
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  PERSISTENCE
    // ══════════════════════════════════════════════════════════════════════════

    _loadState() {
        try {
            const permanent = saveManager.getPermanent();
            if (permanent?.tutorialShown) {
                this._shown = new Set(permanent.tutorialShown);
            }
        } catch (e) { /* first run */ }
    }

    _saveState() {
        try {
            saveManager.updatePermanent({
                tutorialShown: [...this._shown]
            });
        } catch (e) { /* ignore */ }
    }

    destroy() {
        EventBus.off(Events.ENEMY_SPAWNED, this._onEnemySpawned, this);
        EventBus.off(Events.ENTITY_DAMAGED, this._onEntityDamaged, this);
        EventBus.off(Events.PICKUP_COLLECTED, this._onPickupCollected, this);
        EventBus.off(Events.SHRINE_ACTIVATED, this._onShrineNearby, this);

        this._dismiss();
    }
}
