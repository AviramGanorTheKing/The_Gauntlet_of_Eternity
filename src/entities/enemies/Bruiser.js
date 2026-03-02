import { Enemy } from '../Enemy.js';
import { EnemyData } from '../../config/EnemyData.js';
import { StateMachine } from '../../ai/StateMachine.js';
import { normalize, distance } from '../../utils/MathUtils.js';

/**
 * Bruiser — patrols, aggros on proximity, charges with a telegraphed attack.
 * High HP, slow, high damage.
 */
export class Bruiser extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, 'enemy_bruiser', EnemyData.bruiser);

        this.chargeSpeed = EnemyData.bruiser.chargeSpeed;
        this.chargeRange = EnemyData.bruiser.chargeRange;

        // Patrol waypoint
        this.patrolOriginX = x;
        this.patrolOriginY = y;
        this.patrolTargetX = x;
        this.patrolTargetY = y;
        this.patrolTimer = 0;

        // Charge state
        this.chargeDirX = 0;
        this.chargeDirY = 0;
        this.chargeTimer = 0;

        // Telegraph (warning before charge)
        this.telegraphTimer = 0;
        this.telegraphDuration = 600; // ms warning before charge
        this.chargeDuration = 400; // ms of actual charge

        // State machine
        this.fsm = new StateMachine(this, 'patrol');
        this.fsm.addState('patrol', {
            enter: this.onPatrolEnter,
            update: this.onPatrolUpdate
        });
        this.fsm.addState('chase', {
            update: this.onChaseUpdate
        });
        this.fsm.addState('telegraph', {
            enter: this.onTelegraphEnter,
            update: this.onTelegraphUpdate
        });
        this.fsm.addState('charge', {
            enter: this.onChargeEnter,
            update: this.onChargeUpdate
        });
        this.fsm.addState('recover', {
            enter: this.onRecoverEnter,
            update: this.onRecoverUpdate
        });
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.alive) return;
        this.fsm.update(time, delta);
    }

    // -- Patrol: wander near origin --
    onPatrolEnter() {
        this.pickPatrolTarget();
        this.patrolTimer = 0;
    }

    onPatrolUpdate(time, delta) {
        // Check for aggro
        if (this.target && this.target.alive && this.distanceToTarget() < this.enemyData.aggroRange) {
            this.fsm.setState('chase');
            return;
        }

        this.patrolTimer += delta;
        const dx = this.patrolTargetX - this.x;
        const dy = this.patrolTargetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5 || this.patrolTimer > 3000) {
            this.body.setVelocity(0, 0);
            this.pickPatrolTarget();
            this.patrolTimer = 0;
        } else {
            const norm = normalize(dx, dy);
            this.body.setVelocity(norm.x * this.moveSpeed * 0.5, norm.y * this.moveSpeed * 0.5);
        }
    }

    pickPatrolTarget() {
        const range = 40;
        this.patrolTargetX = this.patrolOriginX + Phaser.Math.Between(-range, range);
        this.patrolTargetY = this.patrolOriginY + Phaser.Math.Between(-range, range);
    }

    // -- Chase: move toward player --
    onChaseUpdate(time, delta) {
        if (!this.target || !this.target.alive) {
            this.fsm.setState('patrol');
            return;
        }

        const dist = this.distanceToTarget();

        // Lost aggro
        if (dist > this.enemyData.aggroRange * 1.5) {
            this.fsm.setState('patrol');
            return;
        }

        // In charge range — telegraph
        if (dist < this.chargeRange) {
            this.fsm.setState('telegraph');
            return;
        }

        // Move toward target
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const norm = normalize(dx, dy);
        this.body.setVelocity(norm.x * this.moveSpeed, norm.y * this.moveSpeed);
    }

    // -- Telegraph: brief warning before charge --
    onTelegraphEnter() {
        this.telegraphTimer = 0;
        this.body.setVelocity(0, 0);

        // Flash red to telegraph the attack
        this.setTint(0xff4444);

        // Lock aim direction at telegraph start
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const norm = normalize(dx, dy);
            this.chargeDirX = norm.x;
            this.chargeDirY = norm.y;
        }
    }

    onTelegraphUpdate(time, delta) {
        this.telegraphTimer += delta;
        if (this.telegraphTimer >= this.telegraphDuration) {
            this.fsm.setState('charge');
        }
    }

    // -- Charge: dash forward at high speed --
    onChargeEnter() {
        this.chargeTimer = 0;
        this.clearTint();
        this.body.setVelocity(
            this.chargeDirX * this.chargeSpeed,
            this.chargeDirY * this.chargeSpeed
        );
    }

    onChargeUpdate(time, delta) {
        this.chargeTimer += delta;
        if (this.chargeTimer >= this.chargeDuration) {
            this.fsm.setState('recover');
        }
    }

    // -- Recover: brief pause after charge --
    onRecoverEnter() {
        this.chargeTimer = 0;
        this.body.setVelocity(0, 0);
    }

    onRecoverUpdate(time, delta) {
        this.chargeTimer += delta;
        if (this.chargeTimer >= 800) {
            this.fsm.setState('chase');
        }
    }
}
