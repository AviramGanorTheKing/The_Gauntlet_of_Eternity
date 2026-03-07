import { GameConfig } from '../config/GameConfig.js';
import { EventBus, Events } from '../utils/EventBus.js';

/**
 * Spawner — destructible enemy generator (classic Gauntlet mechanic).
 * Periodically spawns enemies of a given type until destroyed.
 */
export class Spawner extends Phaser.Physics.Arcade.Sprite {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x - world X
     * @param {number} y - world Y
     * @param {string} enemyType - key from EnemyData (e.g., 'swarmer', 'bruiser')
     */
    constructor(scene, x, y, enemyType) {
        super(scene, x, y, 'spawner');

        scene.add.existing(this);
        scene.physics.add.existing(this, true); // static body

        this.setDepth(3);
        this.enemyType = enemyType;

        // Stats
        this.maxHp = 40;
        this.hp = this.maxHp;
        this.alive = true;

        // Spawn timing
        this.spawnInterval = 2000; // ms between spawns
        this.spawnTimer = Phaser.Math.Between(500, 1500); // stagger initial spawn
        this._baseMaxActive = 6; // base value before multiplier
        const mult = window.GAUNTLET_DEBUG?.spawnMultiplier || 1;
        this.maxActiveEnemies = Math.round(this._baseMaxActive * mult);
        this.spawnedEnemies = [];

        // Spawn offset (spawn enemies slightly away from the 32x32 spawner)
        this.spawnRadius = 40;

        // Visual pulse
        this.pulseTimer = 0;
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.alive) return;

        // Self-manage fog-of-war visibility (mirrors Enemy pattern)
        const fog = this.scene.fogOfWar;
        if (fog) {
            const ts = GameConfig.TILE_SIZE;
            const tx = (this.x / ts) | 0;
            const ty = (this.y / ts) | 0;
            const visible = fog.isVisible(tx, ty);
            if (this.visible !== visible) this.setVisible(visible);
        }

        // Clean up dead references (in-place compaction, no allocation)
        let writeIdx = 0;
        for (let i = 0; i < this.spawnedEnemies.length; i++) {
            const e = this.spawnedEnemies[i];
            if (e.alive && e.active) {
                this.spawnedEnemies[writeIdx++] = e;
            }
        }
        this.spawnedEnemies.length = writeIdx;

        // Spawn timer
        this.spawnTimer += delta;
        if (this.spawnTimer >= this.spawnInterval && this.spawnedEnemies.length < this.maxActiveEnemies) {
            this.spawnTimer = 0;
            this.spawnEnemy();
        }

        // Visual pulse effect
        this.pulseTimer += delta;
        if (this.pulseTimer >= 1500) {
            this.pulseTimer = 0;
            this.scene.tweens.add({
                targets: this,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 200,
                yoyo: true
            });
        }
    }

    spawnEnemy() {
        if (!this.scene || !this.scene.spawnEnemyFromSpawner) return;

        const angle = Math.random() * Math.PI * 2;
        const ex = this.x + Math.cos(angle) * this.spawnRadius;
        const ey = this.y + Math.sin(angle) * this.spawnRadius;

        const enemy = this.scene.spawnEnemyFromSpawner(ex, ey, this.enemyType);
        if (enemy) {
            this.spawnedEnemies.push(enemy);
        }
    }

    /**
     * Take damage from player attack.
     */
    takeDamage(amount) {
        if (!this.alive) return 0;

        const actual = Math.max(1, amount);
        this.hp -= actual;

        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        }

        return actual;
    }

    die() {
        this.alive = false;

        // Death effect
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scaleX: 0.2,
            scaleY: 0.2,
            duration: 400,
            onComplete: () => {
                this.destroy();
            }
        });

        EventBus.emit('spawner:destroyed', {
            x: this.x,
            y: this.y,
            enemyType: this.enemyType
        });
    }
}
