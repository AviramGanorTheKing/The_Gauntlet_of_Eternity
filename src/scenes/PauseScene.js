/**
 * PauseScene — tabbed pause menu overlay.
 *
 * 5 tabs: INVENTORY | MAP | CODEX | STATS | SETTINGS
 * - Opens with scale-up bounce tween (200ms), closes with scale-down (150ms)
 * - INVENTORY: paper-doll equipment display
 * - MAP: full-size minimap with all explored rooms + icons
 * - CODEX: 25 lore scroll discovery grid (5 per biome), hover for details
 * - STATS: current run stats + character stats with gear bonuses in green
 * - SETTINGS: CRT intensity slider (live preview), volume sliders, font size
 */

import { applyCRTShader } from '../shaders/CRTShader.js';
import { ClassData } from '../config/ClassData.js';
import { RARITY_COLORS } from '../utils/Constants.js';
import { LoreData } from '../config/LoreData.js';

const TAB_KEYS = ['INVENTORY', 'MAP', 'CODEX', 'STATS', 'SETTINGS'];

export class PauseScene extends Phaser.Scene {
    constructor() {
        super('PauseScene');
    }

    init(data) {
        this.playerData = data?.player || {};
        this.floorNumber = data?.floor || 1;
        this.biomeName = data?.biome || 'crypt';
        this.runTime = data?.runTime || 0;
        this.companions = data?.companions || [];
        this.loreScrolls = data?.loreScrolls || [];
        this.discoveredLore = new Set(data?.discoveredLore || []);
        this.mapData = data?.mapData || {};
    }

    create() {
        const W = this.game.config.width;
        const H = this.game.config.height;

        // Semi-transparent dark overlay (70% black)
        this._overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setDepth(0);

        // Central panel
        this._panelW = 600;
        this._panelH = 420;
        this._panelX = (W - this._panelW) / 2;
        this._panelY = (H - this._panelH) / 2 + 10;

        // Panel container (for scale animation)
        this._panelContainer = this.add.container(W / 2, H / 2).setDepth(1);

        // Panel background
        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x111122, 0.95);
        panelBg.fillRoundedRect(-this._panelW / 2, -this._panelH / 2, this._panelW, this._panelH, 10);
        panelBg.lineStyle(2, 0x445588, 1);
        panelBg.strokeRoundedRect(-this._panelW / 2, -this._panelH / 2, this._panelW, this._panelH, 10);
        this._panelContainer.add(panelBg);

