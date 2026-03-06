import { EventBus, Events } from '../utils/EventBus.js';
import { StatusEffectData } from '../config/StatusEffectData.js';
import { RARITY_COLORS } from '../config/GearData.js';

/**
 * UIScene — runs in parallel above GameScene.
 *
 * Redesigned HUD layout (800×600 canvas):
 *
 * Top-left cluster:
 *   - Segmented HP bar (red blocks) with numeric value
 *   - Segmented Mana bar (blue blocks) below
 *   - Status effect icon row below mana
 *
 * Top-right:
 *   - Floor indicator text above minimap
 *   - Minimap with room-type icons (skull=boss, coin=shop, star=shrine, ?=secret)
 *
 * Bottom-left:
 *   - Potion slots with quantity + keybind labels (Q, R)
 *   - Gold counter with coin icon
 *
 * Bottom-right:
 *   - Special ability icon with radial cooldown sweep
 *   - Dodge cooldown refilling dot
 *
 * Top-center (boss rooms only):
 *   - Wide boss HP bar (~60% width) with name, phase dots, damage ghost
 *
 * NOTE: UIScene camera does NOT get CRT shader — keep HUD crisp.
 */
export class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene', active: false });
    }

    create() {
        const W = this.game.config.width;   // 800
        const H = this.game.config.height;  // 600

        // ── Palette ─────────────────────────────────────────────────────
        this.PAL = {
            hp: 0xdd2222, hpEmpty: 0x441111, hpBorder: 0xffffff,
            mp: 0x2255dd, mpEmpty: 0x111144, mpBorder: 0xffffff,
            bossHp: 0xcc2222, bossGhost: 0xffffff, bossBg: 0x331111,
        };

        // ── Cached values — only redraw when changed ────────────────────
        this._cache = {
            hp: -1, maxHp: -1, mana: -1, maxMana: -1,
            hpPotions: -1, mpPotions: -1,
            gold: -1, floor: -1, kills: -1,
            specialCd: -1, dodgeCd: -1,
            bossHp: -1, bossMaxHp: -1, bossPhase: -1,
        };

        // ── NO CRT shader on UIScene (keep HUD crisp) ──────────────────

        // ══════════════════════════════════════════════════════════════════
        //  TOP-LEFT CLUSTER
        // ══════════════════════════════════════════════════════════════════

        const TL_X = 12;
        const TL_Y = 12;

        // Segmented HP bar
        this.hpBarX = TL_X;
        this.hpBarY = TL_Y;
        this.barW = 160;
        this.barH = 16;
        this.segmentCount = 10; // number of segments

        this.hpBarGfx = this.add.graphics().setDepth(300);
        this.hpLabel = this.add.text(TL_X + this.barW + 8, TL_Y + 1, '', {
            fontFamily: 'monospace', fontSize: '12px',
            color: '#ff5555', stroke: '#000', strokeThickness: 2
        }).setDepth(300);

        // Segmented Mana bar
        this.mpBarX = TL_X;
        this.mpBarY = TL_Y + 22;
        this.mpBarGfx = this.add.graphics().setDepth(300);
        this.mpLabel = this.add.text(TL_X + this.barW + 8, TL_Y + 23, '', {
            fontFamily: 'monospace', fontSize: '12px',
            color: '#5588ff', stroke: '#000', strokeThickness: 2
        }).setDepth(300);

        // Status effect icons row (below mana)
        this._statusPool = [];
        this._statusPoolSize = 8;
        for (let i = 0; i < this._statusPoolSize; i++) {
            const lbl = this.add.text(0, 0, '', {
                fontFamily: 'monospace', fontSize: '9px',
                color: '#ffffff', stroke: '#000', strokeThickness: 2,
                backgroundColor: '#000000aa', padding: { x: 3, y: 1 }
            }).setDepth(300).setVisible(false);
            this._statusPool.push(lbl);
        }
        this._statusX = TL_X;
        this._statusY = TL_Y + 46;
        this._lastStatusKey = '';

        // ══════════════════════════════════════════════════════════════════
        //  TOP-RIGHT — Floor indicator + Minimap
        // ══════════════════════════════════════════════════════════════════

        this.minimapSize = 110;
        this.minimapPad = 10;
        const mmX = W - this.minimapSize - this.minimapPad;
        const mmY = this.minimapPad + 16; // room for floor text above
        this.mmX = mmX;
        this.mmY = mmY;

        // Floor indicator above minimap
        this.floorText = this.add.text(mmX + this.minimapSize / 2, mmY - 14, '', {
            fontFamily: 'monospace', fontSize: '10px',
            color: '#ccaa44', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5, 0).setDepth(300);

        // Minimap border with biome-themed pixel art frame
        this.minimapBorder = this.add.graphics().setDepth(299);
        this._drawMinimapFrame(mmX, mmY);

        // Minimap graphics
        this._mmGfx = this.add.graphics().setDepth(300);
        this.minimapDot = this.add.graphics().setDepth(301);
        this._minimapDirty = true;
        this._mmUpdateTimer = 0;

        // ══════════════════════════════════════════════════════════════════
        //  BOTTOM-LEFT — Potions + Gold
        // ══════════════════════════════════════════════════════════════════

        const BL_X = 12;
        const BL_Y = H - 50;

        // HP Potion slot
        this.hpPotGfx = this.add.graphics().setDepth(299);
        this._drawPotionSlot(this.hpPotGfx, BL_X, BL_Y, 0xdd3333);
        this.hpPotLabel = this.add.text(BL_X + 16, BL_Y + 2, '0', {
            fontFamily: 'monospace', fontSize: '12px',
            color: '#ff7777', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(300);
        this.add.text(BL_X + 16, BL_Y + 16, 'Q', {
            fontFamily: 'monospace', fontSize: '8px',
            color: '#888888', stroke: '#000', strokeThickness: 1
        }).setOrigin(0.5).setDepth(300);

        // MP Potion slot
        this.mpPotGfx = this.add.graphics().setDepth(299);
        this._drawPotionSlot(this.mpPotGfx, BL_X + 40, BL_Y, 0x3355dd);
        this.mpPotLabel = this.add.text(BL_X + 56, BL_Y + 2, '0', {
            fontFamily: 'monospace', fontSize: '12px',
            color: '#7799ff', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(300);
        this.add.text(BL_X + 56, BL_Y + 16, 'R', {
            fontFamily: 'monospace', fontSize: '8px',
            color: '#888888', stroke: '#000', strokeThickness: 1
        }).setOrigin(0.5).setDepth(300);

        // Gold counter
        this.goldText = this.add.text(BL_X + 95, BL_Y + 2, '0', {
            fontFamily: 'monospace', fontSize: '12px',
            color: '#ffcc00', stroke: '#000', strokeThickness: 2
        }).setDepth(300);
        // Coin icon (small circle)
        const coinGfx = this.add.graphics().setDepth(300);
        coinGfx.fillStyle(0xffcc00, 1);
        coinGfx.fillCircle(BL_X + 86, BL_Y + 8, 5);
        coinGfx.lineStyle(1, 0xaa8800, 1);
        coinGfx.strokeCircle(BL_X + 86, BL_Y + 8, 5);

        // Kill counter
        this.killsText = this.add.text(BL_X + 95, BL_Y + 18, '', {
            fontFamily: 'monospace', fontSize: '9px',
            color: '#aaaaaa', stroke: '#000', strokeThickness: 2
        }).setDepth(300);

        // ══════════════════════════════════════════════════════════════════
        //  BOTTOM-RIGHT — Special ability + Dodge cooldown
        // ══════════════════════════════════════════════════════════════════

        const BR_X = W - 60;
        const BR_Y = H - 60;

        // Special ability icon with radial cooldown sweep
        this.specialGfx = this.add.graphics().setDepth(300);
        this.specialX = BR_X;
        this.specialY = BR_Y;
        this.specialRadius = 22;

        this.add.text(BR_X, BR_Y + this.specialRadius + 6, 'E', {
            fontFamily: 'monospace', fontSize: '10px',
            color: '#888888', stroke: '#000', strokeThickness: 1
        }).setOrigin(0.5).setDepth(300);

        // Dodge cooldown dot
        this.dodgeGfx = this.add.graphics().setDepth(300);
        this.dodgeX = BR_X + 40;
        this.dodgeY = BR_Y + 6;
        this.dodgeRadius = 8;

        this.add.text(this.dodgeX, this.dodgeY + this.dodgeRadius + 6, 'SPC', {
            fontFamily: 'monospace', fontSize: '7px',
            color: '#666666', stroke: '#000', strokeThickness: 1
        }).setOrigin(0.5).setDepth(300);

        // ══════════════════════════════════════════════════════════════════
        //  TOP-CENTER — Boss HP bar (hidden until boss room)
        // ══════════════════════════════════════════════════════════════════

        this.bossBarVisible = false;
        this.bossBarGfx = this.add.graphics().setDepth(300).setVisible(false);
        this.bossGhostGfx = this.add.graphics().setDepth(299).setVisible(false);
        this.bossBarW = Math.floor(W * 0.6);
        this.bossBarH = 14;
        this.bossBarX = Math.floor((W - this.bossBarW) / 2);
        this.bossBarY = 10;
        this._bossGhostFrac = 1;

        this.bossNameText = this.add.text(W / 2, this.bossBarY - 2, '', {
            fontFamily: 'monospace', fontSize: '11px',
            color: '#ff6644', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5, 1).setDepth(301).setVisible(false);

        // Phase dots (3 small circles)
        this.bossPhaseDots = [];
        for (let i = 0; i < 3; i++) {
            const dot = this.add.graphics().setDepth(301).setVisible(false);
            this.bossPhaseDots.push(dot);
        }

        // ── FPS counter (small, top-left corner) ───────────────────────
        this.fpsText = this.add.text(W - 55, H - 14, 'FPS: --', {
            fontFamily: 'monospace', fontSize: '9px',
            color: '#00ff88', stroke: '#000', strokeThickness: 2
        }).setDepth(300);

        // ── Dual Weapon Display (above potions) ─────────────────────────
        const weaponY = BL_Y - 36;
        this.weapon1Text = this.add.text(BL_X, weaponY, '[1] —', {
            fontFamily: 'monospace', fontSize: '9px',
            color: '#ffffff', stroke: '#000', strokeThickness: 2
        }).setDepth(300);
        this.weapon2Text = this.add.text(BL_X + 130, weaponY, '[2] —', {
            fontFamily: 'monospace', fontSize: '9px',
            color: '#888888', stroke: '#000', strokeThickness: 2
        }).setDepth(300);

        // XP bars (small block bars under weapon names)
        this.weaponXPGfx = this.add.graphics().setDepth(300);
        this._weaponXPBarY = weaponY + 14;

        // Armor + accessory line
        this.gearText = this.add.text(BL_X, BL_Y - 16, '', {
            fontFamily: 'monospace', fontSize: '8px',
            color: '#cccccc', stroke: '#000', strokeThickness: 2
        }).setDepth(300);

        // Level-up notification (centered, hidden by default)
        this._weaponLevelUpText = this.add.text(W / 2, H / 2 - 40, '', {
            fontFamily: 'monospace', fontSize: '16px',
            color: '#ffcc00', stroke: '#000', strokeThickness: 3,
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(400).setVisible(false);

        this._weaponPerkText = this.add.text(W / 2, H / 2 - 18, '', {
            fontFamily: 'monospace', fontSize: '11px',
            color: '#88ff88', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(400).setVisible(false);

        // ── EventBus ─────────────────────────────────────────────────────
        EventBus.on(Events.GOLD_CHANGED, this._onGoldChanged, this);
        EventBus.on(Events.GEAR_EQUIPPED, this._onGearEquipped, this);
        EventBus.on(Events.POTION_PICKED_UP, this._onPotionPickedUp, this);
        EventBus.on(Events.WEAPON_SWAPPED, this._onWeaponSwapped, this);
        EventBus.on(Events.WEAPON_LEVELED_UP, this._onWeaponLeveledUp, this);
        EventBus.on(Events.WEAPON_PERK_UNLOCKED, this._onWeaponPerkUnlocked, this);

        this._fullRedraw();
    }

    // ── Per-frame update ──────────────────────────────────────────────────────
    update(time, delta) {
        this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);

        const gameScene = this.scene.get('GameScene');
        const player = gameScene?.player;
        if (!player) return;

        const c = this._cache;

        // Segmented HP bar
        if (player.hp !== c.hp || player.maxHp !== c.maxHp) {
            c.hp = player.hp; c.maxHp = player.maxHp;
            this._drawSegmentedBar(
                this.hpBarGfx, this.hpBarX, this.hpBarY,
                player.hp / player.maxHp, this.PAL.hp, this.PAL.hpEmpty, this.PAL.hpBorder
            );
            this.hpLabel.setText(`${player.hp}/${player.maxHp}`);

            // Low health warning
            const hpFrac = player.hp / player.maxHp;
            if (hpFrac <= 0.25 && !this._lowHpWarning) {
                this._lowHpWarning = true;
                this._startLowHpPulse();
            } else if (hpFrac > 0.25 && this._lowHpWarning) {
                this._lowHpWarning = false;
                this._stopLowHpPulse();
            }
        }

        // Segmented MP bar
        const mana = Math.floor(player.mana);
        if (mana !== c.mana || player.maxMana !== c.maxMana) {
            c.mana = mana; c.maxMana = player.maxMana;
            this._drawSegmentedBar(
                this.mpBarGfx, this.mpBarX, this.mpBarY,
                player.mana / player.maxMana, this.PAL.mp, this.PAL.mpEmpty, this.PAL.mpBorder
            );
            this.mpLabel.setText(`${mana}/${player.maxMana}`);
        }

        // Potion counts
        if (player.hpPotions !== c.hpPotions) {
            c.hpPotions = player.hpPotions;
            this.hpPotLabel.setText(`${player.hpPotions}`);
        }
        if (player.mpPotions !== c.mpPotions) {
            c.mpPotions = player.mpPotions;
            this.mpPotLabel.setText(`${player.mpPotions}`);
        }

        // Gold
        const gold = player.gold || 0;
        if (gold !== c.gold) {
            c.gold = gold;
            this.goldText.setText(`${gold}g`);
        }

        // Floor
        const floor = gameScene.currentFloor;
        if (floor !== c.floor) {
            c.floor = floor;
            const biome = gameScene.dungeonManager?.getBiome();
            this.floorText.setText(`FLOOR ${floor}${biome ? ' — ' + biome.name : ''}`);
            this._minimapDirty = true;
        }

        // Kills
        const kills = player.killCount || 0;
        if (kills !== c.kills) {
            c.kills = kills;
            this.killsText.setText(`${kills} kills`);
        }

        // Special ability cooldown (radial sweep)
        this._updateSpecialCooldown(player);

        // Dodge cooldown dot
        this._updateDodgeCooldown(player);

        // Boss health bar
        this._updateBossBar(gameScene);

        // Status effects
        this._updateStatusStrip(gameScene, player);

        // Weapon XP bars (lightweight redraw)
        this._drawWeaponXPBars(player);

        // Minimap (every 250ms or on floor change)
        this._mmUpdateTimer += delta;
        if (this._minimapDirty || this._mmUpdateTimer > 250) {
            this._mmUpdateTimer = 0;
            this._minimapDirty = false;
            this._redrawMinimap(gameScene);
        }

        this._updateMinimapDot(gameScene, player);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  DRAWING HELPERS
    // ══════════════════════════════════════════════════════════════════════════

    _drawSegmentedBar(gfx, x, y, frac, fillColor, emptyColor, borderColor) {
        frac = Phaser.Math.Clamp(frac, 0, 1);
        gfx.clear();

        const segW = Math.floor(this.barW / this.segmentCount);
        const segH = this.barH;
        const gap = 2;
        const filledSegments = Math.ceil(frac * this.segmentCount);

        // Dark background behind all segments
        gfx.fillStyle(0x000000, 0.6);
        gfx.fillRect(x - 1, y - 1, this.barW + 2, segH + 2);

        for (let i = 0; i < this.segmentCount; i++) {
            const sx = x + i * segW;
            const innerW = segW - gap;

            if (i < filledSegments) {
                // Filled segment
                gfx.fillStyle(fillColor, 1);
                gfx.fillRect(sx, y, innerW, segH);
                // Highlight top half
                gfx.fillStyle(0xffffff, 0.15);
                gfx.fillRect(sx, y, innerW, Math.floor(segH / 2));
            } else {
                // Empty segment
                gfx.fillStyle(emptyColor, 0.8);
                gfx.fillRect(sx, y, innerW, segH);
            }

            // Border around each segment
            gfx.lineStyle(1, borderColor, 0.4);
            gfx.strokeRect(sx, y, innerW, segH);
        }
    }

    _drawPotionSlot(gfx, x, y, color) {
        gfx.fillStyle(0x111122, 0.9);
        gfx.fillRect(x, y - 6, 32, 32);
        gfx.lineStyle(1, color, 0.6);
        gfx.strokeRect(x, y - 6, 32, 32);
    }

    _drawMinimapFrame(x, y) {
        this.minimapBorder.clear();
        // Outer frame
        this.minimapBorder.fillStyle(0x10101e, 1);
        this.minimapBorder.fillRect(x - 3, y - 3, this.minimapSize + 6, this.minimapSize + 6);
        // Pixel art style double border
        this.minimapBorder.lineStyle(2, 0x445566, 1);
        this.minimapBorder.strokeRect(x - 3, y - 3, this.minimapSize + 6, this.minimapSize + 6);
        this.minimapBorder.lineStyle(1, 0x667788, 0.5);
        this.minimapBorder.strokeRect(x - 1, y - 1, this.minimapSize + 2, this.minimapSize + 2);
    }

    _updateSpecialCooldown(player) {
        this.specialGfx.clear();
        const x = this.specialX;
        const y = this.specialY;
        const r = this.specialRadius;

        // Background circle
        this.specialGfx.fillStyle(0x111133, 0.9);
        this.specialGfx.fillCircle(x, y, r);

        // Determine cooldown fraction
        let cdFrac = 0;
        if (player.specialCooldownTimer > 0 && player.specialCooldownDuration > 0) {
            cdFrac = player.specialCooldownTimer / player.specialCooldownDuration;
        }

        // Has enough mana?
        const hasEnoughMana = player.mana >= (player.specialManaCost || 0);
        const isReady = cdFrac <= 0 && hasEnoughMana;

        if (cdFrac > 0) {
            // Radial cooldown sweep (pie-chart style)
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + (1 - cdFrac) * Math.PI * 2;
            this.specialGfx.fillStyle(0x6644aa, 0.8);
            this.specialGfx.slice(x, y, r - 2, startAngle, endAngle, false);
            this.specialGfx.fillPath();
        } else if (isReady) {
            // Ability ready — filled
            this.specialGfx.fillStyle(0x8866cc, 1);
            this.specialGfx.fillCircle(x, y, r - 2);
        } else {
            // Not enough mana — dim
            this.specialGfx.fillStyle(0x332255, 0.6);
            this.specialGfx.fillCircle(x, y, r - 2);
        }

        // Border
        this.specialGfx.lineStyle(2, isReady ? 0xcc88ff : 0x444466, 1);
        this.specialGfx.strokeCircle(x, y, r);

        // Pulse when ready
        if (isReady && !this._specialReadyPulse) {
            this._specialReadyPulse = true;
            this._doSpecialPulse();
        } else if (!isReady) {
            this._specialReadyPulse = false;
        }
    }

    _doSpecialPulse() {
        // One-shot bright flash
        const flash = this.add.graphics().setDepth(302);
        flash.fillStyle(0xcc88ff, 0.5);
        flash.fillCircle(this.specialX, this.specialY, this.specialRadius + 4);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 400,
            onComplete: () => flash.destroy()
        });
    }

    _updateDodgeCooldown(player) {
        this.dodgeGfx.clear();
        const x = this.dodgeX;
        const y = this.dodgeY;
        const r = this.dodgeRadius;

        // Determine dodge readiness
        let cdFrac = 0;
        if (player.dodgeCooldownTimer > 0 && player.dodgeCooldownDuration > 0) {
            cdFrac = player.dodgeCooldownTimer / player.dodgeCooldownDuration;
        }

        // Background
        this.dodgeGfx.fillStyle(0x111122, 0.8);
        this.dodgeGfx.fillCircle(x, y, r);

        if (cdFrac > 0) {
            // Refilling arc
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + (1 - cdFrac) * Math.PI * 2;
            this.dodgeGfx.fillStyle(0x44aaff, 0.7);
            this.dodgeGfx.slice(x, y, r - 1, startAngle, endAngle, false);
            this.dodgeGfx.fillPath();
        } else {
            // Ready — bright
            this.dodgeGfx.fillStyle(0x66ccff, 1);
            this.dodgeGfx.fillCircle(x, y, r - 1);
        }

        // Border
        this.dodgeGfx.lineStyle(1, cdFrac > 0 ? 0x334466 : 0x88ccff, 1);
        this.dodgeGfx.strokeCircle(x, y, r);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  BOSS HEALTH BAR
    // ══════════════════════════════════════════════════════════════════════════

    showBossBar(bossName, maxHp) {
        this.bossBarVisible = true;
        this.bossBarGfx.setVisible(true);
        this.bossGhostGfx.setVisible(true);
        this.bossNameText.setText(bossName).setVisible(true);
        this._bossGhostFrac = 1;
        this._cache.bossHp = -1;
        for (const dot of this.bossPhaseDots) dot.setVisible(true);
    }

    hideBossBar() {
        this.bossBarVisible = false;
        this.bossBarGfx.setVisible(false);
        this.bossGhostGfx.setVisible(false);
        this.bossNameText.setVisible(false);
        for (const dot of this.bossPhaseDots) dot.setVisible(false);
    }

    _updateBossBar(gameScene) {
        if (!this.bossBarVisible) return;

        // Find active boss in enemies group
        const boss = gameScene?.currentBoss;
        if (!boss || !boss.active) {
            this.hideBossBar();
            return;
        }

        const hp = boss.hp;
        const maxHp = boss.maxHp;
        const phase = boss.currentPhase || 1;

        if (hp === this._cache.bossHp && phase === this._cache.bossPhase) return;

        const hpFrac = Phaser.Math.Clamp(hp / maxHp, 0, 1);
        const prevFrac = this._cache.bossHp >= 0
            ? Phaser.Math.Clamp(this._cache.bossHp / maxHp, 0, 1) : hpFrac;

        this._cache.bossHp = hp;
        this._cache.bossMaxHp = maxHp;
        this._cache.bossPhase = phase;

        const bx = this.bossBarX;
        const by = this.bossBarY;
        const bw = this.bossBarW;
        const bh = this.bossBarH;

        // Ghost bar (trailing white that catches up)
        if (hpFrac < this._bossGhostFrac) {
            // Lerp ghost toward actual
            this._bossGhostFrac = Phaser.Math.Linear(this._bossGhostFrac, hpFrac, 0.08);
            if (this._bossGhostFrac - hpFrac < 0.005) this._bossGhostFrac = hpFrac;
        } else {
            this._bossGhostFrac = hpFrac;
        }

        // Draw ghost bar
        this.bossGhostGfx.clear();
        this.bossGhostGfx.fillStyle(this.PAL.bossBg, 0.9);
        this.bossGhostGfx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
        if (this._bossGhostFrac > 0) {
            this.bossGhostGfx.fillStyle(this.PAL.bossGhost, 0.4);
            this.bossGhostGfx.fillRect(bx, by, Math.round(bw * this._bossGhostFrac), bh);
        }

        // Draw actual HP bar
        this.bossBarGfx.clear();
        if (hpFrac > 0) {
            this.bossBarGfx.fillStyle(this.PAL.bossHp, 1);
            this.bossBarGfx.fillRect(bx, by, Math.round(bw * hpFrac), bh);
        }

        // Border
        this.bossBarGfx.lineStyle(1, 0x886644, 1);
        this.bossBarGfx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);

        // Phase dots
        const dotY = by + bh + 6;
        const dotSpacing = 14;
        const dotStartX = (this.game.config.width / 2) - dotSpacing;
        for (let i = 0; i < 3; i++) {
            const dot = this.bossPhaseDots[i];
            dot.clear();
            const dx = dotStartX + i * dotSpacing;
            if (i < phase) {
                dot.fillStyle(0xff6644, 1);
            } else {
                dot.fillStyle(0x444444, 1);
            }
            dot.fillCircle(dx, dotY, 4);
            dot.lineStyle(1, 0x666666, 1);
            dot.strokeCircle(dx, dotY, 4);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  STATUS EFFECTS
    // ══════════════════════════════════════════════════════════════════════════

    _updateStatusStrip(gameScene, player) {
        const se = gameScene?.statusEffects;
        if (!se) {
            for (let i = 0; i < this._statusPoolSize; i++) {
                this._statusPool[i].setVisible(false);
            }
            return;
        }

        const active = se.getActive(player);

        // Build cache key
        let cacheKey = '';
        for (const effectId of active) {
            const progress = se.getProgress(player, effectId);
            const def = StatusEffectData[effectId];
            if (!def) continue;
            cacheKey += effectId + Math.ceil(progress * def.duration / 1000) + ',';
        }

        if (cacheKey === this._lastStatusKey) return;
        this._lastStatusKey = cacheKey;

        let sx = this._statusX;
        const sy = this._statusY;
        let idx = 0;

        for (const effectId of active) {
            if (idx >= this._statusPoolSize) break;
            const def = StatusEffectData[effectId];
            if (!def) continue;

            const progress = se.getProgress(player, effectId);
            const colorHex = '#' + def.color.toString(16).padStart(6, '0');
            const text = `${def.icon} ${Math.ceil(progress * def.duration / 1000)}s`;

            const lbl = this._statusPool[idx];
            lbl.setText(text);
            lbl.setColor(colorHex);
            lbl.setPosition(sx, sy);
            lbl.setVisible(true);
            sx += lbl.width + 4;
            idx++;
        }

        for (let i = idx; i < this._statusPoolSize; i++) {
            this._statusPool[i].setVisible(false);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  MINIMAP
    // ══════════════════════════════════════════════════════════════════════════

    _redrawMinimap(gameScene) {
        const fog = gameScene?.fogOfWar;
        if (!fog) return;

        const mmSize = this.minimapSize;
        const gw = fog.gridWidth;
        const gh = fog.gridHeight;
        const tileW = mmSize / gw;
        const tileH = mmSize / gh;

        const gfx = this._mmGfx;
        gfx.clear();

        const ox = this.mmX;
        const oy = this.mmY;

        // Dark background
        gfx.fillStyle(0x111122, 1);
        gfx.fillRect(ox, oy, mmSize, mmSize);

        const grid = fog.dungeonGrid;
        const fogGrid = fog.fogGrid;

        for (let y = 0; y < gh; y++) {
            for (let x = 0; x < gw; x++) {
                if (fogGrid[y * gw + x] !== 1) continue;

                const tile = grid[y][x];
                let color;
                if (tile === 1 || tile === 3) color = 0x666688;       // floor/corridor
                else if (tile === 2) color = 0x333344;                 // wall
                else if (tile === 5) color = 0xffcc00;                 // stairs
                else if (tile === 6) color = 0xcc2233;                 // spawner
                else continue;

                const px = ox + Math.floor(x * tileW);
                const py = oy + Math.floor(y * tileH);
                const pw = Math.max(1, Math.ceil(tileW));
                const ph = Math.max(1, Math.ceil(tileH));

                gfx.fillStyle(color, 1);
                gfx.fillRect(px, py, pw, ph);
            }
        }

        // Room-type icons overlay
        this._drawMinimapIcons(gameScene, gfx, ox, oy, tileW, tileH);
    }

    _drawMinimapIcons(gameScene, gfx, ox, oy, tileW, tileH) {
        // Draw special room indicators on minimap
        const floorData = gameScene?.floorData;
        if (!floorData) return;

        // Stairs icon (yellow diamond)
        if (floorData.stairsPosition) {
            const sx = ox + Math.floor(floorData.stairsPosition.x / 32 * tileW);
            const sy = oy + Math.floor(floorData.stairsPosition.y / 32 * tileH);
            gfx.fillStyle(0xffcc00, 1);
            gfx.fillRect(sx - 1, sy - 1, 3, 3);
        }
    }

    _updateMinimapDot(gameScene, player) {
        const fog = gameScene?.fogOfWar;
        if (!fog) return;

        const ts = 32;
        const tileX = (player.x / ts) | 0;
        const tileY = (player.y / ts) | 0;

        const dotX = this.mmX + tileX * (this.minimapSize / fog.gridWidth);
        const dotY = this.mmY + tileY * (this.minimapSize / fog.gridHeight);

        this.minimapDot.clear();
        // Player dot with glow
        this.minimapDot.fillStyle(0xffffff, 0.4);
        this.minimapDot.fillCircle(dotX, dotY, 4);
        this.minimapDot.fillStyle(0xffffff, 1);
        this.minimapDot.fillCircle(dotX, dotY, 2);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  INTERNAL
    // ══════════════════════════════════════════════════════════════════════════

    _fullRedraw() {
        this._cache.hp = -1; this._cache.mana = -1;
        this.update(0, 0);
    }

    // ── EventBus handlers ───────────────────────────────────────────────────

    _onGoldChanged({ gold }) {
        this.goldText?.setText(`${gold}g`);
    }

    _onGearEquipped({ item, slot }) {
        const player = this.scene.get('GameScene')?.player;
        if (player) this._refreshGearText(player);
    }

    _onPotionPickedUp({ type, count }) {
        if (type === 'health') this.hpPotLabel?.setText(`${count}`);
        if (type === 'mana') this.mpPotLabel?.setText(`${count}`);
    }

    _onWeaponSwapped() {
        const player = this.scene.get('GameScene')?.player;
        if (player) this._refreshGearText(player);
    }

    _onWeaponLeveledUp({ weapon, level }) {
        this._weaponLevelUpText.setText(`${weapon.name} reached Lv.${level}!`);
        this._weaponLevelUpText.setVisible(true).setAlpha(1);
        this.tweens.killTweensOf(this._weaponLevelUpText);
        this.tweens.add({
            targets: this._weaponLevelUpText,
            alpha: 0, y: this._weaponLevelUpText.y - 20,
            delay: 1200, duration: 500,
            onComplete: () => {
                this._weaponLevelUpText.setVisible(false);
                this._weaponLevelUpText.y += 20;
            }
        });
        // Refresh weapon display
        const player = this.scene.get('GameScene')?.player;
        if (player) this._refreshGearText(player);
    }

    _onWeaponPerkUnlocked({ weapon, perk }) {
        this._weaponPerkText.setText(`${perk.name} unlocked! (${perk.desc})`);
        this._weaponPerkText.setVisible(true).setAlpha(1);
        this.tweens.killTweensOf(this._weaponPerkText);
        this.tweens.add({
            targets: this._weaponPerkText,
            alpha: 0,
            delay: 1800, duration: 500,
            onComplete: () => this._weaponPerkText.setVisible(false)
        });
    }

    _refreshGearText(player) {
        if (!player) return;

        // Dual weapon display
        const w0 = player.weapons[0];
        const w1 = player.weapons[1];
        const active = player.activeWeaponIndex;

        const fmt = (w, idx) => {
            if (!w) return `[${idx + 1}] —`;
            return `[${idx + 1}] ${w.name} Lv.${w.level || 1}`;
        };

        this.weapon1Text?.setText(fmt(w0, 0));
        this.weapon2Text?.setText(fmt(w1, 1));

        // Highlight active weapon
        const activeColor = '#ffffff';
        const inactiveColor = '#666666';
        this.weapon1Text?.setColor(active === 0 ? activeColor : inactiveColor);
        this.weapon2Text?.setColor(active === 1 ? activeColor : inactiveColor);

        // Weapon XP bars
        this._drawWeaponXPBars(player);

        // Armor + accessory
        const g = player.gear || {};
        const a = g.armor ? `${g.armor.name}` : '—';
        const r = g.accessory ? `${g.accessory.name}` : '—';
        this.gearText?.setText(`🛡${a}  💍${r}`);
    }

    _drawWeaponXPBars(player) {
        const gfx = this.weaponXPGfx;
        if (!gfx) return;
        gfx.clear();

        const BL_X = 12;
        const y = this._weaponXPBarY;
        const barW = 60;
        const barH = 3;

        for (let i = 0; i < 2; i++) {
            const weapon = player.weapons[i];
            const x = BL_X + i * 130;

            if (!weapon) continue;

            const maxLevel = weapon.maxLevel || 5;
            const isMaxed = weapon.level >= maxLevel;
            const xpThreshold = weapon.xpCurve?.[weapon.level] ?? 50 * weapon.level;
            const frac = isMaxed ? 1 : Phaser.Math.Clamp(weapon.xp / xpThreshold, 0, 1);

            // Background
            gfx.fillStyle(0x222233, 0.8);
            gfx.fillRect(x, y, barW, barH);

            // Fill
            const color = isMaxed ? 0xffcc00 : (RARITY_COLORS[weapon.rarity] || 0x44cc44);
            gfx.fillStyle(color, 1);
            gfx.fillRect(x, y, Math.round(barW * frac), barH);
        }
    }

    // ── Low HP Warning ──────────────────────────────────────────────────────

    _startLowHpPulse() {
        if (!this._lowHpOverlay) {
            const W = this.game.config.width;
            const H = this.game.config.height;
            this._lowHpOverlay = this.add.graphics().setDepth(200);
            this._lowHpOverlay.fillStyle(0xff0000, 0.15);
            this._lowHpOverlay.fillRect(0, 0, W, 20);
            this._lowHpOverlay.fillRect(0, H - 20, W, 20);
            this._lowHpOverlay.fillRect(0, 0, 20, H);
            this._lowHpOverlay.fillRect(W - 20, 0, 20, H);
        }

        this._lowHpOverlay.setVisible(true);

        if (this._lowHpTween) this._lowHpTween.destroy();
        this._lowHpTween = this.tweens.add({
            targets: this._lowHpOverlay,
            alpha: 0.3,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.tweens.add({
            targets: this.hpLabel,
            scaleX: 1.1, scaleY: 1.1,
            duration: 300,
            yoyo: true,
            repeat: -1
        });
    }

    _stopLowHpPulse() {
        if (this._lowHpOverlay) this._lowHpOverlay.setVisible(false);
        if (this._lowHpTween) {
            this._lowHpTween.destroy();
            this._lowHpTween = null;
        }
        this.tweens.killTweensOf(this.hpLabel);
        this.hpLabel.setScale(1);
    }

    // ── Cleanup ─────────────────────────────────────────────────────────────

    shutdown() {
        EventBus.off(Events.GOLD_CHANGED, this._onGoldChanged, this);
        EventBus.off(Events.GEAR_EQUIPPED, this._onGearEquipped, this);
        EventBus.off(Events.POTION_PICKED_UP, this._onPotionPickedUp, this);
        EventBus.off(Events.WEAPON_SWAPPED, this._onWeaponSwapped, this);
        EventBus.off(Events.WEAPON_LEVELED_UP, this._onWeaponLeveledUp, this);
        EventBus.off(Events.WEAPON_PERK_UNLOCKED, this._onWeaponPerkUnlocked, this);
        for (const lbl of this._statusPool) {
            if (lbl.active) lbl.destroy();
        }
        this._mmGfx?.destroy();
        this.minimapDot?.destroy();
        this._stopLowHpPulse();
        if (this._lowHpOverlay) this._lowHpOverlay.destroy();
    }
}
