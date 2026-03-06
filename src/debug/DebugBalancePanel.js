/**
 * DebugBalancePanel — DOM overlay for live stat tuning.
 * Toggle with backtick (`) key.
 */
export class DebugBalancePanel {
    constructor() {
        this.visible = false;
        this.panel = null;
        this.activeTab = 'players';
        this._readbackInterval = null;
        this._build();
        this._bindToggle();
    }

    // ── Build DOM ──────────────────────────────────────────────────────────

    _build() {
        this.panel = document.createElement('div');
        this.panel.id = 'debug-balance-panel';
        this.panel.style.cssText = `
            position: fixed; top: 0; right: 0; width: 340px; height: 100vh;
            background: rgba(10, 10, 20, 0.95); color: #ccc;
            font-family: monospace; font-size: 12px;
            overflow-y: auto; z-index: 9999;
            border-left: 2px solid #444;
            display: none; padding: 0;
            user-select: none;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = 'padding: 8px 12px; background: #1a1a2e; border-bottom: 1px solid #444; display: flex; justify-content: space-between; align-items: center;';
        header.innerHTML = '<span style="color: #ffdd00; font-size: 14px; font-weight: bold;">BALANCE PANEL</span>';
        const closeBtn = document.createElement('span');
        closeBtn.textContent = '[X]';
        closeBtn.style.cssText = 'color: #ff4444; cursor: pointer;';
        closeBtn.onclick = () => this.hide();
        header.appendChild(closeBtn);
        this.panel.appendChild(header);

        // Tabs
        const tabs = document.createElement('div');
        tabs.style.cssText = 'display: flex; border-bottom: 1px solid #444;';
        for (const tab of ['players', 'enemies', 'global', 'dev', 'features']) {
            const btn = document.createElement('div');
            btn.textContent = tab.toUpperCase();
            btn.dataset.tab = tab;
            btn.style.cssText = `
                flex: 1; text-align: center; padding: 6px 0; cursor: pointer;
                background: ${tab === this.activeTab ? '#2a2a4e' : 'transparent'};
                color: ${tab === this.activeTab ? '#ffdd00' : '#888'};
                border-right: 1px solid #333;
            `;
            btn.onclick = () => this._switchTab(tab);
            tabs.appendChild(btn);
        }
        this.panel.appendChild(tabs);
        this._tabs = tabs;

        // Content area
        this.content = document.createElement('div');
        this.content.style.cssText = 'padding: 10px 12px;';
        this.panel.appendChild(this.content);

        // Live readback area
        this.readback = document.createElement('div');
        this.readback.style.cssText = 'padding: 8px 12px; border-top: 1px solid #333; background: #0d0d1a; font-size: 11px; color: #88aacc;';
        this.panel.appendChild(this.readback);

        document.body.appendChild(this.panel);
        this._renderTab();
    }

    _switchTab(tab) {
        this.activeTab = tab;
        // Update tab styles
        for (const btn of this._tabs.children) {
            const isActive = btn.dataset.tab === tab;
            btn.style.background = isActive ? '#2a2a4e' : 'transparent';
            btn.style.color = isActive ? '#ffdd00' : '#888';
        }
        this._renderTab();
    }

    _renderTab() {
        this.content.innerHTML = '';
        switch (this.activeTab) {
            case 'players': this._renderPlayersTab(); break;
            case 'enemies': this._renderEnemiesTab(); break;
            case 'global': this._renderGlobalTab(); break;
            case 'dev': this._renderDevTab(); break;
            case 'features': this._renderFeaturesTab(); break;
        }
    }

    // ── Players Tab ────────────────────────────────────────────────────────

    _renderPlayersTab() {
        const db = window.GAUNTLET_DEBUG;
        if (!db) { this.content.textContent = 'Debug bridge not ready'; return; }

        const classes = Object.keys(db.ClassData);
        const currentClass = db.getPlayer()?.classKey || classes[0];

        // Class selector
        const select = this._createSelect(classes, currentClass, (val) => {
            this._renderPlayersTab();
        });
        select.id = 'dbg-class-select';
        this.content.appendChild(this._label('Class:'));
        this.content.appendChild(select);
        this.content.appendChild(document.createElement('hr'));

        const classKey = select.value;
        const cfg = db.ClassData[classKey];

        // Stat sliders
        const fields = [
            { key: 'attack', label: 'Attack Power', min: 1, max: 100, step: 1, value: cfg.attack },
            { key: 'defense', label: 'Defense', min: 0, max: 50, step: 1, value: cfg.defense },
            { key: 'hp', label: 'Max HP', min: 10, max: 500, step: 5, value: cfg.hp },
            { key: 'attackSpeed', label: 'Attack Speed', min: 0.1, max: 5.0, step: 0.1, value: cfg.attackSpeed },
        ];

        const inputs = {};
        for (const f of fields) {
            const row = this._sliderRow(f);
            inputs[f.key] = row.input;
            this.content.appendChild(row.container);
        }

        // Speed dropdown (not a slider)
        const speedSel = this._createSelect(['slow', 'medium', 'fast'], cfg.speed);
        speedSel.id = 'dbg-player-speed';
        this.content.appendChild(this._label('Move Speed:'));
        this.content.appendChild(speedSel);

        // Push button
        const pushBtn = this._pushButton('Push to Live', () => {
            const changes = {};
            for (const f of fields) {
                changes[f.key] = parseFloat(inputs[f.key].value);
            }
            changes.speed = speedSel.value;
            db.pushPlayerStats(classKey, changes);
            this._flashButton(pushBtn);
            this._updateReadback();
        });
        this.content.appendChild(pushBtn);
    }

    // ── Enemies Tab ────────────────────────────────────────────────────────

    _renderEnemiesTab() {
        const db = window.GAUNTLET_DEBUG;
        if (!db) { this.content.textContent = 'Debug bridge not ready'; return; }

        const types = Object.keys(db.EnemyData);

        const select = this._createSelect(types, types[0]);
        select.id = 'dbg-enemy-select';
        this.content.appendChild(this._label('Enemy Type:'));
        this.content.appendChild(select);
        this.content.appendChild(document.createElement('hr'));

        const render = () => {
            // Remove old fields
            const old = this.content.querySelectorAll('.dbg-enemy-field, .dbg-push-btn');
            old.forEach(el => el.remove());

            const enemyKey = select.value;
            const cfg = db.EnemyData[enemyKey];

            const fields = [
                { key: 'damage', label: 'Damage', min: 1, max: 100, step: 1, value: cfg.damage },
                { key: 'defense', label: 'Defense', min: 0, max: 30, step: 1, value: cfg.defense || 0 },
                { key: 'hp', label: 'Max HP', min: 1, max: 500, step: 5, value: cfg.hp },
                { key: 'speed', label: 'Move Speed', min: 10, max: 400, step: 5, value: cfg.speed },
                { key: 'knockbackResistance', label: 'KB Resist', min: 0, max: 1, step: 0.05, value: cfg.knockbackResistance || 0 },
            ];

            const inputs = {};
            for (const f of fields) {
                const row = this._sliderRow(f);
                row.container.classList.add('dbg-enemy-field');
                inputs[f.key] = row.input;
                this.content.appendChild(row.container);
            }

            const pushBtn = this._pushButton('Push to Live', () => {
                const changes = {};
                for (const f of fields) {
                    changes[f.key] = parseFloat(inputs[f.key].value);
                }
                db.pushEnemyStats(enemyKey, changes);
                this._flashButton(pushBtn);
                this._updateReadback();
            });
            pushBtn.classList.add('dbg-push-btn');
            this.content.appendChild(pushBtn);
        };

        select.addEventListener('change', render);
        render();
    }

    // ── Global Tab ─────────────────────────────────────────────────────────

    _renderGlobalTab() {
        const db = window.GAUNTLET_DEBUG;
        if (!db) { this.content.textContent = 'Debug bridge not ready'; return; }

        const gc = db.GameConfig;
        const fields = [
            { key: 'KNOCKBACK_FORCE', label: 'Knockback Force', min: 0, max: 600, step: 10, value: gc.KNOCKBACK_FORCE },
            { key: 'KNOCKBACK_DURATION', label: 'Knockback Dur (ms)', min: 50, max: 500, step: 10, value: gc.KNOCKBACK_DURATION },
            { key: 'DODGE_DISTANCE', label: 'Dodge Distance', min: 20, max: 300, step: 4, value: gc.DODGE_DISTANCE },
            { key: 'DODGE_COOLDOWN', label: 'Dodge Cooldown (ms)', min: 200, max: 5000, step: 100, value: gc.DODGE_COOLDOWN },
            { key: 'ATTACK_COOLDOWN_BASE', label: 'Atk Cooldown Base', min: 200, max: 3000, step: 50, value: gc.ATTACK_COOLDOWN_BASE },
            { key: 'MANA_REGEN_PER_SECOND', label: 'Mana Regen/s', min: 0, max: 20, step: 0.5, value: gc.MANA_REGEN_PER_SECOND },
            { key: 'HEALTH_POTION_HEAL_PERCENT', label: 'HP Potion Heal %', min: 0.05, max: 1.0, step: 0.05, value: gc.HEALTH_POTION_HEAL_PERCENT },
        ];

        const inputs = {};
        for (const f of fields) {
            const row = this._sliderRow(f);
            inputs[f.key] = row.input;
            this.content.appendChild(row.container);
        }

        const pushBtn = this._pushButton('Push to Live', () => {
            const changes = {};
            for (const f of fields) {
                changes[f.key] = parseFloat(inputs[f.key].value);
            }
            db.pushGlobalConfig(changes);
            this._flashButton(pushBtn);
            this._updateReadback();
        });
        this.content.appendChild(pushBtn);
    }

    // ── Dev Tab ───────────────────────────────────────────────────────────

    _renderDevTab() {
        const db = window.GAUNTLET_DEBUG;
        if (!db) { this.content.textContent = 'Debug bridge not ready'; return; }

        // Section: Floor Teleport
        const sectionTitle = document.createElement('div');
        sectionTitle.textContent = '⚡ FLOOR TELEPORT';
        sectionTitle.style.cssText = 'color: #ff8844; font-size: 13px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 4px;';
        this.content.appendChild(sectionTitle);

        // Current floor display
        const currentFloor = db.getCurrentFloor();
        const floorDisplay = document.createElement('div');
        floorDisplay.style.cssText = 'color: #aaa; font-size: 11px; margin-bottom: 8px;';
        floorDisplay.innerHTML = `Current Floor: <span style="color: #ffdd00; font-weight: bold;">${currentFloor}</span>`;
        this.content.appendChild(floorDisplay);

        // Floor input
        this.content.appendChild(this._label('Target Floor (1-25):'));
        const floorInput = document.createElement('input');
        floorInput.type = 'number';
        floorInput.min = 1;
        floorInput.max = 25;
        floorInput.value = currentFloor;
        floorInput.style.cssText = `
            width: 100%; padding: 6px 8px; margin-bottom: 4px;
            background: #1a1a2e; color: #ffdd00; border: 1px solid #444;
            font-family: monospace; font-size: 14px; text-align: center;
            border-radius: 3px;
        `;
        this.content.appendChild(floorInput);

        // Quick floor buttons
        const quickBtns = document.createElement('div');
        quickBtns.style.cssText = 'display: flex; gap: 4px; margin: 8px 0; flex-wrap: wrap;';
        const bossFloors = [5, 10, 15, 20, 25];
        for (const floor of bossFloors) {
            const btn = document.createElement('button');
            btn.textContent = `F${floor}`;
            btn.title = floor === 5 ? 'Bone Sovereign' : floor === 10 ? 'Sporemind' : floor === 15 ? 'Iron Warden' : floor === 20 ? 'Ember Tyrant' : 'Void Architect';
            btn.style.cssText = `
                flex: 1; padding: 6px 4px; min-width: 50px;
                background: #2a1a1a; color: #ff6644; border: 1px solid #ff4444;
                font-family: monospace; font-size: 11px; cursor: pointer;
                border-radius: 3px;
            `;
            btn.onmouseenter = () => { btn.style.background = '#3a2a2a'; };
            btn.onmouseleave = () => { btn.style.background = '#2a1a1a'; };
            btn.onclick = () => { floorInput.value = floor; };
            quickBtns.appendChild(btn);
        }
        this.content.appendChild(quickBtns);

        const bossLabel = document.createElement('div');
        bossLabel.textContent = '↑ Boss floors (click to set)';
        bossLabel.style.cssText = 'color: #666; font-size: 9px; text-align: center; margin-bottom: 8px;';
        this.content.appendChild(bossLabel);

        // Teleport button
        const teleportBtn = this._pushButton('⚡ TELEPORT', () => {
            console.log('[DebugPanel] Teleport button clicked');
            const target = parseInt(floorInput.value, 10);
            if (isNaN(target) || target < 1 || target > 25) {
                alert('Invalid floor number (1-25)');
                return;
            }
            console.log('[DebugPanel] Teleporting to floor:', target);
            const success = db.teleportToFloor(target);
            console.log('[DebugPanel] Teleport result:', success);
            if (success) {
                this._flashButton(teleportBtn);
                // Hide panel since scene is restarting
                this.hide();
            }
        });
        teleportBtn.style.background = '#1a2233';
        teleportBtn.style.color = '#44aaff';
        teleportBtn.style.borderColor = '#44aaff';
        this.content.appendChild(teleportBtn);

        this.content.appendChild(document.createElement('hr'));

        // Section: Cheats
        const cheatTitle = document.createElement('div');
        cheatTitle.textContent = '🎮 CHEATS';
        cheatTitle.style.cssText = 'color: #44ff44; font-size: 13px; font-weight: bold; margin: 10px 0; border-bottom: 1px solid #333; padding-bottom: 4px;';
        this.content.appendChild(cheatTitle);

        // God Mode toggle
        const godModeRow = document.createElement('div');
        godModeRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin: 8px 0;';
        const godModeLabel = document.createElement('span');
        godModeLabel.textContent = 'God Mode (Invincible)';
        godModeLabel.style.cssText = 'color: #aaa; font-size: 11px;';
        const godModeBtn = document.createElement('button');
        godModeBtn.textContent = db.isGodMode() ? '[ON]' : '[OFF]';
        godModeBtn.style.cssText = `
            padding: 4px 12px; background: ${db.isGodMode() ? '#224422' : '#222'};
            color: ${db.isGodMode() ? '#44ff44' : '#888'}; border: 1px solid #444;
            font-family: monospace; cursor: pointer; border-radius: 3px;
        `;
        godModeBtn.onclick = () => {
            const isOn = db.toggleGodMode();
            godModeBtn.textContent = isOn ? '[ON]' : '[OFF]';
            godModeBtn.style.background = isOn ? '#224422' : '#222';
            godModeBtn.style.color = isOn ? '#44ff44' : '#888';
        };
        godModeRow.appendChild(godModeLabel);
        godModeRow.appendChild(godModeBtn);
        this.content.appendChild(godModeRow);

        // Full Heal button
        const healBtn = this._pushButton('💚 Full Heal + Mana', () => {
            console.log('[DebugPanel] Full Heal button clicked');
            db.fullHeal();
            this._flashButton(healBtn);
        });
        healBtn.style.marginTop = '4px';
        this.content.appendChild(healBtn);

        // Give Gold
        const goldRow = document.createElement('div');
        goldRow.style.cssText = 'display: flex; gap: 8px; margin-top: 8px;';
        const goldInput = document.createElement('input');
        goldInput.type = 'number';
        goldInput.value = 1000;
        goldInput.style.cssText = `
            flex: 1; padding: 4px 6px; background: #1a1a2e; color: #ffdd00;
            border: 1px solid #444; font-family: monospace; border-radius: 3px;
        `;
        const goldBtn = document.createElement('button');
        goldBtn.textContent = '💰 Give Gold';
        goldBtn.style.cssText = `
            padding: 4px 10px; background: #2a2a1a; color: #ffdd00;
            border: 1px solid #ffaa00; font-family: monospace; cursor: pointer;
            border-radius: 3px;
        `;
        goldBtn.onclick = () => {
            db.giveGold(parseInt(goldInput.value, 10) || 0);
            this._flashButton(goldBtn);
        };
        goldRow.appendChild(goldInput);
        goldRow.appendChild(goldBtn);
        this.content.appendChild(goldRow);
    }

    // ── Features Tab ───────────────────────────────────────────────────────

    _renderFeaturesTab() {
        const FF = window.FeatureFlags;
        if (!FF) {
            this.content.innerHTML = '<div style="color:#ff4444; padding: 16px;">FeatureFlags not loaded</div>';
            return;
        }

        // Map of flag key → { label, implemented }
        // Set implemented: true only for flags that have working code behind them.
        const sections = [
            {
                title: 'GRAPHICS & VISUALS',
                color: '#44aaff',
                flags: [
                    { key: 'SCREEN_SHAKE',        label: 'Screen Shake on Hits',        implemented: true  },
                    { key: 'DAMAGE_VIGNETTE',     label: 'Red Vignette on Player Hit',  implemented: true  },
                    { key: 'DEATH_PARTICLES',     label: 'Particle Burst on Kill',      implemented: true  },
                    { key: 'HIT_PARTICLES',       label: 'Spark Particles on Impact',   implemented: true  },
                    { key: 'DODGE_IFRAME_AURA',   label: 'Iframe Aura on Dodge',        implemented: true  },
                    { key: 'PROJECTILE_GLOW',     label: 'Projectile Glow Ring',        implemented: false },
                    { key: 'STATUS_EFFECT_AURA',  label: 'Status Aura on Entities',     implemented: false },
                    { key: 'BIOME_COLOR_GRADING', label: 'Biome Color Grading (CRT)',   implemented: true  },
                    { key: 'BOSS_PHASE_VFX',      label: 'Boss Phase Transition VFX',   implemented: true  },
                ],
            },
            {
                title: 'COMBAT FEEL',
                color: '#ff6644',
                flags: [
                    { key: 'HIT_STOP',               label: 'Hit Stop (Physics Pause)',  implemented: false },
                    { key: 'CRIT_SYSTEM',             label: 'Crit Rolls + Gold Numbers', implemented: true  },
                    { key: 'HITSTUN',                 label: 'Hitstun on Knockback',      implemented: false },
                    { key: 'DYNAMIC_DAMAGE_NUMBERS',  label: 'Dynamic Damage Numbers',    implemented: true  },
                ],
            },
            {
                title: 'UX & POLISH',
                color: '#44ff88',
                flags: [
                    { key: 'WEAPON_SWAP_SFX',       label: 'Weapon Swap SFX',           implemented: true  },
                    { key: 'BOSS_ENTRANCE',          label: 'Boss Entrance Sequence',    implemented: true  },
                    { key: 'FLOOR_TRANSITION_SCREEN',label: 'Floor Transition Summary',  implemented: true  },
                    { key: 'TUTORIAL_HINTS',         label: 'Context Hints (New Player)',implemented: true  },
                    { key: 'LOW_HEALTH_HEARTBEAT',   label: 'Low HP Heartbeat Audio',    implemented: true  },
                    { key: 'WEAPON_LEVELUP_FANFARE', label: 'Weapon Level-Up Fanfare',   implemented: true  },
                ],
            },
            {
                title: 'CONTENT & DESIGN',
                color: '#ffaa00',
                flags: [
                    { key: 'EVENT_ROOMS',           label: 'Random Event Rooms',        implemented: false },
                    { key: 'SHOP_VARIETY',          label: 'Shop Archetypes',           implemented: false },
                    { key: 'FLOOR_DIFFICULTY_SCALE',label: 'Floor Difficulty Scaling',  implemented: true  },
                    { key: 'LOOT_PITY',             label: 'Loot Pity Counter',         implemented: true  },
                    { key: 'ASCENSION_PERKS',       label: 'Class Ascension Perks',     implemented: false },
                ],
            },
        ];

        // ── All ON / All OFF bulk buttons ──────────────────────────────────
        const bulkRow = document.createElement('div');
        bulkRow.style.cssText = `
            display: flex; gap: 8px; margin-bottom: 10px; padding-bottom: 10px;
            border-bottom: 1px solid #444;
        `;

        const allImplemented = sections.flatMap(s => s.flags.filter(f => f.implemented).map(f => f.key));

        const makeAllBtn = (label, color, value) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.cssText = `
                flex: 1; padding: 5px 0; background: ${color}; color: #000;
                border: none; border-radius: 3px; font-size: 11px; font-weight: bold;
                cursor: pointer; font-family: monospace; letter-spacing: 1px;
            `;
            btn.onclick = () => {
                for (const key of allImplemented) FF[key] = value;
                this._renderTab(); // re-render to update all toggles
            };
            return btn;
        };

        bulkRow.appendChild(makeAllBtn('ALL ON',  '#44ff88', true));
        bulkRow.appendChild(makeAllBtn('ALL OFF', '#ff6644', false));
        this.content.appendChild(bulkRow);

        for (const section of sections) {
            // Section header
            const title = document.createElement('div');
            title.textContent = section.title;
            title.style.cssText = `
                color: ${section.color}; font-size: 11px; font-weight: bold;
                margin: 12px 0 6px; border-bottom: 1px solid #333; padding-bottom: 3px;
                letter-spacing: 1px;
            `;
            this.content.appendChild(title);

            for (const flag of section.flags) {
                this.content.appendChild(
                    this._featureToggleRow(FF, flag.key, flag.label, flag.implemented)
                );
            }
        }
    }

    /**
     * Build one feature toggle row.
     * @param {object} FF - FeatureFlags reference
     * @param {string} key - Flag key
     * @param {string} label - Human-readable label
     * @param {boolean} implemented - Whether the feature has working code
     */
    _featureToggleRow(FF, key, label, implemented) {
        const row = document.createElement('div');
        row.style.cssText = `
            display: flex; align-items: center; justify-content: space-between;
            margin: 4px 0; padding: 4px 6px; border-radius: 3px;
            background: ${implemented ? 'rgba(255,255,255,0.03)' : 'transparent'};
        `;

        const lbl = document.createElement('span');
        lbl.textContent = label;
        lbl.style.cssText = `
            font-size: 11px;
            color: ${implemented ? '#ccc' : '#444'};
            flex: 1; padding-right: 8px;
        `;

        const btn = document.createElement('button');

        if (!implemented) {
            btn.textContent = 'SOON';
            btn.disabled = true;
            btn.style.cssText = `
                padding: 2px 10px; background: #111; color: #333;
                border: 1px solid #2a2a2a; font-family: monospace; font-size: 10px;
                border-radius: 3px; cursor: default; min-width: 54px;
            `;
        } else {
            const isOn = !!FF[key];
            btn.textContent = isOn ? 'ON' : 'OFF';
            btn.style.cssText = this._toggleBtnCss(isOn);

            btn.onclick = () => {
                FF[key] = !FF[key];
                const nowOn = FF[key];
                btn.textContent = nowOn ? 'ON' : 'OFF';
                btn.style.cssText = this._toggleBtnCss(nowOn);
                row.style.background = nowOn
                    ? 'rgba(68,255,136,0.07)'
                    : 'rgba(255,255,255,0.03)';
            };
        }

        row.appendChild(lbl);
        row.appendChild(btn);
        return row;
    }

    _toggleBtnCss(isOn) {
        return `
            padding: 2px 10px; min-width: 54px; text-align: center;
            background: ${isOn ? '#1a3322' : '#1a1a1a'};
            color: ${isOn ? '#44ff88' : '#666'};
            border: 1px solid ${isOn ? '#44ff88' : '#444'};
            font-family: monospace; font-size: 11px; font-weight: bold;
            border-radius: 3px; cursor: pointer;
        `;
    }

    // ── Readback ───────────────────────────────────────────────────────────

    _updateReadback() {
        const db = window.GAUNTLET_DEBUG;
        if (!db) return;

        const player = db.getPlayer();
        const enemies = db.getEnemies();

        let html = '<b style="color:#ffdd00">LIVE STATS</b><br>';
        if (player && player.alive) {
            html += `<span style="color:#44ff44">Player (${player.classKey})</span>: `;
            html += `ATK=${player.attackPower} DEF=${player.defense} `;
            html += `HP=${player.hp}/${player.maxHp} SPD=${player.attackSpeedRate}<br>`;
        } else {
            html += '<span style="color:#666">No active player</span><br>';
        }
        html += `Enemies alive: ${enemies.filter(e => e.alive).length}`;

        this.readback.innerHTML = html;
    }

    // ── Toggle / Show / Hide ───────────────────────────────────────────────

    _bindToggle() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'g' || e.key === 'G') {
                e.preventDefault();
                e.stopPropagation();
                this.visible ? this.hide() : this.show();
            }
        });
    }

    show() {
        this.visible = true;
        this.panel.style.display = 'block';
        this._renderTab();
        this._updateReadback();
        this._readbackInterval = setInterval(() => this._updateReadback(), 500);
    }

    hide() {
        this.visible = false;
        this.panel.style.display = 'none';
        if (this._readbackInterval) {
            clearInterval(this._readbackInterval);
            this._readbackInterval = null;
        }
    }

    // ── UI Helpers ─────────────────────────────────────────────────────────

    _label(text) {
        const lbl = document.createElement('div');
        lbl.textContent = text;
        lbl.style.cssText = 'color: #aaa; margin: 8px 0 4px; font-size: 11px;';
        return lbl;
    }

    _createSelect(options, selected, onChange) {
        const sel = document.createElement('select');
        sel.style.cssText = `
            width: 100%; padding: 4px 6px; margin-bottom: 4px;
            background: #1a1a2e; color: #ffdd00; border: 1px solid #444;
            font-family: monospace; font-size: 12px; border-radius: 3px;
        `;
        for (const opt of options) {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
            if (opt === selected) o.selected = true;
            sel.appendChild(o);
        }
        if (onChange) sel.addEventListener('change', () => onChange(sel.value));
        return sel;
    }

    _sliderRow({ key, label, min, max, step, value }) {
        const container = document.createElement('div');
        container.style.cssText = 'margin: 6px 0;';

        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;';

        const lbl = document.createElement('span');
        lbl.textContent = label;
        lbl.style.cssText = 'color: #aaa; font-size: 11px;';

        const numInput = document.createElement('input');
        numInput.type = 'number';
        numInput.min = min;
        numInput.max = max;
        numInput.step = step;
        numInput.value = value;
        numInput.style.cssText = `
            width: 70px; padding: 2px 4px;
            background: #111; color: #ffdd00; border: 1px solid #444;
            font-family: monospace; font-size: 12px; text-align: right;
            border-radius: 3px;
        `;

        header.appendChild(lbl);
        header.appendChild(numInput);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = value;
        slider.style.cssText = 'width: 100%; accent-color: #ffdd00;';

        // Sync slider <-> number input
        slider.addEventListener('input', () => { numInput.value = slider.value; });
        numInput.addEventListener('input', () => { slider.value = numInput.value; });

        container.appendChild(header);
        container.appendChild(slider);

        return { container, input: numInput, slider };
    }

    _pushButton(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            display: block; width: 100%; margin: 12px 0 6px; padding: 8px;
            background: #223322; color: #44ff44; border: 1px solid #44ff44;
            font-family: monospace; font-size: 13px; cursor: pointer;
            border-radius: 4px; transition: background 0.15s;
        `;
        btn.onmouseenter = () => { btn.style.background = '#335533'; };
        btn.onmouseleave = () => { btn.style.background = '#223322'; };
        btn.onclick = onClick;
        return btn;
    }

    _flashButton(btn) {
        btn.style.background = '#44ff44';
        btn.style.color = '#000';
        setTimeout(() => {
            btn.style.background = '#223322';
            btn.style.color = '#44ff44';
        }, 200);
    }
}