        // Title
        const title = this.add.text(0, -this._panelH / 2 + 15, 'PAUSED', {
            fontFamily: 'monospace', fontSize: '18px',
            color: '#ffdd00', stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5);
        this._panelContainer.add(title);

        // ── Tab buttons ──────────────────────────────────────────────────
        this._activeTab = 'INVENTORY';
        this._tabButtons = [];
        this._tabContents = {};

        const tabY = -this._panelH / 2 + 42;
        const tabW = 100;
        const tabStartX = -this._panelW / 2 + 20;

        TAB_KEYS.forEach((tabKey, i) => {
            const tx = tabStartX + i * (tabW + 10);
            const btn = this.add.text(tx + tabW / 2, tabY, tabKey, {
                fontFamily: 'monospace', fontSize: '11px',
                color: '#888888', stroke: '#000', strokeThickness: 2,
                backgroundColor: '#1a1a2e', padding: { x: 8, y: 4 }
            }).setOrigin(0.5).setInteractive();

            btn.on('pointerdown', () => this._switchTab(tabKey));
            btn.on('pointerover', () => { if (tabKey !== this._activeTab) btn.setColor('#bbbbbb'); });
            btn.on('pointerout', () => { if (tabKey !== this._activeTab) btn.setColor('#888888'); });

            this._panelContainer.add(btn);
            this._tabButtons.push({ key: tabKey, btn });
        });

        // ── ESC / TAB handlers (register FIRST so they always work) ──────
        this.input.keyboard.on('keydown-ESC', () => this._resume());
        this.input.keyboard.on('keydown-TAB', () => {
            const idx = TAB_KEYS.indexOf(this._activeTab);
            const next = TAB_KEYS[(idx + 1) % TAB_KEYS.length];
            this._switchTab(next);
        });

        // ── Bottom buttons ───────────────────────────────────────────────
        const btnY = this._panelH / 2 - 22;

        const resumeBtn = this.add.text(-100, btnY, '[ RESUME ]', {
            fontFamily: 'monospace', fontSize: '13px',
            color: '#44ff44', stroke: '#000', strokeThickness: 2,
            backgroundColor: '#113311', padding: { x: 10, y: 5 },
        }).setOrigin(0.5).setInteractive();
        resumeBtn.on('pointerover', () => resumeBtn.setColor('#66ff66'));
        resumeBtn.on('pointerout', () => resumeBtn.setColor('#44ff44'));
        resumeBtn.on('pointerdown', () => this._resume());
        this._panelContainer.add(resumeBtn);

        const quitBtn = this.add.text(100, btnY, '[ QUIT TO MENU ]', {
            fontFamily: 'monospace', fontSize: '13px',
            color: '#ff6644', stroke: '#000', strokeThickness: 2,
            backgroundColor: '#331111', padding: { x: 10, y: 5 },
        }).setOrigin(0.5).setInteractive();
        quitBtn.on('pointerover', () => quitBtn.setColor('#ff8866'));
        quitBtn.on('pointerout', () => quitBtn.setColor('#ff6644'));
        quitBtn.on('pointerdown', () => this._quitToMenu());
        this._panelContainer.add(quitBtn);

        // ── Open animation (scale bounce) ────────────────────────────────
        this._panelContainer.setScale(0.3).setAlpha(0);
        this.tweens.add({
            targets: this._panelContainer,
            scaleX: 1, scaleY: 1, alpha: 1,
            duration: 200,
            ease: 'Back.easeOut'
        });

        // ── Content area ─────────────────────────────────────────────────
        const contentY = tabY + 25;
        const contentH = this._panelH - 100;

        // Build each tab independently so one failure doesn't block the rest
        const builders = [
            ['INVENTORY', () => this._buildInventoryTab(contentY, contentH)],
            ['MAP',       () => this._buildMapTab(contentY, contentH)],
            ['CODEX',     () => this._buildCodexTab(contentY, contentH)],
            ['STATS',     () => this._buildStatsTab(contentY, contentH)],
            ['SETTINGS',  () => this._buildSettingsTab(contentY, contentH)],
        ];
        for (const [name, build] of builders) {
            try { build(); } catch (e) { console.error(`PauseScene ${name} tab error:`, e); }
        }

        // Bring tab buttons to top of container so content doesn't block clicks
        for (const { btn } of this._tabButtons) {
            this._panelContainer.bringToTop(btn);
        }

        // Show initial tab
        this._switchTab('INVENTORY');
    }

