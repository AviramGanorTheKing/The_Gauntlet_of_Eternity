/**
 * SkillTreeScene — persistent skill tree management.
 * Spend soul shards on permanent upgrades for each class.
 * Each class has 4 branches (Might, Fortitude, Technique, Mastery) with nodes.
 */

import { applyCRTShader } from '../shaders/CRTShader.js';
import { PerkData, RESPEC_COSTS } from '../config/PerkData.js';
import { ClassData } from '../config/ClassData.js';
import { saveManager } from '../systems/SaveManager.js';
import { ProgressionManager } from '../systems/ProgressionManager.js';

const BRANCH_COLORS = {
    might: { fill: 0x442222, border: 0xff6644, text: '#ff6644' },
    fortitude: { fill: 0x224422, border: 0x44cc44, text: '#44cc44' },
    technique: { fill: 0x222244, border: 0x4488ff, text: '#4488ff' },
    mastery: { fill: 0x332244, border: 0xcc66ff, text: '#cc66ff' },
};

const BRANCH_LABELS = {
    might: 'MIGHT',
    fortitude: 'FORTITUDE',
    technique: 'TECHNIQUE',
    mastery: 'MASTERY',
};

export class SkillTreeScene extends Phaser.Scene {
    constructor() {
        super('SkillTreeScene');
    }

    init(data) {
        this.selectedClass = data?.classKey || 'warrior';
        this.returnScene = data?.returnScene || 'CharSelectScene';
        this.returnData = data?.returnData || {};
    }

    create() {
        const W = this.game.config.width;
        const H = this.game.config.height;

        applyCRTShader(this, 'subtle');

        this.progression = new ProgressionManager();

        // Background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0a0a14, 0x0a0a14, 0x1a1a2e, 0x1a1a2e, 1);
        bg.fillRect(0, 0, W, H);

        // Class selector tabs
        this._buildClassTabs(W);

        // Title
        const classData = ClassData[this.selectedClass];
        this.titleText = this.add.text(W / 2, 55, `${classData.name} Skill Tree`, {
            fontFamily: 'monospace', fontSize: '16px',
            color: '#ffdd00', stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5);

        // Shard counter
        const permanent = saveManager.getPermanent();
        this.shardText = this.add.text(W - 15, 55, `Shards: ${permanent.soulShards || 0}`, {
            fontFamily: 'monospace', fontSize: '12px',
            color: '#ffaa44', stroke: '#000', strokeThickness: 2,
        }).setOrigin(1, 0.5);

        // Build tree
        this.nodeElements = [];
        this._buildTree(W, H);

        // Tooltip
        this.tooltip = this.add.container(0, 0).setDepth(100).setVisible(false);
        this.tooltipBg = this.add.graphics();
        this.tooltipText = this.add.text(0, 0, '', {
            fontFamily: 'monospace', fontSize: '10px',
            color: '#ffffff', wordWrap: { width: 200 },
            lineSpacing: 3,
        });
        this.tooltip.add([this.tooltipBg, this.tooltipText]);

        // Respec button
        const respecCost = this.progression.getRespecCost();
        const respecLabel = respecCost === 0 ? '[RESPEC: FREE]' : `[RESPEC: ${respecCost} shards]`;
        this.respecBtn = this.add.text(15, H - 55, respecLabel, {
            fontFamily: 'monospace', fontSize: '10px',
            color: '#ff8844', stroke: '#000', strokeThickness: 2,
            backgroundColor: '#221111', padding: { x: 8, y: 4 },
        }).setInteractive();

        this.respecBtn.on('pointerover', () => this.respecBtn.setColor('#ffaa66'));
        this.respecBtn.on('pointerout', () => this.respecBtn.setColor('#ff8844'));
        this.respecBtn.on('pointerdown', () => this._doRespec());

        // Back button
        this.add.text(W / 2, H - 20, '[ESC] Back', {
            fontFamily: 'monospace', fontSize: '10px',
            color: '#888888',
        }).setOrigin(0.5);

        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.start(this.returnScene, this.returnData);
        });

