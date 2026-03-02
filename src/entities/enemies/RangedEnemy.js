import { Enemy } from '../Enemy.js';
import { EnemyData } from '../../config/EnemyData.js';
import { StateMachine } from '../../ai/StateMachine.js';
import { normalize } from '../../utils/MathUtils.js';
import { EventBus, Events } from '../../utils/EventBus.js';

/**
 * RangedEnemy — keeps distance from player, shoots projectiles,
 * flees when player gets too close.
 */
export class RangedEnemy extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, 'enemy_ranged', EnemyData.ranged);

        this.preferredDistance = EnemyData.ranged.preferredDistance;
        this.projectileSpeed = EnemyData.ranged.projectileSpeed;
        this.shootCooldown = EnemyData.ranged.attackCooldown;
        this.lastShootTime = 0;

        this.fsm = new StateMachine(this, 'idle');
        this.fsm.addState('idle', {
            update: this.onIdleUpdate
        });
        this.fsm.addState('reposition', {
            update: this.onRepositionUpdate
        });
        this.fsm.addState('shoot', {
            enter: this.onShootEnter,
            update: this.onShootUpdate
        });
        this.fsm.addState('flee', {
            update: this.onFleeUpdate
        });
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.alive) return;
        this.fsm.update(time, delta);
    }

    // -- Idle: wait for aggro --
    onIdleUpdate(time, delta) {
        if (this.target && this.target.alive && this.distanceToTarget() < this.enemyData.aggroRange) {
            this.fsm.setState('reposition');
        }
    }

    // -- Reposition: maintain preferred distance --
    onRepositionUpdate(time, delta) {
        if (!this.target || !this.target.alive) {
            this.fsm.setState('idle');
            return;
        }

        const dist = this.distanceToTarget();

        // Lost aggro
        if (dist > this.enemyData.aggroRange * 1.5) {
            this.fsm.setState('idle');
            this.body.setVelocity(0, 0);
            return;
        }

        // Too close — flee
        if (dist < this.preferredDistance * 0.5) {
            this.fsm.setState('flee');
            return;
        }

        // At good distance — shoot
        if (dist >= this.preferredDistance * 0.7 && dist <= this.preferredDistance * 1.3) {
            const now = this.scene.time.now;
            if (now - this.lastShootTime >= this.shootCooldown) {
                this.fsm.setState('shoot');
                return;
            }
        }

        // Move to preferred distance
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const norm = normalize(dx, dy);

        if (dist < this.preferredDistance * 0.8) {
            // Too close, back up
            this.body.setVelocity(-norm.x * this.moveSpeed, -norm.y * this.moveSpeed);
        } else if (dist > this.preferredDistance * 1.2) {
            // Too far, approach
            this.body.setVelocity(norm.x * this.moveSpeed, norm.y * this.moveSpeed);
        } else {
            // Strafe sideways
            this.body.setVelocity(-norm.y * this.moveSpeed * 0.5, norm.x * this.moveSpeed * 0.5);
        }
    }

    // -- Shoot: fire a projectile at the player --
    onShootEnter() {
        this.body.setVelocity(0, 0);
        this.lastShootTime = this.scene.time.now;

        if (!this.target || !this.target.alive) return;

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const norm = normalize(dx, dy);

        // Create projectile
        if (this.scene.createEnemyProjectile) {
            this.scene.createEnemyProjectile(this.x, this.y, norm.x, norm.y, this.projectileSpeed, this.damage);
        }

        // Brief flash
        this.setTint(0xff88ff);
        this.scene.time.delayedCall(100, () => {
            if (this.active) this.clearTint();
        });
    }

    onShootUpdate(time, delta) {
        // Brief pause after shooting, then reposition
        this.scene.time.delayedCall(300, () => {
            if (this.alive) this.fsm.setState('reposition');
        });
    }

    // -- Flee: run away when player gets too close --
    onFleeUpdate(time, delta) {
        if (!this.target || !this.target.alive) {
            this.fsm.setState('idle');
            return;
        }

        const dist = this.distanceToTarget();

        if (dist > this.preferredDistance * 0.8) {
            this.fsm.setState('reposition');
            return;
        }

        // Run directly away
        const dx = this.x - this.target.x;
        const dy = this.y - this.target.y;
        const norm = normalize(dx, dy);
        this.body.setVelocity(norm.x * this.moveSpeed * 1.3, norm.y * this.moveSpeed * 1.3);
    }
}
