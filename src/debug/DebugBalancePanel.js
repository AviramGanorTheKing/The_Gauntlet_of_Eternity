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
        for (const tab of ['players', 'enemies', 'global']) {
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
