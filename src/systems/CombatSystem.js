import { GameConfig } from '../config/GameConfig.js';
import { EventBus, Events } from '../utils/EventBus.js';
import { normalize, distance } from '../utils/MathUtils.js';
import { FeatureFlags } from '../config/FeatureFlags.js';

/**
 * CombatSystem — handles attack hitboxes, damage calculation,
 * knockback, white flash, and floating damage numbers.
 *
 * PERFORMANCE NOTES:
 *  - Damage numbers use an object pool (no new Text per hit).
 *  - Melee hits are resolved via direct arc-math scan of the enemies group,
 *    avoiding a per-attack physics.add.overlap() registration.
 */
export class CombatSystem {
    /**
     * @param {Phaser.Scene} scene - The GameScene
     */
    constructor(scene) {
        this.scene = scene;

        // Object pool for damage number text objects
        // Pre-allocate POOL_SIZE text objects; reuse them on every hit.
        this._dnPoolSize = 24;
        this._dnPool = [];
        this._dnPoolHead = 0; // round-robin index
        this._initDamageNumberPool();

        // PERFORMANCE: Track active projectile update listeners for cleanup
        this._activeProjectileListeners = [];

        // Listen for player attacks
        EventBus.on(Events.PLAYER_ATTACK, this.onPlayerAttack, this);
    }

    // ─── Damage Number Pool ──────────────────────────────────────────────────

    _initDamageNumberPool() {
        for (let i = 0; i < this._dnPoolSize; i++) {
            const text = this.scene.add.text(0, 0, '', {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3,
                fontStyle: 'bold'
            });
            text.setOrigin(0.5);
            text.setDepth(100);
            text.setVisible(false);
            text.setActive(false);
            this._dnPool.push(text);
        }
    }

    /**
     * Acquire a damage number text from the pool (round-robin).
     * Kills any in-progress tween so it can be reused immediately.
     */
    _acquireDamageNumber() {
        const text = this._dnPool[this._dnPoolHead];
        this._dnPoolHead = (this._dnPoolHead + 1) % this._dnPoolSize;

        // Kill existing tween if it was still animating
        this.scene.tweens.killTweensOf(text);

        text.setVisible(true);
        text.setActive(true);
        text.setAlpha(1);
        return text;
    }

    // ─── Attack Handling ─────────────────────────────────────────────────────

    /**
     * Handle a player attack event.
     * Uses direct arc-math scanning instead of physics.add.overlap (avoids
     * accumulating overlap registrations in the physics world).
     */
    onPlayerAttack({ player, angle, attackData, attackPower }) {
        if (attackData.type === 'melee') {
            this.resolveMeleeHit(player, angle, attackData, attackPower);
        } else if (attackData.type === 'cone') {
            this.resolveConeHit(player, angle, attackData, attackPower);
        } else if (attackData.type === 'projectile') {
            const shotCount = attackData.multiShot || 1;
            if (shotCount <= 1) {
                this.firePlayerProjectile(player, angle, attackData, attackPower);
            } else {
                // Spread multiple shots across ±15° per additional projectile
                const spreadStep = Phaser.Math.DegToRad(15);
                const totalSpread = spreadStep * (shotCount - 1);
                const startAngle = angle - totalSpread / 2;
                for (let i = 0; i < shotCount; i++) {
                    this.firePlayerProjectile(player, startAngle + spreadStep * i, attackData, attackPower);
                }
            }
        }
    }

