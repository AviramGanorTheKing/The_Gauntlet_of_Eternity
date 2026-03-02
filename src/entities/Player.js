import { GameConfig } from '../config/GameConfig.js';
import { ClassData } from '../config/ClassData.js';
import { ENTITY_STATES } from '../utils/Constants.js';
import { EventBus, Events } from '../utils/EventBus.js';
import { normalize, angleBetween, angleToDirection, distance } from '../utils/MathUtils.js';
/**
 * Player entity — handles movement, aiming, attacking, dodging, special abilities, and potions.
 * Phase 3: gear slots, potion inventory, gold, special abilities, status effect hooks.
 * Phase 4: specials moved to class subfiles (src/entities/classes/).
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, classKey = 'warrior') {
        const classData = ClassData[classKey];
        super(scene, x, y, `player_${classKey}`, 0);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.classKey = classKey;
        this.classData = classData;

        // Physics body - 32x32 pixel art sprites
        // Use a smaller hitbox (12 pixel radius) centered in the sprite
        const bodyRadius = 12;
        this.body.setCircle(bodyRadius,
            (32 / 2) - bodyRadius,
            (32 / 2) - bodyRadius
        );
        this.body.setCollideWorldBounds(true);
        this.body.setMaxVelocity(300, 300);
        this.body.pushable = false;
        this.setDepth(10);

        // ── Base Stats ──────────────────────────────────────────────────
        this.maxHp = classData.hp;
        this.hp = this.maxHp;
        this.maxMana = GameConfig.MANA_MAX;
        this.mana = this.maxMana;
        this.defense = classData.defense;
        this.attackPower = classData.attack;
        this.attackSpeedRate = classData.attackSpeed;
        this.critChance = 0;
        this.bonusManaRegen = 0;

        const speedMap = {
            slow: GameConfig.PLAYER_SPEED_SLOW,
            medium: GameConfig.PLAYER_SPEED_MEDIUM,
            fast: GameConfig.PLAYER_SPEED_FAST,
        };
        this.moveSpeed = speedMap[classData.speed] || GameConfig.PLAYER_SPEED_MEDIUM;

        // ── Phase 3: Economy & Inventory ────────────────────────────────
        this.gold = 0;
        this.hpPotions = 0;
        this.mpPotions = 0;

        // Gear slots (weapon, armor, accessory) — null = empty
        this.gear = { weapon: null, armor: null, accessory: null };

        // ── State ───────────────────────────────────────────────────────
        this.state = ENTITY_STATES.IDLE;
        this.facingAngle = 0;
        this.facingDirection = 'south';
        this.moveDirection = 'south';  // Direction based on movement input
        this.isDodging = false;
        this.isInvincible = false;
        this.isAttacking = false;
        this.alive = true;

        // ── Animation state ──────────────────────────────────────────────
        this.currentAnim = null;
        this._lastAnimKey = '';

        // ── Cooldown timers ─────────────────────────────────────────────
        this.attackCooldownTimer = 0;
        this.dodgeCooldownTimer = 0;
        this.specialCooldownTimer = 0;
        this.attackCooldownDuration = 1000 / this.attackSpeedRate;

        const dodgeMap = {
            short: GameConfig.DODGE_DISTANCE * 0.7,
            medium: GameConfig.DODGE_DISTANCE,
            long: GameConfig.DODGE_DISTANCE * 1.3,
        };
        this.dodgeDistance = dodgeMap[classData.dodgeDistance] || GameConfig.DODGE_DISTANCE;

        // ── Mana regen ──────────────────────────────────────────────────
        this.manaRegenAccumulator = 0;

        // ── Necromancer skeleton tracking ────────────────────────────────
        this.skeletons = [];

        // ── Aim indicator ───────────────────────────────────────────────
        this.aimIndicator = scene.add.sprite(x, y, 'aim_indicator');
        this.aimIndicator.setDepth(11);
        this.aimIndicator.setAlpha(0.6);

        // ── Input source ────────────────────────────────────────────────
        this.inputSource = null;

        // ── Stats tracking ──────────────────────────────────────────────
        this.killCount = 0;
        this.damageDealt = 0;

        this._onEnemyDied = () => { this.killCount++; };
        EventBus.on(Events.ENEMY_DIED, this._onEnemyDied);

        // ── Play initial animation ───────────────────────────────────────
        this._updateAnimation();
    }

    setInputSource(source) { this.inputSource = source; }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);

        if (!this.alive || !this.inputSource) return;

        // ── Cooldown timers ─────────────────────────────────────────────
        if (this.attackCooldownTimer > 0) this.attackCooldownTimer -= delta;
        if (this.dodgeCooldownTimer > 0) this.dodgeCooldownTimer -= delta;
        if (this.specialCooldownTimer > 0) this.specialCooldownTimer -= delta;

        // ── Mana regen ──────────────────────────────────────────────────
        this.manaRegenAccumulator += delta;
        if (this.manaRegenAccumulator >= 1000) {
            this.manaRegenAccumulator -= 1000;
            const totalRegen = GameConfig.MANA_REGEN_PER_SECOND + (this.bonusManaRegen || 0);
            this.mana = Math.min(this.maxMana, this.mana + totalRegen);
        }

        if (this.isDodging) return;

        // ── Movement ────────────────────────────────────────────────────
        const move = this.inputSource.getMovement();
        if (move.x !== 0 || move.y !== 0) {
            const norm = normalize(move.x, move.y);
            this.body.setVelocity(norm.x * this.moveSpeed, norm.y * this.moveSpeed);
            this.state = ENTITY_STATES.MOVING;

            // Update movement direction based on input (for sprite facing)
            this.moveDirection = this._getMoveDirection(move.x, move.y);
        } else {
            this.body.setVelocity(0, 0);
            if (this.state === ENTITY_STATES.MOVING) this.state = ENTITY_STATES.IDLE;
        }

        // ── Aiming (for attacks, separate from sprite direction) ────────
        const aim = this.inputSource.getAimDirection();
        if (aim.x !== 0 || aim.y !== 0) {
            this.facingAngle = Math.atan2(aim.y, aim.x);
            this.facingDirection = angleToDirection(this.facingAngle);
        }

        // ── Update animation based on state and movement direction ──────
        this._updateAnimation();

        const indicatorDist = 24; // Distance from player center (32x32 sprite)
        this.aimIndicator.x = this.x + Math.cos(this.facingAngle) * indicatorDist;
        this.aimIndicator.y = this.y + Math.sin(this.facingAngle) * indicatorDist;
        this.aimIndicator.setRotation(this.facingAngle);

        // ── Attack ──────────────────────────────────────────────────────
        if (this.inputSource.isAttackPressed() && this.attackCooldownTimer <= 0 && !this.isAttacking) {
            this.performAttack();
        }

        // ── Dodge ───────────────────────────────────────────────────────
        if (this.inputSource.isDodgePressed() && this.dodgeCooldownTimer <= 0 && !this.isDodging) {
            this.performDodge();
        }

        // ── Special ─────────────────────────────────────────────────────
        if (this.inputSource.isSpecialPressed() && this.specialCooldownTimer <= 0) {
            this.performSpecial();
        }

        // ── Potions ─────────────────────────────────────────────────────
        if (this.inputSource.isPotionPressed()) {
            this.useHealthPotion();
        }
        if (this.inputSource.isMPotionPressed?.()) {
            this.useManaPotion();
        }
    }

    // ── Attack ────────────────────────────────────────────────────────────────

    performAttack() {
        this.isAttacking = true;
        this.attackCooldownTimer = this.attackCooldownDuration;
        this.state = ENTITY_STATES.ATTACKING;

        EventBus.emit(Events.PLAYER_ATTACK, {
            player: this,
            angle: this.facingAngle,
            attackData: this.classData.attackStyle,
            attackPower: this.attackPower,
        });

        this.scene.time.delayedCall(200, () => {
            this.isAttacking = false;
            if (this.state === ENTITY_STATES.ATTACKING) this.state = ENTITY_STATES.IDLE;
        });
    }

    // ── Dodge ─────────────────────────────────────────────────────────────────

    performDodge() {
        this.isDodging = true;
        this.isInvincible = true;
        this.state = ENTITY_STATES.DODGING;
        this.dodgeCooldownTimer = GameConfig.DODGE_COOLDOWN;

        EventBus.emit(Events.PLAYER_DODGE, { player: this });

        const move = this.inputSource.getMovement();
        let dirX, dirY;
        if (move.x !== 0 || move.y !== 0) {
            const norm = normalize(move.x, move.y);
            dirX = norm.x; dirY = norm.y;
        } else {
            dirX = Math.cos(this.facingAngle);
            dirY = Math.sin(this.facingAngle);
        }

        const dodgeSpeed = this.dodgeDistance / (GameConfig.DODGE_DURATION / 1000);
        this.body.setVelocity(dirX * dodgeSpeed, dirY * dodgeSpeed);
        this.setAlpha(0.5);

        const iframeDuration = GameConfig.DODGE_DURATION * GameConfig.DODGE_IFRAME_RATIO;
        this.scene.time.delayedCall(iframeDuration, () => {
            this.isInvincible = false;
        });

        this.scene.time.delayedCall(GameConfig.DODGE_DURATION, () => {
            this.isDodging = false;
            this.body.setVelocity(0, 0);
            this.setAlpha(1);
            if (this.state === ENTITY_STATES.DODGING) this.state = ENTITY_STATES.IDLE;
        });
    }

    // ── Special Abilities ────────────────────────────────────────────────────

    performSpecial() {
        const special = this.classData.special;
        if (!special) return;
        if (this.mana < special.manaCost) return; // not enough mana

        this.mana -= special.manaCost;
        this.specialCooldownTimer = special.cooldown;

        this._executeSpecial(special);

        EventBus.emit(Events.SPECIAL_USED, { player: this, special: this.classKey });
    }

    /** Override in subclasses for class-specific special ability. */
    _executeSpecial(special) {}

    // ── Potions ───────────────────────────────────────────────────────────────

    useHealthPotion() {
        if (this.hpPotions <= 0) return;
        if (this.hp >= this.maxHp) return;
        this.hpPotions--;
        const heal = Math.floor(this.maxHp * GameConfig.HEALTH_POTION_HEAL_PERCENT);
        this.hp = Math.min(this.maxHp, this.hp + heal);

        EventBus.emit(Events.POTION_USED, { player: this, type: 'health', heal });
        EventBus.emit(Events.PLAYER_HEALTH_CHANGED, { hp: this.hp, maxHp: this.maxHp });

        // Heal flash (green)
        this.setTintFill(0x44ff88);
        this.scene.time.delayedCall(120, () => { if (this.alive) this.clearTint(); });

        // Floating heal number
        this.scene.combatSystem?.showDamageNumber(this.x, this.y - 10, `+${heal}`, 0x44ff88);
    }

    useManaPotion() {
        if (this.mpPotions <= 0) return;
        if (this.mana >= this.maxMana) return;
        this.mpPotions--;
        const restore = GameConfig.MANA_POTION_RESTORE;
        this.mana = Math.min(this.maxMana, this.mana + restore);

        EventBus.emit(Events.POTION_USED, { player: this, type: 'mana', restore });
    }

    // ── Damage / Death ────────────────────────────────────────────────────────

    takeDamage(amount) {
        if (!this.alive || this.isInvincible) return 0;

        const actual = Math.max(1, amount - this.defense);
        this.hp -= actual;

        EventBus.emit(Events.PLAYER_HEALTH_CHANGED, { hp: this.hp, maxHp: this.maxHp, damage: actual });

        if (this.hp <= 0) { this.hp = 0; this.die(); }

        return actual;
    }

    die() {
        this.alive = false;
        this.state = ENTITY_STATES.DEAD;
        this.body.setVelocity(0, 0);
        this.body.enable = false;
        this.aimIndicator.setVisible(false);

        this.setTintFill(0xff0000);
        this.scene.time.delayedCall(200, () => {
            this.clearTint();
            this.setAlpha(0.4);
        });

        EventBus.emit(Events.PLAYER_DEATH, {
            player: this,
            killCount: this.killCount,
            damageDealt: this.damageDealt,
        });
    }

    // ── Animation Helpers ──────────────────────────────────────────────────

    /**
     * Determine movement direction from input vector.
     */
    _getMoveDirection(moveX, moveY) {
        // Prioritize vertical if both are equal magnitude
        if (Math.abs(moveY) >= Math.abs(moveX)) {
            return moveY > 0 ? 'south' : 'north';
        } else {
            return moveX > 0 ? 'east' : 'west';
        }
    }

    /**
     * Play the appropriate animation based on current state and direction.
     */
    _updateAnimation() {
        if (!this.alive) return;

        const textureKey = `player_${this.classKey}`;
        let animKey;

        if (this.state === ENTITY_STATES.MOVING) {
            animKey = `${textureKey}_walk_${this.moveDirection}`;
        } else {
            animKey = `${textureKey}_idle_${this.moveDirection}`;
        }

        // Only change animation if it's different
        if (animKey !== this._lastAnimKey) {
            this._lastAnimKey = animKey;
            if (this.scene.anims.exists(animKey)) {
                this.play(animKey, true);
            }
        }
    }

    destroy(fromScene) {
        if (this.aimIndicator) this.aimIndicator.destroy();
        EventBus.off(Events.ENEMY_DIED, this._onEnemyDied);
        super.destroy(fromScene);
    }
}

