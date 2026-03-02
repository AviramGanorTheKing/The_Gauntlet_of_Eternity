import { Enemy } from '../Enemy.js';
import { EnemyData } from '../../config/EnemyData.js';
import { normalize } from '../../utils/MathUtils.js';
import { EventBus, Events } from '../../utils/EventBus.js';

/**
 * Bomber — beelines to nearest target, detonates on contact or after fuse timer.
 * Very fast, low HP, very high AoE damage. Kamikaze behavior.
 */
export class Bomber extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, 'enemy_bomber', EnemyData.bomber);

        this.explosionRadius = EnemyData.bomber.explosionRadius;
        this.fuseTime = EnemyData.bomber.fuseTime;
        this.isExploding = false;
        this.fuseTimer = 0;
        this.hasReachedTarget = false;

        // Visual pulsing effect
        this.pulseTimer = 0;
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.alive || this.isExploding) return;

        // Pulse visual (flash faster as it gets closer)
        this.pulseTimer += delta;
        const dist = this.target ? this.distanceToTarget() : 999;
        const pulseRate = Math.max(100, dist * 2);
        if (this.pulseTimer >= pulseRate) {
            this.pulseTimer = 0;
            this.setTint(0xffff00);
            this.scene.time.delayedCall(50, () => {
                if (this.active && !this.isExploding) this.clearTint();
            });
        }

        if (!this.target || !this.target.alive) {
            this.body.setVelocity(0, 0);
            return;
        }

        // Beeline to target
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const norm = normalize(dx, dy);
        this.body.setVelocity(norm.x * this.moveSpeed, norm.y * this.moveSpeed);

        // Proximity check — start fuse when very close
        if (dist < 20 && !this.hasReachedTarget) {
            this.hasReachedTarget = true;
            this.fuseTimer = 0;
        }

        // Fuse countdown
        if (this.hasReachedTarget) {
            this.fuseTimer += delta;
            if (this.fuseTimer >= this.fuseTime) {
                this.explode();
            }
        }
    }

    /**
     * Explode, dealing AoE damage.
     */
    explode() {
        if (this.isExploding || !this.alive) return;
        this.isExploding = true;
        this.body.setVelocity(0, 0);

        // Visual explosion
        const explosion = this.scene.add.circle(this.x, this.y, this.explosionRadius, 0xffaa00, 0.6);
        explosion.setDepth(15);

        this.scene.tweens.add({
            targets: explosion,
            alpha: 0,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 300,
            onComplete: () => explosion.destroy()
        });

        // Damage player if in radius
        if (this.target && this.target.alive) {
            const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
            if (dist <= this.explosionRadius && this.scene.combatSystem) {
                const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
                this.scene.combatSystem.dealDamageToPlayer(this, this.target, this.damage, angle);
            }
        }

        // Die after explosion
        this.die();
    }

    /**
     * Override: also explode on death if not already exploding.
     */
    takeDamage(amount) {
        const result = super.takeDamage(amount);
        return result;
    }
}