        this.cameras.main.fadeIn(300);
    }

    _buildClassTabs(W) {
        const classKeys = Object.keys(ClassData);
        const tabW = 90;
        const gap = 4;
        const totalW = classKeys.length * tabW + (classKeys.length - 1) * gap;
        const startX = (W - totalW) / 2;

        this.classTabs = [];

        classKeys.forEach((key, i) => {
            const data = ClassData[key];
            const tx = startX + i * (tabW + gap);
            const isSelected = key === this.selectedClass;
            const isUnlocked = saveManager.isClassUnlocked(key);

            const tab = this.add.text(tx + tabW / 2, 22, isUnlocked ? data.name : '???', {
                fontFamily: 'monospace', fontSize: '10px',
                color: isSelected ? '#ffdd00' : (isUnlocked ? '#aaaacc' : '#444444'),
                stroke: '#000', strokeThickness: 2,
                backgroundColor: isSelected ? '#333366' : '#111122',
                padding: { x: 6, y: 4 },
            }).setOrigin(0.5);

            if (isUnlocked) {
                tab.setInteractive();
                tab.on('pointerdown', () => {
                    this.selectedClass = key;
                    this.scene.restart({ classKey: key, returnScene: this.returnScene, returnData: this.returnData });
                });
            }

            this.classTabs.push(tab);
        });
    }

    _buildTree(W, H) {
        // Clean previous nodes
        for (const elem of this.nodeElements) {
            elem.container?.destroy();
        }
        this.nodeElements = [];

        const treeData = this.progression.getSkillTreeDisplay(this.selectedClass);
        if (!treeData) return;

        const branches = ['might', 'fortitude', 'technique', 'mastery'];
        const branchX = {};
        const branchW = (W - 40) / branches.length;

        branches.forEach((branch, col) => {
            const bx = 20 + col * branchW;
            branchX[branch] = bx;
            const colors = BRANCH_COLORS[branch];

            // Branch label
            this.add.text(bx + branchW / 2, 80, BRANCH_LABELS[branch], {
                fontFamily: 'monospace', fontSize: '10px',
                color: colors.text, stroke: '#000', strokeThickness: 2,
            }).setOrigin(0.5);

            const nodes = treeData[branch] || [];
            const nodeH = 55;
            const startY = 100;

            nodes.forEach((node, row) => {
                const ny = startY + row * nodeH;
                const nw = branchW - 12;
                const nh = 45;
                const nx = bx + 6;

                const container = this.add.container(nx, ny);

                // Node background
                const nodeBg = this.add.graphics();
                if (node.unlocked) {
                    nodeBg.fillStyle(colors.fill, 1);
                    nodeBg.lineStyle(2, colors.border, 1);
                } else if (node.canUnlock) {
                    nodeBg.fillStyle(0x1a1a2e, 1);
                    nodeBg.lineStyle(2, colors.border, 0.7);
                } else {
                    nodeBg.fillStyle(0x0a0a14, 1);
                    nodeBg.lineStyle(1, 0x333344, 0.5);
                }
                nodeBg.fillRoundedRect(0, 0, nw, nh, 4);
                nodeBg.strokeRoundedRect(0, 0, nw, nh, 4);
                container.add(nodeBg);

                // Node name
                const nameColor = node.unlocked ? '#ffffff' : (node.canUnlock ? '#ccccee' : '#555566');
                container.add(this.add.text(nw / 2, 12, node.name, {
                    fontFamily: 'monospace', fontSize: '9px',
                    color: nameColor, stroke: '#000', strokeThickness: 1,
                }).setOrigin(0.5));

                // Cost or OWNED
                const costStr = node.unlocked ? 'OWNED' : `${node.cost} shards`;
                const costColor = node.unlocked ? '#44cc44' : (node.affordable ? '#ffaa44' : '#884444');
                container.add(this.add.text(nw / 2, 30, costStr, {
                    fontFamily: 'monospace', fontSize: '8px',
                    color: costColor,
                }).setOrigin(0.5));

                // Connection line to previous node
                if (row > 0) {
                    const lineGfx = this.add.graphics();
                    const prevUnlocked = treeData[branch][row - 1]?.unlocked;
                    lineGfx.lineStyle(2, prevUnlocked ? colors.border : 0x333344, prevUnlocked ? 0.8 : 0.3);
                    lineGfx.lineBetween(nx + nw / 2, ny - 5, nx + nw / 2, ny);
                }

                // Click zone for purchasing
                const zone = this.add.zone(nw / 2, nh / 2, nw, nh).setInteractive();
                container.add(zone);

                zone.on('pointerover', () => {
                    this._showTooltip(nx + nw + 5, ny, node);
                });
                zone.on('pointerout', () => {
                    this.tooltip.setVisible(false);
                });
                zone.on('pointerdown', () => {
                    if (node.canUnlock) {
                        this._purchasePerk(node.id);
                    }
                });

                this.nodeElements.push({ node, container });
            });
        });
    }

    _showTooltip(x, y, node) {
        const W = this.game.config.width;

        let text = `${node.name}\n${node.desc}`;
        if (!node.unlocked) {
            text += `\n\nCost: ${node.cost} shards`;
            if (node.requires) {
                text += `\nRequires previous node`;
            }
        }

        this.tooltipText.setText(text);
        const bounds = this.tooltipText.getBounds();
        const tw = bounds.width + 16;
        const th = bounds.height + 12;

        // Flip if off-screen
        let tx = x;
        if (tx + tw > W - 10) tx = x - tw - 10;

        this.tooltipBg.clear();
        this.tooltipBg.fillStyle(0x111133, 0.95);
        this.tooltipBg.fillRoundedRect(-5, -5, tw, th, 4);
        this.tooltipBg.lineStyle(1, 0x6666aa, 1);
        this.tooltipBg.strokeRoundedRect(-5, -5, tw, th, 4);

        this.tooltip.setPosition(tx + 3, y + 3);
        this.tooltip.setVisible(true);
    }

    _purchasePerk(perkId) {
        const success = this.progression.unlockPerk(this.selectedClass, perkId);
        if (!success) return;

        // Refresh display
        const permanent = saveManager.getPermanent();
        this.shardText.setText(`Shards: ${permanent.soulShards || 0}`);
        this._buildTree(this.game.config.width, this.game.config.height);

        // Flash effect
        this.cameras.main.flash(80, 100, 200, 255);
    }

    _doRespec() {
        const refund = this.progression.respecClass(this.selectedClass);
        if (refund < 0) return;

        // Refresh display
        const permanent = saveManager.getPermanent();
        this.shardText.setText(`Shards: ${permanent.soulShards || 0}`);

        const respecCost = this.progression.getRespecCost();
        const respecLabel = respecCost === 0 ? '[RESPEC: FREE]' : `[RESPEC: ${respecCost} shards]`;
        this.respecBtn.setText(respecLabel);

        this._buildTree(this.game.config.width, this.game.config.height);
        this.cameras.main.flash(80, 255, 150, 50);
    }
}