// ── Input Sources ─────────────────────────────────────────────────────────────

export class InputSource {
    getMovement() { return { x: 0, y: 0 }; }
    getAimDirection() { return { x: 0, y: 0 }; }
    isAttackPressed() { return false; }
    isDodgePressed() { return false; }
    isSpecialPressed() { return false; }
    isPotionPressed() { return false; }
    isMPotionPressed() { return false; }
}

export class KeyboardMouseInput extends InputSource {
    constructor(scene) {
        super();
        this.scene = scene;
        this.keys = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            dodge: Phaser.Input.Keyboard.KeyCodes.SPACE,
            special: Phaser.Input.Keyboard.KeyCodes.E,
            potion: Phaser.Input.Keyboard.KeyCodes.Q,
            mpotion: Phaser.Input.Keyboard.KeyCodes.R,
        });

        this._dodgePressed = false;
        scene.input.keyboard.on('keydown-SPACE', () => { this._dodgePressed = true; });
    }

    getMovement() {
        let x = 0, y = 0;
        if (this.keys.left.isDown) x -= 1;
        if (this.keys.right.isDown) x += 1;
        if (this.keys.up.isDown) y -= 1;
        if (this.keys.down.isDown) y += 1;
        return { x, y };
    }

    getAimDirection() {
        const pointer = this.scene.input.activePointer;
        const player = this.scene.player;
        if (!player) return { x: 0, y: 0 };

        // Compute world position from screen position each frame
        // (pointer.worldX/worldY only update on pointer events, goes stale when camera scrolls)
        const camera = this.scene.cameras.main;
        const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
        const dx = worldPoint.x - player.x;
        const dy = worldPoint.y - player.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return { x: 1, y: 0 };
        return { x: dx / len, y: dy / len };
    }

    isAttackPressed() { return this.scene.input.activePointer.isDown; }

    isDodgePressed() {
        if (this._dodgePressed) { this._dodgePressed = false; return true; }
        return false;
    }

    isSpecialPressed() { return Phaser.Input.Keyboard.JustDown(this.keys.special); }
    isPotionPressed() { return Phaser.Input.Keyboard.JustDown(this.keys.potion); }
    isMPotionPressed() { return Phaser.Input.Keyboard.JustDown(this.keys.mpotion); }
}