    /**
     * Fire a projectile from the player toward the cursor.
     * Uses a Sprite (not Graphics) so position updates work correctly.
     */
    firePlayerProjectile(player, angle, attackData, attackPower) {
        const speed = attackData.speed || 250;
        const maxRange = attackData.range || 300;
        const pierces = attackData.pierces || false;
        const knockback = attackData.knockback || 0.3;
        const homing = attackData.homing || false;
        const homingTurnRate = 0.04; // radians per frame

        // Use existing 'projectile' texture as a sprite
        const proj = this.scene.add.sprite(player.x, player.y, 'projectile');
        proj.setDepth(8);
        proj.setScale(1.2);
        proj.setTint(player.classData.color);
        proj.setRotation(angle);

        // Particle trail for visibility
        let trailEmitter = null;
        if (this.scene.textures.exists('particle_yellow')) {
            trailEmitter = this.scene.add.particles(0, 0, 'particle_yellow', {
                follow: proj,
                speed: { min: 5, max: 20 },
                scale: { start: 0.6, end: 0 },
                alpha: { start: 0.7, end: 0 },
                lifespan: 200,
                frequency: 30,
                tint: player.classData.color
            }).setDepth(7);
        }

        const startX = player.x;
        const startY = player.y;
        let currentAngle = angle;
        let elapsed = 0;
        const hitEnemies = new Set();
        const combatSystem = this;

        const destroyProj = () => {
            this.scene.events.off('update', update);
            // PERFORMANCE: Untrack the listener
            this._untrackProjectileListener(update);
            if (trailEmitter) {
                trailEmitter.stop();
                this.scene.time.delayedCall(300, () => {
                    if (trailEmitter.active) trailEmitter.destroy();
                });
            }
            proj.destroy();
        };

        const update = (time, delta) => {
            if (!proj.active) return;
            elapsed += delta;

            // Homing: steer toward nearest enemy
            if (homing && combatSystem.scene.enemies) {
                let closest = null;
                let closestDist = Infinity;
                for (const enemy of combatSystem.scene.enemies.getChildren()) {
                    if (!enemy.alive || hitEnemies.has(enemy)) continue;
                    const edx = enemy.x - proj.x;
                    const edy = enemy.y - proj.y;
                    const d = edx * edx + edy * edy;
                    if (d < closestDist) { closestDist = d; closest = enemy; }
                }
                if (closest) {
                    const targetAngle = Math.atan2(closest.y - proj.y, closest.x - proj.x);
                    const diff = Phaser.Math.Angle.Wrap(targetAngle - currentAngle);
                    if (Math.abs(diff) > homingTurnRate) {
                        currentAngle += Math.sign(diff) * homingTurnRate;
                    } else {
                        currentAngle = targetAngle;
                    }
                    proj.setRotation(currentAngle);
                }
            }

            const vx = Math.cos(currentAngle) * speed;
            const vy = Math.sin(currentAngle) * speed;
            proj.x += vx * (delta / 1000);
            proj.y += vy * (delta / 1000);

            // Range check
            const dx = proj.x - startX;
            const dy = proj.y - startY;
            if (dx * dx + dy * dy > maxRange * maxRange) {
                destroyProj();
                return;
            }

            // Time safety
            if (elapsed > 3000) {
                destroyProj();
                return;
            }

            // Enemy collision check
            if (!this.scene.enemies) return;
            for (const enemy of this.scene.enemies.getChildren()) {
                if (!enemy.alive || hitEnemies.has(enemy)) continue;
                const edx = proj.x - enemy.x;
                const edy = proj.y - enemy.y;
                if (edx * edx + edy * edy < 16 * 16) {
                    hitEnemies.add(enemy);
                    this.dealDamage(player, enemy, attackPower, knockback, angle);

                    if (!pierces) {
                        destroyProj();
                        return;
                    }
                }
            }

            // Spawner collision check (before wall check — spawners may
            // occupy tiles that isWalkable() reports as non-walkable)
            for (const spawner of (this.scene.spawners?.getChildren() || [])) {
                if (!spawner.alive) continue;
                const sdx = proj.x - spawner.x;
                const sdy = proj.y - spawner.y;
                if (sdx * sdx + sdy * sdy < 20 * 20) {
                    const dmg = spawner.takeDamage(attackPower);
                    if (dmg > 0) {
                        this.applyWhiteFlash(spawner);
                        this.showDamageNumber(spawner.x, spawner.y, dmg);
                    }
                    if (!pierces) {
                        destroyProj();
                        return;
                    }
                    break;
                }
            }

            // Wall collision check
            if (this.scene.dungeonManager) {
                const ts = 32;
                const tx = (proj.x / ts) | 0;
                const ty = (proj.y / ts) | 0;
                if (!this.scene.dungeonManager.isWalkable(tx, ty)) {
                    destroyProj();
                    return;
                }
            }
        };

        this.scene.events.on('update', update);
        // PERFORMANCE: Track the listener for cleanup
        this._activeProjectileListeners.push(update);
    }

    /**
     * Helper to untrack a projectile listener when it naturally completes.
     */
    _untrackProjectileListener(listener) {
        const idx = this._activeProjectileListeners.indexOf(listener);
        if (idx !== -1) this._activeProjectileListeners.splice(idx, 1);
    }

