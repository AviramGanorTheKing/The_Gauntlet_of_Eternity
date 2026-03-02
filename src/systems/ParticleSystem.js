/**
 * ParticleSystem — centralized particle effects for combat feedback and polish.
 *
 * Provides easy-to-call methods for common effects:
 * - Hit sparks, blood splats, magic bursts
 * - Death explosions, heal effects, level up
 * - Environmental particles (dust, embers)
 *
 * Uses Phaser's particle emitter system with pre-configured presets.
 */

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;

        // Particle emitter managers
        this.emitters = new Map();

        // Initialize common particle configs
        this._initEmitters();
    }

    _initEmitters() {
        // Pre-create reusable emitter configs
        this.configs = {
            hitSparks: {
                speed: { min: 100, max: 200 },
                angle: { min: 0, max: 360 },
                scale: { start: 1, end: 0 },
                lifespan: 300,
                gravityY: 200,
                quantity: 8,
                frequency: -1 // one-shot
            },
            blood: {
                speed: { min: 50, max: 150 },
                angle: { min: 0, max: 360 },
                scale: { start: 1, end: 0.3 },
                lifespan: 500,
                gravityY: 300,
                quantity: 6,
                frequency: -1
            },
            magicBurst: {
                speed: { min: 80, max: 180 },
                angle: { min: 0, max: 360 },
                scale: { start: 1.5, end: 0 },
                lifespan: 400,
                gravityY: 0,
                quantity: 12,
                frequency: -1,
                alpha: { start: 1, end: 0 }
            },
            heal: {
                speed: { min: 30, max: 60 },
                angle: { min: 250, max: 290 },
                scale: { start: 0.8, end: 0 },
                lifespan: 800,
                gravityY: -50,
                quantity: 10,
                frequency: -1,
                alpha: { start: 1, end: 0 }
            },
            death: {
                speed: { min: 100, max: 250 },
                angle: { min: 0, max: 360 },
                scale: { start: 1.2, end: 0 },
                lifespan: 600,
                gravityY: 100,
                quantity: 20,
                frequency: -1
            },
            levelUp: {
                speed: { min: 50, max: 100 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.5, end: 1.5 },
                lifespan: 1000,
                gravityY: -80,
                quantity: 30,
                frequency: -1,
                alpha: { start: 1, end: 0 },
                tint: [0xffff00, 0xffaa00, 0xffffff]
            },
            dust: {
                speed: { min: 10, max: 30 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.6, end: 0 },
                lifespan: 400,
                gravityY: 50,
                quantity: 4,
                frequency: -1,
                alpha: { start: 0.5, end: 0 }
            },
            ember: {
                speed: { min: 20, max: 60 },
                angle: { min: 240, max: 300 },
                scale: { start: 0.5, end: 0 },
                lifespan: 1500,
                gravityY: -30,
                quantity: 1,
                frequency: 200,
                alpha: { start: 1, end: 0 },
                tint: [0xff6600, 0xffaa00, 0xff4400]
            },
            smoke: {
                speed: { min: 15, max: 40 },
                angle: { min: 250, max: 290 },
                scale: { start: 0.5, end: 1.5 },
                lifespan: 1200,
                gravityY: -20,
                quantity: 2,
                frequency: 150,
                alpha: { start: 0.6, end: 0 }
            },
            manaRestore: {
                speed: { min: 40, max: 80 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.6, end: 0 },
                lifespan: 600,
                gravityY: -40,
                quantity: 8,
                frequency: -1,
                alpha: { start: 1, end: 0 }
            },
            goldPickup: {
                speed: { min: 60, max: 120 },
                angle: { min: 230, max: 310 },
                scale: { start: 0.8, end: 0 },
                lifespan: 500,
                gravityY: -60,
                quantity: 6,
                frequency: -1
            },
            dash: {
                speed: { min: 20, max: 50 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.8, end: 0 },
                lifespan: 300,
                gravityY: 0,
                quantity: 3,
                frequency: 50,
                alpha: { start: 0.7, end: 0 }
            },
            trail: {
                speed: { min: 5, max: 15 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.5, end: 0 },
                lifespan: 200,
                gravityY: 0,
                quantity: 1,
                frequency: 30,
                alpha: { start: 0.5, end: 0 }
            }
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  COMBAT EFFECTS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Spawn hit sparks at a position (melee impact).
     */
    hitSparks(x, y, color = 0xffffff) {
        this._burst(x, y, 'spark', this.configs.hitSparks, color);
    }

    /**
     * Spawn blood splatter (enemy damage).
     */
    blood(x, y) {
        this._burst(x, y, 'blood_splat', this.configs.blood, 0xaa0000);
    }

    /**
     * Spawn magic burst (spell impact).
     */
    magicBurst(x, y, color = 0x8844ff) {
        this._burst(x, y, 'magic_burst', this.configs.magicBurst, color);
    }

    /**
     * Enemy death explosion.
     */
    deathExplosion(x, y, color = 0xff4444) {
        this._burst(x, y, 'particle_red', this.configs.death, color);

        // Additional white sparks
        this.scene.time.delayedCall(50, () => {
            this._burst(x, y, 'spark', {
                ...this.configs.hitSparks,
                quantity: 10,
                speed: { min: 150, max: 300 }
            }, 0xffffff);
        });
    }

    /**
     * Boss death (bigger explosion).
     */
    bossDeathExplosion(x, y, color = 0xff4444) {
        // Multiple waves of particles
        for (let i = 0; i < 3; i++) {
            this.scene.time.delayedCall(i * 150, () => {
                this._burst(x, y, 'particle_red', {
                    ...this.configs.death,
                    quantity: 30,
                    speed: { min: 150 + i * 50, max: 350 + i * 50 }
                }, color);
            });
        }

        // Screen flash
        this.scene.cameras.main.flash(300, 255, 255, 255);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  POSITIVE EFFECTS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Healing particles (green, float up).
     */
    heal(x, y) {
        this._burst(x, y, 'particle_green', this.configs.heal, 0x44ff44);
    }

    /**
     * Mana restore particles (blue).
     */
    manaRestore(x, y) {
        this._burst(x, y, 'particle_blue', this.configs.manaRestore, 0x4488ff);
    }

    /**
     * Level up / power up effect.
     */
    levelUp(x, y) {
        this._burst(x, y, 'particle_yellow', this.configs.levelUp, 0xffff00);

        // Ring expansion effect
        const ring = this.scene.add.circle(x, y, 10, 0xffff00, 0.8).setDepth(100);
        this.scene.tweens.add({
            targets: ring,
            radius: 80,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => ring.destroy()
        });
    }

    /**
     * Gold pickup sparkle.
     */
    goldPickup(x, y) {
        this._burst(x, y, 'particle_yellow', this.configs.goldPickup, 0xffcc00);
    }

    /**
     * Item pickup glow.
     */
    itemPickup(x, y, color = 0x44ff44) {
        this._burst(x, y, 'spark', {
            ...this.configs.goldPickup,
            quantity: 8
        }, color);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  MOVEMENT EFFECTS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Dash/dodge trail effect.
     * Returns the emitter so it can be stopped when dash ends.
     */
    dashTrail(target, color = 0xffffff) {
        const emitter = this.scene.add.particles(0, 0, 'particle_white', {
            ...this.configs.dash,
            follow: target,
            tint: color
        }).setDepth(4);

        return emitter;
    }

    /**
     * Movement dust puffs.
     */
    movementDust(x, y) {
        this._burst(x, y, 'smoke', this.configs.dust, 0x888888);
    }

    /**
     * Teleport effect (wizard blink).
     */
    teleportOut(x, y, color = 0x44aaff) {
        // Imploding particles
        const emitter = this.scene.add.particles(x, y, 'particle_blue', {
            speed: { min: 100, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 300,
            quantity: 15,
            frequency: -1,
            tint: color
        }).setDepth(10);

        emitter.explode();

        this.scene.time.delayedCall(400, () => emitter.destroy());
    }

    teleportIn(x, y, color = 0x44aaff) {
        // Exploding particles
        this._burst(x, y, 'particle_blue', {
            ...this.configs.magicBurst,
            quantity: 15
        }, color);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ENVIRONMENTAL EFFECTS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Create ambient embers (for inferno biome).
     */
    createEmberAmbient(x, y, width, height) {
        return this.scene.add.particles(x, y, 'flame', {
            ...this.configs.ember,
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Rectangle(0, 0, width, height)
            }
        }).setDepth(3);
    }

    /**
     * Create ambient smoke (for ruins/caves).
     */
    createSmokeAmbient(x, y) {
        return this.scene.add.particles(x, y, 'smoke', {
            ...this.configs.smoke
        }).setDepth(3);
    }

    /**
     * Trap activation burst.
     */
    trapActivation(x, y, type = 'spike') {
        const colors = {
            spike: 0xaaaaaa,
            fire: 0xff6600,
            poison: 0x44aa44,
            ice: 0x44aaff
        };

        this._burst(x, y, 'spark', {
            ...this.configs.hitSparks,
            quantity: 12
        }, colors[type] || 0xffffff);
    }

    /**
     * Shrine activation effect.
     */
    shrineActivation(x, y, color = 0xffaa00) {
        // Rising particles
        this._burst(x, y, 'particle_yellow', {
            ...this.configs.heal,
            quantity: 20,
            lifespan: 1200
        }, color);

        // Expanding ring
        for (let i = 0; i < 3; i++) {
            this.scene.time.delayedCall(i * 200, () => {
                const ring = this.scene.add.circle(x, y, 20, color, 0.6).setDepth(100);
                this.scene.tweens.add({
                    targets: ring,
                    radius: 60 + i * 20,
                    alpha: 0,
                    duration: 600,
                    ease: 'Power2',
                    onComplete: () => ring.destroy()
                });
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ABILITY EFFECTS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Shield bash impact.
     */
    shieldBash(x, y, angle) {
        // Directional sparks
        const spread = 60;
        this._burst(x, y, 'spark', {
            ...this.configs.hitSparks,
            angle: { min: Phaser.Math.RadToDeg(angle) - spread / 2, max: Phaser.Math.RadToDeg(angle) + spread / 2 },
            quantity: 12
        }, 0xccaa44);
    }

    /**
     * Arrow trail.
     */
    arrowTrail(projectile) {
        return this.scene.add.particles(0, 0, 'particle_white', {
            ...this.configs.trail,
            follow: projectile,
            tint: 0xcccccc
        }).setDepth(4);
    }

    /**
     * Fireball trail.
     */
    fireballTrail(projectile) {
        return this.scene.add.particles(0, 0, 'flame', {
            speed: { min: 10, max: 30 },
            scale: { start: 0.8, end: 0 },
            lifespan: 300,
            frequency: 20,
            follow: projectile,
            followOffset: { x: 0, y: 0 }
        }).setDepth(4);
    }

    /**
     * Skeleton summon effect.
     */
    summonEffect(x, y) {
        // Dark particles rising from ground
        this._burst(x, y, 'particle_purple', {
            ...this.configs.heal,
            quantity: 15,
            gravityY: -100
        }, 0x8844aa);

        // Ground crack effect (simple graphics)
        const crack = this.scene.add.graphics().setDepth(1);
        crack.lineStyle(2, 0x442266, 1);
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const len = 15 + Math.random() * 10;
            crack.lineBetween(x, y, x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        }

        this.scene.tweens.add({
            targets: crack,
            alpha: 0,
            duration: 800,
            onComplete: () => crack.destroy()
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  INTERNAL HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Create a one-shot particle burst.
     */
    _burst(x, y, texture, config, tint) {
        // Check if texture exists, fallback to particle_white
        const textureKey = this.scene.textures.exists(texture) ? texture : 'particle_white';

        const emitter = this.scene.add.particles(x, y, textureKey, {
            ...config,
            tint: tint
        }).setDepth(50);

        emitter.explode();

        // Auto-destroy after particles finish
        const cleanupTime = (config.lifespan || 500) + 100;
        this.scene.time.delayedCall(cleanupTime, () => {
            if (emitter.active) emitter.destroy();
        });

        return emitter;
    }

    /**
     * Stop and destroy all active emitters.
     */
    destroy() {
        this.emitters.forEach(emitter => {
            if (emitter.active) emitter.destroy();
        });
        this.emitters.clear();
    }
}