    _switchTab(tabKey) {
        this._activeTab = tabKey;

        // Update button colors
        for (const { key, btn } of this._tabButtons) {
            if (key === tabKey) {
                btn.setColor('#ffdd00');
                btn.setStyle({ backgroundColor: '#333355' });
            } else {
                btn.setColor('#888888');
                btn.setStyle({ backgroundColor: '#1a1a2e' });
            }
        }

        // Show/hide content
        for (const key of TAB_KEYS) {
            const content = this._tabContents[key];
            if (content) {
                for (const item of content) {
                    item.setVisible(key === tabKey);
                }
            }
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  INVENTORY TAB — Paper-doll equipment
    // ══════════════════════════════════════════════════════════════════════════

    _buildInventoryTab(contentY, contentH) {
        const items = [];
        const gear = this.playerData.gear || {};
        const slots = ['weapon', 'armor', 'accessory'];
        const slotLabels = { weapon: 'WEAPON', armor: 'ARMOR', accessory: 'ACCESSORY' };
        const slotIcons = { weapon: '⚔', armor: '🛡', accessory: '💍' };
        const pw = this._panelW;

        // Column layout
        const colX = -pw / 2 + 40;

        // Character silhouette area (left)
        const silhouette = this.add.graphics();
        silhouette.fillStyle(0x1a1a2e, 0.8);
        silhouette.fillRoundedRect(colX, contentY, 150, contentH - 30, 6);
        silhouette.lineStyle(1, 0x334466, 0.6);
        silhouette.strokeRoundedRect(colX, contentY, 150, contentH - 30, 6);
        this._panelContainer.add(silhouette);
        items.push(silhouette);

        const classData = ClassData[this.playerData.classKey] || {};
        const classLabel = this.add.text(colX + 75, contentY + 15, classData.name || 'Unknown', {
            fontFamily: 'monospace', fontSize: '12px',
            color: '#ffaa44', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5);
        this._panelContainer.add(classLabel);
        items.push(classLabel);

        // Equipment slots (right side)
        const eqX = colX + 175;

        slots.forEach((slot, i) => {
            const sy = contentY + 10 + i * 90;
            const item = gear[slot];

            // Slot label
            const label = this.add.text(eqX, sy, `${slotIcons[slot]} ${slotLabels[slot]}`, {
                fontFamily: 'monospace', fontSize: '10px', color: '#667788',
            });
            this._panelContainer.add(label);
            items.push(label);

            // Slot background
            const slotBg = this.add.graphics();
            slotBg.fillStyle(0x0a0a1a, 0.8);
            slotBg.fillRoundedRect(eqX, sy + 16, 350, 60, 4);
            slotBg.lineStyle(1, 0x334466, 0.5);
            slotBg.strokeRoundedRect(eqX, sy + 16, 350, 60, 4);
            this._panelContainer.add(slotBg);
            items.push(slotBg);

            if (item) {
                const rarityColor = RARITY_COLORS[item.rarity] || 0xffffff;
                const colorStr = '#' + rarityColor.toString(16).padStart(6, '0');

                const nameText = this.add.text(eqX + 10, sy + 22, item.name || `${item.rarity} ${slot}`, {
                    fontFamily: 'monospace', fontSize: '12px',
                    color: colorStr, stroke: '#000', strokeThickness: 1,
                });
                this._panelContainer.add(nameText);
                items.push(nameText);

                // Rarity tag
                const rarityTag = this.add.text(eqX + 10, sy + 40, `[${(item.rarity || 'common').toUpperCase()}]`, {
                    fontFamily: 'monospace', fontSize: '8px', color: colorStr,
                });
                this._panelContainer.add(rarityTag);
                items.push(rarityTag);

                // Stat bonuses in green
                if (item.statBonus) {
                    const bonusStr = Object.entries(item.statBonus)
                        .map(([k, v]) => `+${v} ${k}`).join('  ');
                    const bonusText = this.add.text(eqX + 10, sy + 54, bonusStr, {
                        fontFamily: 'monospace', fontSize: '9px', color: '#66cc66',
                    });
                    this._panelContainer.add(bonusText);
                    items.push(bonusText);
                }
            } else {
                const emptyText = this.add.text(eqX + 10, sy + 34, '(empty)', {
                    fontFamily: 'monospace', fontSize: '11px', color: '#444444',
                });
                this._panelContainer.add(emptyText);
                items.push(emptyText);
            }
        });

        this._tabContents['INVENTORY'] = items;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  MAP TAB — Full-size minimap
    // ══════════════════════════════════════════════════════════════════════════

    _buildMapTab(contentY, contentH) {
        const items = [];
        const pw = this._panelW;

        const biomeNames = {
            crypt: 'The Crypt', caves: 'Fungal Caves', fortress: 'Iron Fortress',
            inferno: 'The Inferno', abyss: 'The Abyss',
        };
        const biomeRoomColors = {
            crypt: 0x3a3a5c, caves: 0x2a4a3a, fortress: 0x4a3a2a,
            inferno: 0x4a2222, abyss: 0x2a2a4a,
        };

        // Biome + floor header
        const header = this.add.text(0, contentY + 5,
            `${biomeNames[this.biomeName] || this.biomeName} — Floor ${this.floorNumber} / 25`, {
            fontFamily: 'monospace', fontSize: '12px',
            color: '#ccaa44', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5);
        this._panelContainer.add(header);
        items.push(header);

        // Map drawing area
        const mapW = pw - 60;
        const mapH = contentH - 65;
        const mapX = -mapW / 2;
        const mapY = contentY + 25;

        // Map background
        const mapBg = this.add.graphics();
        mapBg.fillStyle(0x080810, 1);
        mapBg.fillRoundedRect(mapX, mapY, mapW, mapH, 4);
        mapBg.lineStyle(1, 0x334455, 1);
        mapBg.strokeRoundedRect(mapX, mapY, mapW, mapH, 4);
        this._panelContainer.add(mapBg);
        items.push(mapBg);

        // Draw rooms from actual dungeon data
        const md = this.mapData;
        const rooms = md.rooms || [];
        const fogGrid = md.fogGrid;
        const gw = md.gridWidth || 1;
        const gh = md.gridHeight || 1;
        const roomColor = biomeRoomColors[this.biomeName] || 0x3a3a5c;

        if (rooms.length > 0) {
            // Scale dungeon grid to fit inside map area with padding
            const pad = 10;
            const drawW = mapW - pad * 2;
            const drawH = mapH - pad * 2;
            const scaleX = drawW / gw;
            const scaleY = drawH / gh;
            const scale = Math.min(scaleX, scaleY);
            // Center the map drawing
            const offsetX = mapX + pad + (drawW - gw * scale) / 2;
            const offsetY = mapY + pad + (drawH - gh * scale) / 2;

            const roomGfx = this.add.graphics();

            for (const room of rooms) {
                // Check if any tile in this room is revealed by fog
                let revealed = false;
                if (fogGrid) {
                    for (let ry = room.y; ry < room.y + room.h && !revealed; ry++) {
                        for (let rx = room.x; rx < room.x + room.w && !revealed; rx++) {
                            if (ry >= 0 && ry < gh && rx >= 0 && rx < gw) {
                                if (fogGrid[ry * gw + rx] === 1) revealed = true;
                            }
                        }
                    }
                } else {
                    revealed = true; // no fog data, show all
                }

                if (!revealed) continue;

                const rx = offsetX + room.x * scale;
                const ry = offsetY + room.y * scale;
                const rw = room.w * scale;
                const rh = room.h * scale;

                roomGfx.fillStyle(roomColor, 0.8);
                roomGfx.fillRect(rx, ry, rw, rh);
                roomGfx.lineStyle(1, 0x667788, 0.6);
                roomGfx.strokeRect(rx, ry, rw, rh);
            }

            // Draw player position
            if (md.playerTileX && md.playerTileY) {
                const px = offsetX + md.playerTileX * scale;
                const py = offsetY + md.playerTileY * scale;
                roomGfx.fillStyle(0x44ff44, 1);
                roomGfx.fillCircle(px, py, Math.max(3, scale * 1.5));
            }

            // Draw stairs position
            if (md.stairsPos) {
                const sx = offsetX + md.stairsPos.x * scale;
                const sy = offsetY + md.stairsPos.y * scale;
                // Only show if revealed
                let stairsRevealed = !fogGrid;
                if (fogGrid && md.stairsPos.y >= 0 && md.stairsPos.y < gh &&
                    md.stairsPos.x >= 0 && md.stairsPos.x < gw) {
                    stairsRevealed = fogGrid[md.stairsPos.y * gw + md.stairsPos.x] === 1;
                }
                if (stairsRevealed) {
                    roomGfx.fillStyle(0xffcc00, 1);
                    roomGfx.fillTriangle(
                        sx, sy - Math.max(3, scale * 1.5),
                        sx - Math.max(3, scale * 1.2), sy + Math.max(2, scale),
                        sx + Math.max(3, scale * 1.2), sy + Math.max(2, scale)
                    );
                }
            }

            this._panelContainer.add(roomGfx);
            items.push(roomGfx);
        } else {
            const noData = this.add.text(0, mapY + mapH / 2, 'No map data', {
                fontFamily: 'monospace', fontSize: '10px', color: '#445566',
            }).setOrigin(0.5);
            this._panelContainer.add(noData);
            items.push(noData);
        }

        // Legend
        const legY = mapY + mapH + 6;
        const legend = this.add.text(0, legY,
            '● You    ▲ Stairs', {
            fontFamily: 'monospace', fontSize: '9px', color: '#888888',
        }).setOrigin(0.5);
        this._panelContainer.add(legend);
        items.push(legend);

        // Run time
        const runMins = Math.floor(this.runTime / 60000);
        const runSecs = Math.floor((this.runTime % 60000) / 1000);
        const timeText = this.add.text(0, legY + 14,
            `Run Time: ${runMins}m ${runSecs}s`, {
            fontFamily: 'monospace', fontSize: '9px', color: '#666666',
        }).setOrigin(0.5);
        this._panelContainer.add(timeText);
        items.push(timeText);

        this._tabContents['MAP'] = items;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  CODEX TAB — Lore scroll discovery grid
    // ══════════════════════════════════════════════════════════════════════════

    _buildCodexTab(contentY, contentH) {
        const items = [];
        const pw = this._panelW;
        const scrolls = LoreData.scrolls;
        const biomes = ['crypt', 'caves', 'fortress', 'inferno', 'abyss'];
        const biomeLabels = {
            crypt: 'Crypt', caves: 'Fungal Caves', fortress: 'Iron Fortress',
            inferno: 'Inferno', abyss: 'Abyss',
        };
        const biomeColors = {
            crypt: '#aaaacc', caves: '#66cc88', fortress: '#ccaa66',
            inferno: '#ff6644', abyss: '#aa88cc',
        };

        const discovered = this.discoveredLore;
        const totalFound = scrolls.filter(s => discovered.has(s.id)).length;

        // Header
        const header = this.add.text(0, contentY + 5,
            `LORE SCROLLS — ${totalFound} / ${scrolls.length}`, {
            fontFamily: 'monospace', fontSize: '12px',
            color: '#ffdd00', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5);
        this._panelContainer.add(header);
        items.push(header);

        // Grid: 5 rows (biomes) x 5 columns (scrolls per biome)
        const gridStartX = -pw / 2 + 40;
        const gridStartY = contentY + 30;
        const cellW = 100;
        const cellH = 50;

        // Detail text area (shown when hovering a scroll)
        const detailBg = this.add.graphics();
        detailBg.fillStyle(0x0a0a1a, 0.9);
        detailBg.fillRoundedRect(-pw / 2 + 20, gridStartY + 285, pw - 40, 60, 6);
        detailBg.setVisible(false);
        this._panelContainer.add(detailBg);
        items.push(detailBg);

        const detailText = this.add.text(0, gridStartY + 300, '', {
            fontFamily: 'monospace', fontSize: '9px',
            color: '#ccccdd', stroke: '#000', strokeThickness: 1,
            align: 'center', wordWrap: { width: pw - 60 },
        }).setOrigin(0.5, 0).setVisible(false);
        this._panelContainer.add(detailText);
        items.push(detailText);

        biomes.forEach((biome, row) => {
            // Biome label
            const label = this.add.text(gridStartX, gridStartY + row * cellH,
                biomeLabels[biome], {
                fontFamily: 'monospace', fontSize: '9px',
                color: biomeColors[biome] || '#888888',
            });
            this._panelContainer.add(label);
            items.push(label);

            // 5 scroll slots per biome
            const biomeScrolls = scrolls.filter(s => s.biome === biome);
            biomeScrolls.forEach((scroll, col) => {
                const sx = gridStartX + 95 + col * (cellW - 10);
                const sy = gridStartY + row * cellH;
                const isFound = discovered.has(scroll.id);

                const slotBg = this.add.graphics();
                slotBg.fillStyle(isFound ? 0x223344 : 0x1a1a1a, 0.8);
                slotBg.fillRoundedRect(sx, sy - 2, 80, 20, 4);
                slotBg.lineStyle(1, isFound ? 0x446688 : 0x333333, 0.5);
                slotBg.strokeRoundedRect(sx, sy - 2, 80, 20, 4);
                this._panelContainer.add(slotBg);
                items.push(slotBg);

                const slotText = this.add.text(sx + 40, sy + 8,
                    isFound ? scroll.title : '???', {
                    fontFamily: 'monospace',
                    fontSize: '8px',
                    color: isFound ? '#ddddff' : '#444444',
                }).setOrigin(0.5);
                this._panelContainer.add(slotText);
                items.push(slotText);

                if (isFound) {
                    // Interactive: show detail on hover
                    const hitZone = this.add.rectangle(sx + 40, sy + 8, 80, 20, 0x000000, 0)
                        .setInteractive();
                    this._panelContainer.add(hitZone);
                    items.push(hitZone);

                    hitZone.on('pointerover', () => {
                        slotBg.clear();
                        slotBg.fillStyle(0x334466, 0.9);
                        slotBg.fillRoundedRect(sx, sy - 2, 80, 20, 4);
                        slotBg.lineStyle(1, 0x6688aa, 0.8);
                        slotBg.strokeRoundedRect(sx, sy - 2, 80, 20, 4);
                        detailBg.setVisible(true);
                        detailText.setVisible(true);
                        detailText.setText(`${scroll.title}\n${scroll.text}`);
                    });
                    hitZone.on('pointerout', () => {
                        slotBg.clear();
                        slotBg.fillStyle(0x223344, 0.8);
                        slotBg.fillRoundedRect(sx, sy - 2, 80, 20, 4);
                        slotBg.lineStyle(1, 0x446688, 0.5);
                        slotBg.strokeRoundedRect(sx, sy - 2, 80, 20, 4);
                        detailBg.setVisible(false);
                        detailText.setVisible(false);
                    });
                }
            });
        });

        this._tabContents['CODEX'] = items;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  STATS TAB — Character stats with gear bonuses
    // ══════════════════════════════════════════════════════════════════════════

    _buildStatsTab(contentY, contentH) {
        const items = [];
        const pw = this._panelW;
        const p = this.playerData;
        const classData = ClassData[p.classKey] || {};

        const colX = -pw / 2 + 40;

        // Character Stats section
        const statsHeader = this.add.text(colX, contentY + 5, 'CHARACTER STATS', {
            fontFamily: 'monospace', fontSize: '11px',
            color: '#88aaff', stroke: '#000', strokeThickness: 2,
        });
        this._panelContainer.add(statsHeader);
        items.push(statsHeader);

        const hpPct = p.maxHp > 0 ? Math.round(p.hp / p.maxHp * 100) : 0;
        const manaPct = p.maxMana > 0 ? Math.round(p.mana / p.maxMana * 100) : 0;

        // Calculate gear bonuses
        const gearBonus = this._calcGearBonuses();

        const statLines = [
            { label: `HP`, value: `${Math.round(p.hp || 0)} / ${p.maxHp || 0} (${hpPct}%)`, color: '#ff5555' },
            { label: `Mana`, value: `${Math.round(p.mana || 0)} / ${p.maxMana || 0} (${manaPct}%)`, color: '#5588ff' },
            { label: `Attack`, value: `${p.attack || 0}`, color: '#ffffff', bonus: gearBonus.attack },
            { label: `Defense`, value: `${p.defense || 0}`, color: '#ffffff', bonus: gearBonus.defense },
            { label: `Speed`, value: `${p.speed || 'medium'}`, color: '#ffffff' },
            { label: ``, value: ``, color: '#ffffff' },
            { label: `Floor`, value: `${this.floorNumber}`, color: '#ccaa44' },
            { label: `Gold`, value: `${p.gold || 0}`, color: '#ffcc00' },
            { label: `HP Potions`, value: `${p.hpPotions || 0}`, color: '#ff7777' },
            { label: `MP Potions`, value: `${p.mpPotions || 0}`, color: '#7799ff' },
        ];

        statLines.forEach((stat, i) => {
            const sy = contentY + 25 + i * 22;

            if (stat.label) {
                const lbl = this.add.text(colX, sy, `${stat.label}:`, {
                    fontFamily: 'monospace', fontSize: '10px', color: '#888888',
                });
                this._panelContainer.add(lbl);
                items.push(lbl);

                let valStr = stat.value;
                if (stat.bonus && stat.bonus > 0) {
                    valStr += ` (+${stat.bonus})`;
                }

                const val = this.add.text(colX + 120, sy, valStr, {
                    fontFamily: 'monospace', fontSize: '10px',
                    color: stat.bonus > 0 ? '#66cc66' : stat.color,
                });
                this._panelContainer.add(val);
                items.push(val);
            }
        });

        // Run stats section (right column)
        const col2X = 50;
        const runHeader = this.add.text(col2X, contentY + 5, 'RUN STATS', {
            fontFamily: 'monospace', fontSize: '11px',
            color: '#88aaff', stroke: '#000', strokeThickness: 2,
        });
        this._panelContainer.add(runHeader);
        items.push(runHeader);

        const runStats = [
            { label: 'Kills', value: `${p.killCount || 0}`, color: '#aaaaaa' },
            { label: 'Damage', value: `${p.damageDealt || 0}`, color: '#ff8888' },
            { label: 'Run Time', value: `${Math.floor(this.runTime / 60000)}m`, color: '#aaaaaa' },
        ];

        runStats.forEach((stat, i) => {
            const sy = contentY + 25 + i * 22;

            const lbl = this.add.text(col2X, sy, `${stat.label}:`, {
                fontFamily: 'monospace', fontSize: '10px', color: '#888888',
            });
            this._panelContainer.add(lbl);
            items.push(lbl);

            const val = this.add.text(col2X + 100, sy, stat.value, {
                fontFamily: 'monospace', fontSize: '10px', color: stat.color,
            });
            this._panelContainer.add(val);
            items.push(val);
        });

        // Companions section
        if (this.companions.length > 0) {
            const compHeader = this.add.text(col2X, contentY + 100, 'COMPANIONS', {
                fontFamily: 'monospace', fontSize: '11px',
                color: '#88aaff', stroke: '#000', strokeThickness: 2,
            });
            this._panelContainer.add(compHeader);
            items.push(compHeader);

            this.companions.forEach((comp, i) => {
                const cy = contentY + 120 + i * 35;
                const cd = ClassData[comp.classKey] || {};
                const status = comp.alive ? (comp.downed ? 'DOWNED' : 'ACTIVE') : 'DEAD';
                const statusColor = comp.alive ? (comp.downed ? '#ff8844' : '#44cc44') : '#ff4444';

                const name = this.add.text(col2X, cy, cd.name || comp.classKey, {
                    fontFamily: 'monospace', fontSize: '10px',
                    color: '#ddddff', stroke: '#000', strokeThickness: 1,
                });
                this._panelContainer.add(name);
                items.push(name);

                const hp = this.add.text(col2X, cy + 14, `HP: ${Math.round(comp.hp || 0)} — ${status}`, {
                    fontFamily: 'monospace', fontSize: '9px', color: statusColor,
                });
                this._panelContainer.add(hp);
                items.push(hp);
            });
        }

        this._tabContents['STATS'] = items;
    }

    _calcGearBonuses() {
        const gear = this.playerData.gear || {};
        const bonuses = { attack: 0, defense: 0, hp: 0 };

        for (const slot of ['weapon', 'armor', 'accessory']) {
            const item = gear[slot];
            if (item?.statBonus) {
                for (const [key, val] of Object.entries(item.statBonus)) {
                    if (bonuses[key] !== undefined) bonuses[key] += val;
                }
            }
        }
        return bonuses;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  SETTINGS TAB
    // ══════════════════════════════════════════════════════════════════════════

    _buildSettingsTab(contentY, contentH) {
        const items = [];
        const colX = -this._panelW / 2 + 40;
        const sliderW = 200;

        // Load saved settings
        const settings = PauseScene.loadSettings();

        // Helper: create a labeled slider row
        const makeSlider = (label, y, initial, color, onChange) => {
            const lbl = this.add.text(colX, y, label, {
                fontFamily: 'monospace', fontSize: '11px', color: '#cccccc',
            });
            this._panelContainer.add(lbl);
            items.push(lbl);

            const trackY = y + 20;
            const track = this.add.graphics();
            track.fillStyle(0x333344, 1);
            track.fillRect(colX, trackY, sliderW, 8);
            track.lineStyle(1, 0x555566, 1);
            track.strokeRect(colX, trackY, sliderW, 8);
            this._panelContainer.add(track);
            items.push(track);

            const knob = this.add.rectangle(
                colX + sliderW * initial, trackY + 4, 12, 16, color
            ).setInteractive({ draggable: true });
            this._panelContainer.add(knob);
            items.push(knob);

            const valLabel = this.add.text(colX + sliderW + 15, trackY - 2,
                `${Math.round(initial * 100)}%`, {
                fontFamily: 'monospace', fontSize: '10px', color: '#' + color.toString(16).padStart(6, '0'),
            });
            this._panelContainer.add(valLabel);
            items.push(valLabel);

            knob.on('drag', (pointer, dragX) => {
                const localX = Phaser.Math.Clamp(dragX, colX, colX + sliderW);
                knob.x = localX;
                const pct = (localX - colX) / sliderW;
                valLabel.setText(`${Math.round(pct * 100)}%`);
                onChange(pct);
            });
        };

        // CRT Intensity
        makeSlider('CRT Effect Intensity:', contentY + 10, settings.crtIntensity, 0xffdd00, (pct) => {
            settings.crtIntensity = pct;
            PauseScene.saveSettings(settings);
            const gameScene = this.scene.get('GameScene');
            const pipeline = gameScene?.cameras?.main?.getPostPipeline?.('CRTShader');
            if (pipeline) pipeline.setIntensity(pct);
        });

        // Music Volume
        makeSlider('Music Volume:', contentY + 65, settings.musicVolume, 0x88aaff, (pct) => {
            settings.musicVolume = pct;
            PauseScene.saveSettings(settings);
            const gameScene = this.scene.get('GameScene');
            gameScene?.audioManager?.setMusicVolume(pct);
        });

        // SFX Volume
        makeSlider('SFX Volume:', contentY + 120, settings.sfxVolume, 0xffaa66, (pct) => {
            settings.sfxVolume = pct;
            PauseScene.saveSettings(settings);
            const gameScene = this.scene.get('GameScene');
            gameScene?.audioManager?.setSFXVolume(pct);
        });

        // Hints toggle
        const hintsLabel = this.add.text(colX, contentY + 180, 'Tutorial Hints:', {
            fontFamily: 'monospace', fontSize: '11px', color: '#cccccc',
        });
        this._panelContainer.add(hintsLabel);
        items.push(hintsLabel);

        const hintsToggle = this.add.text(colX + 150, contentY + 180,
            settings.hintsEnabled ? '[ON]' : '[OFF]', {
            fontFamily: 'monospace', fontSize: '10px',
            color: settings.hintsEnabled ? '#44ff44' : '#ff4444',
            stroke: '#000', strokeThickness: 1,
        }).setInteractive();

        hintsToggle.on('pointerdown', () => {
            settings.hintsEnabled = !settings.hintsEnabled;
            hintsToggle.setText(settings.hintsEnabled ? '[ON]' : '[OFF]');
            hintsToggle.setColor(settings.hintsEnabled ? '#44ff44' : '#ff4444');
            PauseScene.saveSettings(settings);
        });
        this._panelContainer.add(hintsToggle);
        items.push(hintsToggle);

        this._tabContents['SETTINGS'] = items;
    }

    // ── Settings persistence (global, not per-profile) ──────────────────────

    static loadSettings() {
        try {
            const raw = localStorage.getItem('gauntlet_settings');
            if (raw) return { ...PauseScene.defaultSettings(), ...JSON.parse(raw) };
        } catch (e) { /* ignore */ }
        return PauseScene.defaultSettings();
    }

    static saveSettings(settings) {
        try {
            localStorage.setItem('gauntlet_settings', JSON.stringify(settings));
        } catch (e) { /* ignore */ }
    }

    static defaultSettings() {
        return { crtIntensity: 0.7, musicVolume: 0.8, sfxVolume: 1.0, hintsEnabled: true };
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  NAVIGATION
    // ══════════════════════════════════════════════════════════════════════════

    _resume() {
        this.input.keyboard.removeAllListeners();

        // Scale-down close animation
        this.tweens.add({
            targets: this._panelContainer,
            scaleX: 0.3, scaleY: 0.3, alpha: 0,
            duration: 150,
            ease: 'Power2',
            onComplete: () => {
                this.scene.resume('GameScene');
                this.scene.stop();
            }
        });
    }

    _quitToMenu() {
        this.input.keyboard.removeAllListeners();
        this.scene.stop('UIScene');
        this.scene.stop('GameScene');
        this.scene.stop();
        this.scene.start('MenuScene');
    }
}