    /**
     * Resolve melee hit by scanning enemies in arc — no Physics zone needed.
     * This replaces the old createMeleeHitbox/physics.add.overlap approach.
     */
    resolveMeleeHit(player, angle, attackData, attackPower) {
        const range = attackData.range;
        const arcRad = Phaser.Math.DegToRad(attackData.arc);
        const halfArc = arcRad / 2;
        const knockback = attackData.knockback || 1.0;

        // Swing visual (unchanged — this is cheap, just a graphics object)
        const swingGfx = this.scene.add.graphics();
        swingGfx.fillStyle(0xffffff, 0.25);
        swingGfx.slice(player.x, player.y, range, angle - halfArc, angle + halfArc, false);
        swingGfx.fillPath();
        swingGfx.setDepth(9);

        this.scene.tweens.add({
            targets: swingGfx,
            alpha: 0,
            duration: 150,
            onComplete: () => swingGfx.destroy()
        });

        // Direct scan — check each alive enemy against the arc
        if (!this.scene.enemies) return;

        const enemies = this.scene.enemies.getChildren();
        const px = player.x;
        const py = player.y;
        const rangeSq = range * range;

        const stunChance = attackData.stunChance || 0;

        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (!enemy.alive) continue;

            const dx = enemy.x - px;
            const dy = enemy.y - py;

            // Quick squared-distance check before the trig
            if (dx * dx + dy * dy > rangeSq) continue;

            const angleToEnemy = Math.atan2(dy, dx);
            const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angleToEnemy - angle));

            if (angleDiff <= halfArc) {
                this.dealDamage(player, enemy, attackPower, knockback, angle);
                if (stunChance > 0 && Math.random() < stunChance) {
                    this._applyStun(enemy);
                }
            }
        }
    }

    /**
     * Resolve a cone attack (Necromancer dark wave) — similar to melee but with
     * a wider visual and its own damage value.
     */
    resolveConeHit(player, angle, attackData, attackPower) {
        const range = attackData.range;
        const arcRad = Phaser.Math.DegToRad(attackData.arc);
        const halfArc = arcRad / 2;
        const knockback = attackData.knockback || 0.4;
        const damage = attackData.damage || attackPower;

        // Dark wave cone visual (purple)
        const swingGfx = this.scene.add.graphics();
        swingGfx.fillStyle(0x8844aa, 0.35);
        swingGfx.slice(player.x, player.y, range, angle - halfArc, angle + halfArc, false);
        swingGfx.fillPath();
        swingGfx.setDepth(9);

        this.scene.tweens.add({
            targets: swingGfx,
            alpha: 0, scaleX: 1.3, scaleY: 1.3,
            duration: 250,
            onComplete: () => swingGfx.destroy()
        });

        // Scan enemies in cone
        if (!this.scene.enemies) return;

        const enemies = this.scene.enemies.getChildren();
        const px = player.x;
        const py = player.y;
        const rangeSq = range * range;
        const stunChance = attackData.stunChance || 0;

        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (!enemy.alive) continue;

            const dx = enemy.x - px;
            const dy = enemy.y - py;
            if (dx * dx + dy * dy > rangeSq) continue;

            const angleToEnemy = Math.atan2(dy, dx);
            const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angleToEnemy - angle));

            if (angleDiff <= halfArc) {
                this.dealDamage(player, enemy, damage, knockback, angle);
                if (stunChance > 0 && Math.random() < stunChance) {
                    this._applyStun(enemy);
                }
            }
        }
    }

    // ─── Damage Application ──────────────────────────────────────────────────

    /**
     * Deal damage from attacker to target.
     * Handles damage calculation, knockback, flash, and damage numbers.
     */
    dealDamage(source, target, baseDamage, knockbackMultiplier, angle) {
        if (!target.alive) return;

        // [FEATURE: CRIT_SYSTEM] Roll crit before defence is applied
        let isCrit = false;
        let adjustedDamage = baseDamage;
        if (FeatureFlags.CRIT_SYSTEM && (source.critChance || 0) > 0) {
            if (Math.random() < source.critChance) {
                adjustedDamage = Math.floor(baseDamage * 1.5);
                isCrit = true;
            }
        }

        const finalDamage = target.takeDamage(adjustedDamage);
        if (finalDamage <= 0) return;

        if (source.damageDealt !== undefined) {
            source.damageDealt += finalDamage;
        }

        this.applyWhiteFlash(target);
        this.applyKnockback(target, angle, knockbackMultiplier);
        this.showDamageNumber(target.x, target.y, finalDamage, 0xffffff, { isCrit });

        // [FEATURE: SCREEN_SHAKE] Light shake on every enemy hit
        if (FeatureFlags.SCREEN_SHAKE) {
            this.scene.cameras.main.shake(80, 0.002);
        }

        // [FEATURE: HIT_PARTICLES] Spark burst at the point of impact
        if (FeatureFlags.HIT_PARTICLES) {
            const color = source.classData?.color ?? 0xffffff;
            this._spawnHitParticles(target.x, target.y, angle, color, isCrit);
        }

        EventBus.emit(Events.ENTITY_DAMAGED, { source, target, damage: finalDamage, isCrit });
    }

    /**
     * Deal contact damage from enemy to player.
     */
    dealContactDamage(enemy, player) {
        if (!enemy.alive || !player.alive || player.isInvincible) return;
        if (!enemy.canDealContactDamage()) return;

        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        this.dealDamageToPlayer(enemy, player, enemy.damage, angle);
    }

    /**
     * Deal damage to the player specifically.
     */
    dealDamageToPlayer(source, player, baseDamage, angle) {
        if (!player.alive || player.isInvincible) return;

        const finalDamage = player.takeDamage(baseDamage);
        if (finalDamage <= 0) return;

        player.setTintFill(0xff4444);
        this.scene.time.delayedCall(GameConfig.WHITE_FLASH_DURATION, () => {
            if (player.alive) player.clearTint();
        });

        // [FEATURE: SCREEN_SHAKE] Stronger shake when the player takes a hit
        if (FeatureFlags.SCREEN_SHAKE) {
            this.scene.cameras.main.shake(150, 0.005);
        }

        // [FEATURE: DAMAGE_VIGNETTE] Red border flash on player hit
        if (FeatureFlags.DAMAGE_VIGNETTE) {
            this._showDamageVignette();
        }

        this.applyKnockback(player, angle, 0.5);
        this.showDamageNumber(player.x, player.y, finalDamage, 0xff4444);

        player.isInvincible = true;
        player.setAlpha(0.6);
        this.scene.time.delayedCall(300, () => {
            if (player.alive) {
                player.isInvincible = false;
                player.setAlpha(1);
            }
        });
    }

    // ─── Visual Effects ──────────────────────────────────────────────────────

    /**
     * [FEATURE: HIT_PARTICLES]
     * Spawn a small burst of coloured arc-circles at the point of impact.
     * Uses Phaser's Arc GameObjects (no texture needed) + tweens.
     * @param {number} x
     * @param {number} y
     * @param {number} hitAngle - direction of the hit (radians), particles spread around it
     * @param {number} color    - hex colour matching attacker class
     * @param {boolean} isCrit  - crits get more / bigger particles
     */
    _spawnHitParticles(x, y, hitAngle, color, isCrit = false) {
        const count   = isCrit ? 10 : 6;
        const spread  = Math.PI * 0.6;   // radians of spread around hit direction
        const minSpd  = isCrit ? 90 : 60;
        const maxSpd  = isCrit ? 180 : 120;
        const radius  = isCrit ? 4 : 3;

        for (let i = 0; i < count; i++) {
            const angle = hitAngle - spread / 2 + (spread / (count - 1)) * i
                        + (Math.random() - 0.5) * 0.3;
            const speed = minSpd + Math.random() * (maxSpd - minSpd);
            const life  = 200 + Math.random() * 150;

            const circle = this.scene.add.circle(x, y, radius, color, 1);
            circle.setDepth(60);

            this.scene.tweens.add({
                targets: circle,
                x: x + Math.cos(angle) * speed * (life / 1000),
                y: y + Math.sin(angle) * speed * (life / 1000),
                alpha: 0,
                scaleX: 0,
                scaleY: 0,
                duration: life,
                ease: 'Power2',
                onComplete: () => circle.destroy(),
            });
        }
    }

    /**
     * [FEATURE: DAMAGE_VIGNETTE]
     * Flash a red border around the screen edges when the player is hit.
     * Four thin rects at depth 999 (above everything), fade out over 250ms.
     */
    _showDamageVignette() {
        const cam = this.scene.cameras.main;
        const W = cam.width;
        const H = cam.height;
        const thickness = 28;

        const gfx = this.scene.add.graphics();
        gfx.setScrollFactor(0);       // fixed to camera, not world
        gfx.setDepth(999);
        gfx.fillStyle(0xff0000, 0.45);
        gfx.fillRect(0, 0, W, thickness);           // top
        gfx.fillRect(0, H - thickness, W, thickness); // bottom
        gfx.fillRect(0, 0, thickness, H);           // left
        gfx.fillRect(W - thickness, 0, thickness, H); // right

        this.scene.tweens.add({
            targets: gfx,
            alpha: 0,
            duration: 250,
            ease: 'Power2',
            onComplete: () => gfx.destroy(),
        });
    }

    /**
     * Apply white flash effect to a target.
     */
    applyWhiteFlash(target) {
        target.setTintFill(0xffffff);
        this.scene.time.delayedCall(GameConfig.WHITE_FLASH_DURATION, () => {
            if (target.active) target.clearTint();
        });
    }

    /**
     * Apply knockback velocity to a target.
     */
    applyKnockback(target, angle, multiplier = 1) {
        if (!target.body || !target.body.enable) return;

        const resistance = target.knockbackResistance || 0;
        const force = GameConfig.KNOCKBACK_FORCE * multiplier * (1 - resistance);

        // For the player, cancel knockback if it would push into a wall
        if (target.inputSource && this.scene.dungeonManager) {
            const ts = 32;
            const checkDist = 20;
            const destX = target.x + Math.cos(angle) * checkDist;
            const destY = target.y + Math.sin(angle) * checkDist;
            if (!this.scene.dungeonManager.isWalkable((destX / ts) | 0, (destY / ts) | 0)) {
                return;
            }
        }

        target.body.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force);

        this.scene.time.delayedCall(GameConfig.KNOCKBACK_DURATION, () => {
            if (target.body && target.body.enable) {
                if (!target.inputSource) {
                    target.body.setVelocity(0, 0);
                }
            }
        });
    }

    /**
     * Show a floating damage/heal number — uses object pool (no allocations).
     * @param {number} x
     * @param {number} y
     * @param {number|string} amount - damage value or pre-formatted string (e.g. '+30')
     * @param {number|string} color - hex int (0xrrggbb) or CSS color string
     * @param {object} [opts] - optional styling hints { isCrit, isHeal }
     */
    showDamageNumber(x, y, amount, color = 0xffffff, opts = {}) {
        const text = this._acquireDamageNumber();

        // [FEATURE: DYNAMIC_DAMAGE_NUMBERS] vary size/colour/speed by hit type
        let colorStr, fontSize, floatDist, duration;
        if (FeatureFlags.DYNAMIC_DAMAGE_NUMBERS) {
            if (opts.isCrit) {
                colorStr  = '#ffdd00';
                fontSize  = '20px';
                floatDist = 55;
                duration  = GameConfig.DAMAGE_NUMBER_DURATION * 1.1;
                amount    = `${amount}!`;
            } else if (opts.isHeal) {
                colorStr  = '#44ff88';
                fontSize  = '15px';
                floatDist = 30;
                duration  = GameConfig.DAMAGE_NUMBER_DURATION * 1.3;
            } else {
                // Normal damage — keep existing look
                colorStr  = typeof color === 'string' ? color : '#' + color.toString(16).padStart(6, '0');
                fontSize  = '14px';
                floatDist = 30;
                duration  = GameConfig.DAMAGE_NUMBER_DURATION;
            }
        } else {
            // Original behaviour
            colorStr  = typeof color === 'string' ? color : '#' + color.toString(16).padStart(6, '0');
            fontSize  = '14px';
            floatDist = 30;
            duration  = GameConfig.DAMAGE_NUMBER_DURATION;
        }

        text.setPosition(x, y - 10);
        text.setStyle({ color: colorStr, fontSize });
        text.setText(String(amount));
        text.setAlpha(1);
        text.setScale(opts.isCrit && FeatureFlags.DYNAMIC_DAMAGE_NUMBERS ? 1.25 : 1);

        this.scene.tweens.add({
            targets: text,
            y: y - 10 - floatDist,
            alpha: 0,
            duration,
            ease: 'Power2',
            onComplete: () => {
                text.setScale(1);
                text.setVisible(false);
                text.setActive(false);
            }
        });
    }

    /** Apply a brief stun to an enemy (freeze movement for 1s). */
    _applyStun(enemy) {
        if (!enemy.alive || !enemy.body) return;
        enemy.body.setVelocity(0, 0);
        const prevSpeed = enemy.moveSpeed;
        enemy.moveSpeed = 0;
        enemy.setTint(0x8888ff);
        this.scene.time.delayedCall(1000, () => {
            if (enemy.alive) {
                enemy.moveSpeed = prevSpeed;
                enemy.clearTint();
            }
        });
    }

    destroy() {
        EventBus.off(Events.PLAYER_ATTACK, this.onPlayerAttack, this);

        // PERFORMANCE: Clean up all active projectile update listeners
        if (this._activeProjectileListeners) {
            for (const listener of this._activeProjectileListeners) {
                this.scene.events.off('update', listener);
            }
            this._activeProjectileListeners = [];
        }

        // Clean up pooled text objects
        for (const text of this._dnPool) {
            this.scene.tweens.killTweensOf(text);
            text.destroy();
        }
        this._dnPool = [];
    }
}
