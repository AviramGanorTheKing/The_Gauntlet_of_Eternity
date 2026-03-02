/**
 * ProceduralAudio — generates all SFX and music using Web Audio API.
 * No external audio files needed. Everything is synthesized at boot.
 *
 * Call generateAllAudio(scene) in BootScene to populate Phaser's audio cache.
 */

const PI2 = Math.PI * 2;

// ═══════════════════════════════════════════════════════════════════════════════
//  CORE SYNTHESIS
// ═══════════════════════════════════════════════════════════════════════════════

function midiFreq(n) { return 440 * Math.pow(2, (n - 69) / 12); }
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v) { return Math.max(-1, Math.min(1, v)); }

const W = {
    sine: p => Math.sin(p * PI2),
    square: p => (p % 1) < 0.5 ? 0.8 : -0.8,
    triangle: p => { const v = p % 1; return v < 0.5 ? 4 * v - 1 : 3 - 4 * v; },
    sawtooth: p => 2 * (p % 1) - 1,
    noise: () => Math.random() * 2 - 1,
};

/** Create an AudioBuffer from a sample generator function. */
function makeBuffer(ctx, duration, genFn) {
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * duration);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
        data[i] = clamp(genFn(i / sr, i / len));
    }
    return buf;
}

/** Synthesize a sound from layer definitions. */
function synth(ctx, dur, layers) {
    return makeBuffer(ctx, dur, (t, p) => {
        let s = 0;
        for (const L of layers) {
            const ls = L.t0 || 0, le = L.t1 || 1;
            if (p < ls || p > le) continue;
            const lp = (p - ls) / (le - ls);
            const freq = lerp(L.f0 || 440, L.f1 ?? L.f0, lp);
            const vol = lerp(L.v0 ?? 0.5, L.v1 ?? 0, lp);
            // Envelope
            let env = 1;
            const atk = L.a || 0.01, rel = L.r || 0.1;
            if (lp < atk) env = lp / atk;
            else if (lp > 1 - rel) env = (1 - lp) / rel;
            const w = L.w || 'square';
            s += (w === 'noise' ? W.noise() : W[w](t * freq)) * vol * env;
        }
        return s;
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SFX DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

function generateSFX(ctx) {
    const sfx = {};

    // ── Combat ──────────────────────────────────────────────────────────────
    sfx.sfx_sword_swing = synth(ctx, 0.15, [
        { w: 'noise', f0: 800, f1: 200, v0: 0.35, v1: 0, a: 0.01, r: 0.3 },
        { w: 'sawtooth', f0: 300, f1: 100, v0: 0.15, v1: 0, a: 0.01, r: 0.2 },
    ]);
    sfx.sfx_hit = synth(ctx, 0.12, [
        { w: 'noise', f0: 400, f1: 80, v0: 0.5, v1: 0, a: 0.001, r: 0.3 },
        { w: 'square', f0: 200, f1: 60, v0: 0.25, v1: 0, a: 0.001, r: 0.2 },
    ]);
    sfx.sfx_arrow_fire = synth(ctx, 0.1, [
        { w: 'triangle', f0: 1200, f1: 600, v0: 0.3, v1: 0, a: 0.01, r: 0.4 },
        { w: 'noise', f0: 2000, f1: 500, v0: 0.15, v1: 0, a: 0.01, r: 0.5 },
    ]);
    sfx.sfx_magic_cast = synth(ctx, 0.3, [
        { w: 'sine', f0: 400, f1: 1200, v0: 0.25, v1: 0.1, a: 0.05, r: 0.3 },
        { w: 'triangle', f0: 800, f1: 1600, v0: 0.15, v1: 0, a: 0.1, r: 0.2, t0: 0.1 },
        { w: 'noise', f0: 3000, f1: 1000, v0: 0.08, v1: 0, a: 0.01, r: 0.5 },
    ]);
    sfx.sfx_dodge = synth(ctx, 0.18, [
        { w: 'noise', f0: 1500, f1: 300, v0: 0.25, v1: 0, a: 0.02, r: 0.4 },
    ]);
    sfx.sfx_enemy_death = synth(ctx, 0.25, [
        { w: 'square', f0: 400, f1: 80, v0: 0.3, v1: 0, a: 0.01, r: 0.2 },
        { w: 'noise', f0: 600, f1: 100, v0: 0.3, v1: 0, a: 0.01, r: 0.3 },
    ]);
    sfx.sfx_player_hit = synth(ctx, 0.15, [
        { w: 'noise', f0: 300, f1: 60, v0: 0.5, v1: 0, a: 0.001, r: 0.3 },
        { w: 'sine', f0: 150, f1: 40, v0: 0.3, v1: 0, a: 0.001, r: 0.2 },
    ]);
    sfx.sfx_explosion = synth(ctx, 0.4, [
        { w: 'noise', f0: 500, f1: 40, v0: 0.6, v1: 0, a: 0.001, r: 0.15 },
        { w: 'sine', f0: 80, f1: 30, v0: 0.4, v1: 0, a: 0.01, r: 0.1 },
    ]);
    sfx.sfx_critical_hit = synth(ctx, 0.2, [
        { w: 'square', f0: 600, f1: 150, v0: 0.4, v1: 0, a: 0.001, r: 0.2 },
        { w: 'noise', f0: 800, f1: 100, v0: 0.4, v1: 0, a: 0.001, r: 0.25 },
        { w: 'sine', f0: 1200, f1: 400, v0: 0.15, v1: 0, a: 0.01, r: 0.3, t0: 0.05 },
    ]);

    // ── Pickups ─────────────────────────────────────────────────────────────
    sfx.sfx_gold = synth(ctx, 0.1, [
        { w: 'triangle', f0: 1800, f1: 2200, v0: 0.2, v1: 0, a: 0.01, r: 0.3 },
        { w: 'sine', f0: 2400, f1: 2800, v0: 0.1, v1: 0, a: 0.01, r: 0.4, t0: 0.1 },
    ]);
    sfx.sfx_potion = synth(ctx, 0.2, [
        { w: 'sine', f0: 600, f1: 900, v0: 0.2, v1: 0.1, a: 0.05, r: 0.3 },
        { w: 'sine', f0: 300, f1: 500, v0: 0.1, v1: 0, a: 0.1, r: 0.2, t0: 0.15 },
    ]);
    sfx.sfx_gear_common = synth(ctx, 0.12, [
        { w: 'triangle', f0: 800, f1: 1000, v0: 0.2, v1: 0, a: 0.01, r: 0.3 },
    ]);
    sfx.sfx_gear_rare = synth(ctx, 0.25, [
        { w: 'triangle', f0: 800, f1: 1000, v0: 0.2, v1: 0.1, a: 0.01, r: 0.2, t0: 0, t1: 0.35 },
        { w: 'triangle', f0: 1000, f1: 1200, v0: 0.2, v1: 0.1, a: 0.01, r: 0.2, t0: 0.35, t1: 0.65 },
        { w: 'triangle', f0: 1200, f1: 1500, v0: 0.2, v1: 0, a: 0.01, r: 0.3, t0: 0.65, t1: 1 },
    ]);
    sfx.sfx_gear_legendary = synth(ctx, 0.5, [
        { w: 'square', f0: 523, f1: 523, v0: 0.15, v1: 0.05, a: 0.01, r: 0.15, t0: 0, t1: 0.25 },
        { w: 'square', f0: 659, f1: 659, v0: 0.15, v1: 0.05, a: 0.01, r: 0.15, t0: 0.25, t1: 0.5 },
        { w: 'square', f0: 784, f1: 784, v0: 0.15, v1: 0.05, a: 0.01, r: 0.15, t0: 0.5, t1: 0.75 },
        { w: 'triangle', f0: 1047, f1: 1047, v0: 0.2, v1: 0, a: 0.01, r: 0.2, t0: 0.7 },
        { w: 'sine', f0: 784, f1: 784, v0: 0.1, v1: 0, a: 0.01, r: 0.3, t0: 0.7 },
    ]);
    sfx.sfx_chest_open = synth(ctx, 0.3, [
        { w: 'noise', f0: 200, f1: 400, v0: 0.15, v1: 0, a: 0.1, r: 0.2, t0: 0, t1: 0.5 },
        { w: 'triangle', f0: 600, f1: 1200, v0: 0.2, v1: 0, a: 0.05, r: 0.3, t0: 0.3 },
    ]);
    sfx.sfx_heal = synth(ctx, 0.35, [
        { w: 'sine', f0: 400, f1: 800, v0: 0.2, v1: 0.1, a: 0.05, r: 0.2, t0: 0, t1: 0.5 },
        { w: 'sine', f0: 600, f1: 1000, v0: 0.15, v1: 0, a: 0.05, r: 0.3, t0: 0.3 },
        { w: 'triangle', f0: 800, f1: 1200, v0: 0.1, v1: 0, a: 0.1, r: 0.3, t0: 0.5 },
    ]);

    // ── UI ──────────────────────────────────────────────────────────────────
    sfx.sfx_menu_select = synth(ctx, 0.06, [
        { w: 'square', f0: 1200, f1: 1400, v0: 0.15, v1: 0, a: 0.01, r: 0.3 },
    ]);
    sfx.sfx_menu_confirm = synth(ctx, 0.12, [
        { w: 'square', f0: 800, f1: 800, v0: 0.15, v1: 0.05, a: 0.01, r: 0.2, t0: 0, t1: 0.45 },
        { w: 'square', f0: 1200, f1: 1200, v0: 0.15, v1: 0, a: 0.01, r: 0.3, t0: 0.45 },
    ]);
    sfx.sfx_menu_cancel = synth(ctx, 0.12, [
        { w: 'square', f0: 600, f1: 600, v0: 0.15, v1: 0.05, a: 0.01, r: 0.2, t0: 0, t1: 0.45 },
        { w: 'square', f0: 300, f1: 300, v0: 0.15, v1: 0, a: 0.01, r: 0.3, t0: 0.45 },
    ]);
    sfx.sfx_equip = synth(ctx, 0.1, [
        { w: 'triangle', f0: 1000, f1: 1200, v0: 0.2, v1: 0, a: 0.01, r: 0.3 },
        { w: 'noise', f0: 2000, f1: 1000, v0: 0.08, v1: 0, a: 0.01, r: 0.4 },
    ]);
    sfx.sfx_level_up = synth(ctx, 0.5, [
        { w: 'square', f0: 523, f1: 523, v0: 0.12, v1: 0.05, a: 0.01, r: 0.1, t0: 0, t1: 0.2 },
        { w: 'square', f0: 659, f1: 659, v0: 0.12, v1: 0.05, a: 0.01, r: 0.1, t0: 0.2, t1: 0.4 },
        { w: 'square', f0: 784, f1: 784, v0: 0.12, v1: 0.05, a: 0.01, r: 0.1, t0: 0.4, t1: 0.6 },
        { w: 'square', f0: 1047, f1: 1047, v0: 0.15, v1: 0, a: 0.01, r: 0.2, t0: 0.6, t1: 1 },
        { w: 'triangle', f0: 784, f1: 784, v0: 0.08, v1: 0, a: 0.05, r: 0.3, t0: 0.6, t1: 1 },
    ]);
    sfx.sfx_shard_earned = synth(ctx, 0.3, [
        { w: 'sine', f0: 1200, f1: 1800, v0: 0.15, v1: 0, a: 0.05, r: 0.3 },
        { w: 'triangle', f0: 1600, f1: 2200, v0: 0.08, v1: 0, a: 0.1, r: 0.2, t0: 0.1 },
    ]);
    sfx.sfx_typewriter = synth(ctx, 0.03, [
        { w: 'noise', f0: 3000, f1: 1500, v0: 0.12, v1: 0, a: 0.01, r: 0.5 },
    ]);
    sfx.sfx_pause_open = synth(ctx, 0.15, [
        { w: 'sine', f0: 300, f1: 500, v0: 0.15, v1: 0, a: 0.05, r: 0.3 },
    ]);
    sfx.sfx_pause_close = synth(ctx, 0.12, [
        { w: 'sine', f0: 500, f1: 300, v0: 0.15, v1: 0, a: 0.01, r: 0.3 },
    ]);

    // ── Environmental ───────────────────────────────────────────────────────
    sfx.sfx_shrine = synth(ctx, 0.5, [
        { w: 'sine', f0: 600, f1: 800, v0: 0.15, v1: 0.05, a: 0.15, r: 0.3, t0: 0, t1: 0.6 },
        { w: 'sine', f0: 900, f1: 1200, v0: 0.1, v1: 0, a: 0.1, r: 0.3, t0: 0.3 },
        { w: 'triangle', f0: 1200, f1: 1500, v0: 0.06, v1: 0, a: 0.2, r: 0.3, t0: 0.4 },
    ]);
    sfx.sfx_secret = synth(ctx, 0.4, [
        { w: 'triangle', f0: 800, f1: 1200, v0: 0.15, v1: 0.08, a: 0.05, r: 0.2, t0: 0, t1: 0.5 },
        { w: 'sine', f0: 1200, f1: 1600, v0: 0.12, v1: 0, a: 0.05, r: 0.3, t0: 0.3 },
    ]);
    sfx.sfx_stairs = synth(ctx, 0.4, [
        { w: 'sine', f0: 400, f1: 150, v0: 0.2, v1: 0, a: 0.05, r: 0.2 },
        { w: 'triangle', f0: 300, f1: 100, v0: 0.1, v1: 0, a: 0.1, r: 0.15 },
    ]);
    sfx.sfx_trap = synth(ctx, 0.15, [
        { w: 'square', f0: 800, f1: 400, v0: 0.3, v1: 0, a: 0.001, r: 0.2 },
        { w: 'noise', f0: 1500, f1: 500, v0: 0.2, v1: 0, a: 0.001, r: 0.3 },
    ]);
    sfx.sfx_door = synth(ctx, 0.3, [
        { w: 'noise', f0: 200, f1: 100, v0: 0.15, v1: 0, a: 0.05, r: 0.2 },
        { w: 'sine', f0: 80, f1: 60, v0: 0.15, v1: 0, a: 0.1, r: 0.15 },
    ]);
    sfx.sfx_boss_appear = synth(ctx, 0.8, [
        { w: 'sine', f0: 60, f1: 40, v0: 0.3, v1: 0.1, a: 0.1, r: 0.15, t0: 0, t1: 0.5 },
        { w: 'sawtooth', f0: 100, f1: 200, v0: 0.15, v1: 0, a: 0.2, r: 0.2, t0: 0.3, t1: 0.8 },
        { w: 'noise', f0: 300, f1: 100, v0: 0.15, v1: 0, a: 0.1, r: 0.15, t0: 0.5, t1: 1 },
        { w: 'square', f0: 150, f1: 100, v0: 0.1, v1: 0, a: 0.3, r: 0.2, t0: 0.4 },
    ]);
    sfx.sfx_spawner_destroy = synth(ctx, 0.3, [
        { w: 'noise', f0: 600, f1: 80, v0: 0.4, v1: 0, a: 0.001, r: 0.2 },
        { w: 'square', f0: 300, f1: 50, v0: 0.2, v1: 0, a: 0.01, r: 0.15 },
    ]);

    return sfx;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ANNOUNCER SOUND DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

function generateAnnouncerSounds(ctx) {
    const snd = {};

    snd.announcer_health_warning = synth(ctx, 0.3, [
        { w: 'square', f0: 600, f1: 800, v0: 0.2, v1: 0.1, a: 0.01, r: 0.2, t0: 0, t1: 0.4 },
        { w: 'square', f0: 800, f1: 600, v0: 0.2, v1: 0, a: 0.01, r: 0.3, t0: 0.4 },
    ]);
    snd.announcer_health_critical = synth(ctx, 0.4, [
        { w: 'square', f0: 800, f1: 1000, v0: 0.25, v1: 0.1, a: 0.01, r: 0.1, t0: 0, t1: 0.25 },
        { w: 'square', f0: 1000, f1: 800, v0: 0.25, v1: 0.1, a: 0.01, r: 0.1, t0: 0.25, t1: 0.5 },
        { w: 'square', f0: 800, f1: 1000, v0: 0.25, v1: 0.1, a: 0.01, r: 0.1, t0: 0.5, t1: 0.75 },
        { w: 'square', f0: 1000, f1: 800, v0: 0.25, v1: 0, a: 0.01, r: 0.2, t0: 0.75 },
    ]);
    snd.announcer_death = synth(ctx, 0.6, [
        { w: 'sine', f0: 200, f1: 60, v0: 0.3, v1: 0, a: 0.05, r: 0.1 },
        { w: 'triangle', f0: 150, f1: 40, v0: 0.15, v1: 0, a: 0.1, r: 0.1, t0: 0.1 },
    ]);
    snd.announcer_boss_encounter = synth(ctx, 0.6, [
        { w: 'sawtooth', f0: 100, f1: 200, v0: 0.2, v1: 0.1, a: 0.1, r: 0.2, t0: 0, t1: 0.5 },
        { w: 'square', f0: 200, f1: 300, v0: 0.15, v1: 0, a: 0.05, r: 0.3, t0: 0.3 },
        { w: 'noise', f0: 400, f1: 100, v0: 0.1, v1: 0, a: 0.1, r: 0.2, t0: 0.4 },
    ]);
    snd.announcer_boss_phase = synth(ctx, 0.3, [
        { w: 'square', f0: 400, f1: 800, v0: 0.2, v1: 0, a: 0.01, r: 0.3 },
        { w: 'triangle', f0: 600, f1: 1200, v0: 0.1, v1: 0, a: 0.05, r: 0.2, t0: 0.1 },
    ]);
    snd.announcer_boss_defeated = synth(ctx, 0.5, [
        { w: 'square', f0: 523, f1: 523, v0: 0.15, v1: 0.05, a: 0.01, r: 0.1, t0: 0, t1: 0.3 },
        { w: 'square', f0: 659, f1: 659, v0: 0.15, v1: 0.05, a: 0.01, r: 0.1, t0: 0.3, t1: 0.6 },
        { w: 'square', f0: 784, f1: 784, v0: 0.2, v1: 0, a: 0.01, r: 0.2, t0: 0.6 },
    ]);
    snd.announcer_secret = synth(ctx, 0.35, [
        { w: 'sine', f0: 800, f1: 1200, v0: 0.15, v1: 0.05, a: 0.05, r: 0.2, t0: 0, t1: 0.5 },
        { w: 'sine', f0: 1200, f1: 1600, v0: 0.12, v1: 0, a: 0.05, r: 0.3, t0: 0.4 },
    ]);
    snd.announcer_streak = synth(ctx, 0.25, [
        { w: 'triangle', f0: 1000, f1: 1500, v0: 0.2, v1: 0, a: 0.01, r: 0.2 },
    ]);
    snd.announcer_spawner = synth(ctx, 0.2, [
        { w: 'square', f0: 700, f1: 900, v0: 0.15, v1: 0, a: 0.01, r: 0.3 },
    ]);
    snd.announcer_treasure = synth(ctx, 0.3, [
        { w: 'triangle', f0: 1200, f1: 1600, v0: 0.15, v1: 0.05, a: 0.01, r: 0.2, t0: 0, t1: 0.5 },
        { w: 'triangle', f0: 1600, f1: 2000, v0: 0.12, v1: 0, a: 0.01, r: 0.3, t0: 0.4 },
    ]);
    snd.announcer_shrine = synth(ctx, 0.4, [
        { w: 'sine', f0: 500, f1: 700, v0: 0.12, v1: 0, a: 0.1, r: 0.3 },
        { w: 'sine', f0: 750, f1: 1000, v0: 0.08, v1: 0, a: 0.15, r: 0.2, t0: 0.2 },
    ]);
    snd.announcer_floor_deeper = synth(ctx, 0.35, [
        { w: 'sine', f0: 400, f1: 200, v0: 0.15, v1: 0, a: 0.05, r: 0.2 },
    ]);
    snd.announcer_floor_biome = synth(ctx, 0.4, [
        { w: 'triangle', f0: 300, f1: 600, v0: 0.15, v1: 0, a: 0.1, r: 0.2 },
        { w: 'sine', f0: 600, f1: 900, v0: 0.08, v1: 0, a: 0.15, r: 0.3, t0: 0.2 },
    ]);

    return snd;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MUSIC GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render a melodic track from note definitions.
 * @param {AudioContext} ctx
 * @param {number} totalDur - total buffer duration in seconds
 * @param {number} beatDur - seconds per beat
 * @param {string} waveType - 'square'|'triangle'|'sine'|'sawtooth'
 * @param {Array} notes - [[beat, midiNote, durationBeats, volume], ...]
 */
function renderMelodic(ctx, totalDur, beatDur, waveType, notes) {
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * totalDur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    const wfn = W[waveType] || W.square;

    for (const [beat, midi, durBeats, vol] of notes) {
        const freq = midiFreq(midi);
        const startSec = beat * beatDur;
        const noteDur = durBeats * beatDur;
        const startIdx = Math.floor(startSec * sr);
        const noteLen = Math.floor(noteDur * sr);

        for (let i = 0; i < noteLen && (startIdx + i) < len; i++) {
            const t = i / sr;
            const p = i / noteLen;
            // ADSR: quick attack, short decay to sustain, release at end
            let env;
            const atk = 0.01, rel = 0.08;
            if (p < atk) env = p / atk;
            else if (p > 1 - rel) env = (1 - p) / rel;
            else env = 0.8;
            data[startIdx + i] += wfn((startSec + t) * freq) * vol * env;
        }
    }

    // Tiny fade at loop boundaries to prevent clicks
    const fade = Math.min(Math.floor(sr * 0.005), len);
    for (let i = 0; i < fade; i++) {
        const f = i / fade;
        data[i] *= f;
        data[len - 1 - i] *= f;
    }

    // Clamp
    for (let i = 0; i < len; i++) data[i] = clamp(data[i]);
    return buf;
}

/**
 * Render a percussion track from hit definitions.
 * @param {AudioContext} ctx
 * @param {number} totalDur
 * @param {number} beatDur
 * @param {Array} hits - [[beat, 'kick'|'hat'|'snare', volume], ...]
 */
function renderPercussion(ctx, totalDur, beatDur, hits) {
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * totalDur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    for (const [beat, type, vol] of hits) {
        const startSec = beat * beatDur;
        const startIdx = Math.floor(startSec * sr);

        if (type === 'kick') {
            // Low-frequency noise + sine sweep
            const durSamples = Math.floor(sr * 0.12);
            for (let i = 0; i < durSamples && (startIdx + i) < len; i++) {
                const t = i / sr;
                const p = i / durSamples;
                const env = p < 0.01 ? p / 0.01 : Math.pow(1 - p, 3);
                const freq = lerp(150, 40, p);
                data[startIdx + i] += (Math.sin(PI2 * freq * t) * 0.7 + W.noise() * 0.3) * vol * env;
            }
        } else if (type === 'hat') {
            // High-frequency noise
            const durSamples = Math.floor(sr * 0.04);
            for (let i = 0; i < durSamples && (startIdx + i) < len; i++) {
                const p = i / durSamples;
                const env = Math.pow(1 - p, 5);
                data[startIdx + i] += W.noise() * vol * env * 0.5;
            }
        } else if (type === 'snare') {
            // Noise burst + mid tone
            const durSamples = Math.floor(sr * 0.08);
            for (let i = 0; i < durSamples && (startIdx + i) < len; i++) {
                const t = i / sr;
                const p = i / durSamples;
                const env = Math.pow(1 - p, 2.5);
                data[startIdx + i] += (W.noise() * 0.6 + Math.sin(PI2 * 200 * t) * 0.4) * vol * env;
            }
        }
    }

    // Loop fade
    const fade = Math.min(Math.floor(sr * 0.005), len);
    for (let i = 0; i < fade; i++) {
        data[i] *= i / fade;
        data[len - 1 - i] *= i / fade;
    }
    for (let i = 0; i < len; i++) data[i] = clamp(data[i]);
    return buf;
}

// ── Biome Music Definitions ────────────────────────────────────────────────

const BIOME_DEFS = {
    crypt: {
        bpm: 80, beats: 16,
        ambient: { wave: 'triangle', notes: [
            [0, 36, 8, 0.12],    // C2 drone
            [8, 39, 8, 0.10],    // Eb2 drone
        ]},
        percussion: { hits: [
            [0, 'kick', 0.35], [4, 'kick', 0.25], [8, 'kick', 0.35], [12, 'kick', 0.25],
            [2, 'hat', 0.08], [6, 'hat', 0.08], [10, 'hat', 0.08], [14, 'hat', 0.08],
        ]},
        melody: { wave: 'square', notes: [
            [0, 60, 1.5, 0.12],  // C4
            [2, 63, 1, 0.10],    // Eb4
            [4, 65, 2, 0.12],    // F4
            [8, 67, 1.5, 0.12],  // G4
            [10, 70, 1, 0.10],   // Bb4
            [12, 67, 2, 0.12],   // G4
        ]},
    },
    caves: {
        bpm: 90, beats: 16,
        ambient: { wave: 'sine', notes: [
            [0, 38, 8, 0.10],    // D2 drone
            [8, 45, 8, 0.08],    // A2 drone
        ]},
        percussion: { hits: [
            [0, 'kick', 0.3], [3, 'hat', 0.06], [5, 'kick', 0.2],
            [8, 'kick', 0.3], [11, 'hat', 0.06], [13, 'kick', 0.2],
            [7, 'hat', 0.05], [15, 'hat', 0.05],
        ]},
        melody: { wave: 'triangle', notes: [
            [0, 62, 2, 0.10],    // D4
            [3, 65, 1.5, 0.08],  // F4
            [5, 69, 2, 0.10],    // A4
            [8, 67, 1.5, 0.10],  // G4
            [11, 64, 2, 0.08],   // E4
            [14, 62, 1, 0.08],   // D4
        ]},
    },
    fortress: {
        bpm: 110, beats: 16,
        ambient: { wave: 'sawtooth', notes: [
            [0, 40, 16, 0.06],   // E2 mechanical hum (low volume)
        ]},
        percussion: { hits: [
            [0, 'kick', 0.4], [2, 'snare', 0.3], [4, 'kick', 0.4], [6, 'snare', 0.3],
            [8, 'kick', 0.4], [10, 'snare', 0.3], [12, 'kick', 0.4], [14, 'snare', 0.3],
            [1, 'hat', 0.1], [3, 'hat', 0.1], [5, 'hat', 0.1], [7, 'hat', 0.1],
            [9, 'hat', 0.1], [11, 'hat', 0.1], [13, 'hat', 0.1], [15, 'hat', 0.1],
        ]},
        melody: { wave: 'square', notes: [
            [0, 64, 0.75, 0.12], // E4
            [1, 65, 0.75, 0.10], // F4
            [2, 69, 1.5, 0.12],  // A4
            [4, 67, 0.75, 0.10], // G4
            [5, 64, 1.5, 0.12],  // E4
            [8, 64, 0.75, 0.12], // E4
            [9, 65, 0.75, 0.10], // F4
            [10, 71, 1.5, 0.12], // B4
            [12, 69, 0.75, 0.10],// A4
            [13, 67, 2, 0.12],   // G4
        ]},
    },
    inferno: {
        bpm: 130, beats: 16,
        ambient: { wave: 'sine', notes: [
            [0, 33, 16, 0.10],   // A1 deep rumble
        ]},
        percussion: { hits: [
            [0, 'kick', 0.5], [1, 'kick', 0.3], [2, 'snare', 0.4],
            [4, 'kick', 0.5], [5, 'kick', 0.3], [6, 'snare', 0.4],
            [8, 'kick', 0.5], [9, 'kick', 0.3], [10, 'snare', 0.4],
            [12, 'kick', 0.5], [13, 'kick', 0.3], [14, 'snare', 0.4],
            [0.5, 'hat', 0.12], [1.5, 'hat', 0.12], [2.5, 'hat', 0.12], [3.5, 'hat', 0.12],
            [4.5, 'hat', 0.12], [5.5, 'hat', 0.12], [6.5, 'hat', 0.12], [7.5, 'hat', 0.12],
            [8.5, 'hat', 0.12], [9.5, 'hat', 0.12], [10.5, 'hat', 0.12], [11.5, 'hat', 0.12],
            [12.5, 'hat', 0.12], [13.5, 'hat', 0.12], [14.5, 'hat', 0.12], [15.5, 'hat', 0.12],
        ]},
        melody: { wave: 'sawtooth', notes: [
            [0, 69, 0.5, 0.12],  // A4
            [0.5, 71, 0.5, 0.10],// B4
            [1, 72, 1, 0.12],    // C5
            [3, 76, 1, 0.12],    // E5
            [4, 72, 0.5, 0.10],  // C5
            [5, 68, 1.5, 0.12],  // G#4
            [8, 69, 0.5, 0.12],  // A4
            [8.5, 72, 0.5, 0.10],// C5
            [9, 76, 1, 0.12],    // E5
            [11, 72, 0.5, 0.10], // C5
            [12, 69, 2, 0.12],   // A4
        ]},
    },
    abyss: {
        bpm: 70, beats: 16,
        ambient: { wave: 'triangle', notes: [
            [0, 36, 8, 0.08],    // C2 shifting
            [4, 42, 8, 0.06],    // F#2 (dissonance)
            [8, 34, 8, 0.08],    // Bb1
            [12, 39, 4, 0.06],   // Eb2
        ]},
        percussion: { hits: [
            [0, 'kick', 0.3], [8, 'kick', 0.25],
            [4, 'hat', 0.04], [12, 'hat', 0.04],
        ]},
        melody: { wave: 'sine', notes: [
            [0, 60, 3, 0.08],    // C4 (long, sparse)
            [4, 66, 2, 0.06],    // F#4
            [8, 63, 3, 0.08],    // Eb4
            [12, 70, 2, 0.06],   // Bb4
        ]},
    },
};

// ── Boss Theme Definitions ─────────────────────────────────────────────────

const BOSS_DEFS = {
    bone_sovereign: { bpm: 120, beats: 16, wave: 'square', notes: [
        // C minor, aggressive
        [0, 48, 0.5, 0.15], [0.5, 51, 0.5, 0.12], [1, 55, 1, 0.15],
        [2, 60, 0.5, 0.12], [2.5, 63, 0.5, 0.10], [3, 60, 1, 0.15],
        [4, 48, 0.5, 0.15], [4.5, 55, 0.5, 0.12], [5, 58, 1, 0.15],
        [6, 60, 0.5, 0.12], [7, 55, 1, 0.12],
        [8, 48, 0.5, 0.15], [8.5, 51, 0.5, 0.12], [9, 55, 1, 0.15],
        [10, 63, 0.5, 0.12], [10.5, 60, 0.5, 0.10], [11, 58, 1.5, 0.15],
        [13, 55, 0.5, 0.12], [14, 51, 1, 0.12], [15, 48, 1, 0.15],
    ], hits: [
        [0, 'kick', 0.5], [1, 'kick', 0.3], [2, 'snare', 0.4], [3, 'hat', 0.15],
        [4, 'kick', 0.5], [5, 'kick', 0.3], [6, 'snare', 0.4], [7, 'hat', 0.15],
        [8, 'kick', 0.5], [9, 'kick', 0.3], [10, 'snare', 0.4], [11, 'hat', 0.15],
        [12, 'kick', 0.5], [13, 'kick', 0.3], [14, 'snare', 0.4], [15, 'hat', 0.15],
    ]},
    sporemind: { bpm: 95, beats: 16, wave: 'triangle', notes: [
        // D dorian, unsettling
        [0, 50, 2, 0.10], [3, 53, 1.5, 0.08], [5, 57, 2, 0.10],
        [8, 55, 1.5, 0.10], [10, 53, 1, 0.08], [12, 50, 2, 0.10],
        [14, 48, 1.5, 0.08],
    ], hits: [
        [0, 'kick', 0.35], [3, 'hat', 0.08], [5, 'kick', 0.25],
        [8, 'kick', 0.35], [10, 'hat', 0.08], [13, 'kick', 0.25],
    ]},
    iron_warden: { bpm: 125, beats: 16, wave: 'square', notes: [
        // E phrygian, mechanical
        [0, 52, 0.5, 0.12], [0.5, 53, 0.5, 0.10], [1, 55, 0.5, 0.12],
        [1.5, 57, 0.5, 0.10], [2, 59, 1, 0.12],
        [4, 57, 0.5, 0.12], [4.5, 55, 0.5, 0.10], [5, 53, 0.5, 0.12],
        [5.5, 52, 0.5, 0.10], [6, 55, 1, 0.12],
        [8, 52, 0.5, 0.12], [8.5, 53, 0.5, 0.10], [9, 55, 0.5, 0.12],
        [9.5, 59, 0.5, 0.10], [10, 60, 1, 0.12],
        [12, 59, 0.5, 0.12], [12.5, 57, 0.5, 0.10], [13, 55, 1, 0.12],
        [14, 53, 0.5, 0.10], [14.5, 52, 1, 0.12],
    ], hits: [
        [0, 'kick', 0.5], [1, 'hat', 0.12], [2, 'snare', 0.4], [3, 'hat', 0.12],
        [4, 'kick', 0.5], [5, 'hat', 0.12], [6, 'snare', 0.4], [7, 'hat', 0.12],
        [8, 'kick', 0.5], [9, 'hat', 0.12], [10, 'snare', 0.4], [11, 'hat', 0.12],
        [12, 'kick', 0.5], [13, 'hat', 0.12], [14, 'snare', 0.4], [15, 'hat', 0.12],
    ]},
    ember_tyrant: { bpm: 145, beats: 16, wave: 'sawtooth', notes: [
        // A harmonic minor, intense
        [0, 57, 0.5, 0.12], [0.5, 59, 0.5, 0.10], [1, 60, 0.5, 0.12],
        [2, 64, 1, 0.14], [3, 60, 0.5, 0.10], [3.5, 56, 1, 0.12],
        [5, 57, 0.5, 0.12], [5.5, 60, 0.5, 0.10], [6, 64, 1, 0.14],
        [7, 68, 0.5, 0.10], [7.5, 64, 1, 0.12],
        [9, 60, 0.5, 0.12], [9.5, 57, 0.5, 0.10], [10, 56, 1, 0.12],
        [12, 57, 2, 0.14], [14, 60, 1, 0.12], [15, 57, 1, 0.10],
    ], hits: [
        [0, 'kick', 0.6], [0.5, 'kick', 0.3], [1, 'hat', 0.15],
        [2, 'snare', 0.5], [2.5, 'hat', 0.12], [3, 'kick', 0.4],
        [4, 'kick', 0.6], [4.5, 'kick', 0.3], [5, 'hat', 0.15],
        [6, 'snare', 0.5], [6.5, 'hat', 0.12], [7, 'kick', 0.4],
        [8, 'kick', 0.6], [8.5, 'kick', 0.3], [9, 'hat', 0.15],
        [10, 'snare', 0.5], [10.5, 'hat', 0.12], [11, 'kick', 0.4],
        [12, 'kick', 0.6], [12.5, 'kick', 0.3], [13, 'hat', 0.15],
        [14, 'snare', 0.5], [14.5, 'hat', 0.12], [15, 'kick', 0.4],
    ]},
    void_architect: { bpm: 85, beats: 16, wave: 'sine', notes: [
        // Whole tone, ethereal/terrifying
        [0, 60, 3, 0.10],    // C4
        [3, 66, 2, 0.08],    // F#4
        [6, 58, 1, 0.10],    // Bb3
        [8, 64, 3, 0.12],    // E4
        [11, 70, 2, 0.08],   // Bb4
        [14, 60, 2, 0.10],   // C4
    ], hits: [
        [0, 'kick', 0.4], [4, 'kick', 0.3], [8, 'kick', 0.4], [12, 'kick', 0.3],
        [6, 'snare', 0.25], [14, 'snare', 0.25],
    ]},
};

// ── Standalone Track Definitions ───────────────────────────────────────────

function generateStandaloneTracks(ctx) {
    const tracks = {};

    // Title theme: atmospheric, mysterious
    const titleBpm = 85;
    const titleBeatDur = 60 / titleBpm;
    const titleDur = 16 * titleBeatDur;
    const titleMelody = renderMelodic(ctx, titleDur, titleBeatDur, 'triangle', [
        [0, 60, 3, 0.10], [4, 63, 2, 0.08], [7, 67, 2, 0.10],
        [10, 65, 3, 0.08], [14, 60, 2, 0.10],
    ]);
    const titleAmbient = renderMelodic(ctx, titleDur, titleBeatDur, 'sine', [
        [0, 36, 8, 0.08], [8, 43, 8, 0.06],
    ]);
    // Mix title into single buffer
    tracks.music_title = mixBuffers(ctx, [titleMelody, titleAmbient], titleDur);

    // Shop theme: lighter, calm
    const shopBpm = 100;
    const shopBeatDur = 60 / shopBpm;
    const shopDur = 16 * shopBeatDur;
    tracks.music_shop = renderMelodic(ctx, shopDur, shopBeatDur, 'triangle', [
        [0, 67, 1, 0.12], [1, 72, 1, 0.10], [2, 69, 2, 0.12],
        [4, 67, 1, 0.10], [5, 65, 1, 0.10], [6, 67, 2, 0.12],
        [8, 72, 1, 0.12], [9, 74, 1, 0.10], [10, 72, 2, 0.12],
        [12, 69, 1, 0.10], [13, 67, 1, 0.10], [14, 65, 2, 0.12],
    ]);

    // Death jingle: short, somber
    const deathDur = 2.5;
    tracks.music_death_jingle = synth(ctx, deathDur, [
        { w: 'square', f0: midiFreq(60), f1: midiFreq(60), v0: 0.12, v1: 0.05, a: 0.05, r: 0.1, t0: 0, t1: 0.25 },
        { w: 'square', f0: midiFreq(58), f1: midiFreq(58), v0: 0.12, v1: 0.05, a: 0.05, r: 0.1, t0: 0.25, t1: 0.5 },
        { w: 'square', f0: midiFreq(55), f1: midiFreq(55), v0: 0.12, v1: 0.05, a: 0.05, r: 0.1, t0: 0.5, t1: 0.75 },
        { w: 'triangle', f0: midiFreq(48), f1: midiFreq(48), v0: 0.15, v1: 0, a: 0.05, r: 0.2, t0: 0.75, t1: 1 },
        { w: 'sine', f0: midiFreq(36), f1: midiFreq(36), v0: 0.1, v1: 0, a: 0.1, r: 0.1, t0: 0.5, t1: 1 },
    ]);

    // Victory fanfare: triumphant
    const vicDur = 3.5;
    tracks.music_victory_fanfare = synth(ctx, vicDur, [
        { w: 'square', f0: midiFreq(60), f1: midiFreq(60), v0: 0.12, v1: 0.05, a: 0.01, r: 0.1, t0: 0, t1: 0.15 },
        { w: 'square', f0: midiFreq(64), f1: midiFreq(64), v0: 0.12, v1: 0.05, a: 0.01, r: 0.1, t0: 0.15, t1: 0.3 },
        { w: 'square', f0: midiFreq(67), f1: midiFreq(67), v0: 0.12, v1: 0.05, a: 0.01, r: 0.1, t0: 0.3, t1: 0.5 },
        { w: 'square', f0: midiFreq(72), f1: midiFreq(72), v0: 0.15, v1: 0.08, a: 0.01, r: 0.1, t0: 0.5, t1: 0.75 },
        { w: 'triangle', f0: midiFreq(72), f1: midiFreq(72), v0: 0.12, v1: 0, a: 0.05, r: 0.2, t0: 0.7, t1: 1 },
        { w: 'sine', f0: midiFreq(60), f1: midiFreq(60), v0: 0.08, v1: 0, a: 0.05, r: 0.2, t0: 0.7, t1: 1 },
        { w: 'sine', f0: midiFreq(67), f1: midiFreq(67), v0: 0.06, v1: 0, a: 0.05, r: 0.2, t0: 0.7, t1: 1 },
    ]);

    return tracks;
}

/** Mix multiple AudioBuffers into one (additive). */
function mixBuffers(ctx, buffers, duration) {
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * duration);
    const out = ctx.createBuffer(1, len, sr);
    const data = out.getChannelData(0);
    for (const buf of buffers) {
        const src = buf.getChannelData(0);
        const n = Math.min(src.length, len);
        for (let i = 0; i < n; i++) {
            data[i] = clamp(data[i] + src[i]);
        }
    }
    return out;
}

function generateBiomeMusic(ctx) {
    const music = {};

    for (const [biome, def] of Object.entries(BIOME_DEFS)) {
        const beatDur = 60 / def.bpm;
        const totalDur = def.beats * beatDur;

        // Ambient stem
        music[`music_${biome}_ambient`] = renderMelodic(
            ctx, totalDur, beatDur, def.ambient.wave, def.ambient.notes
        );

        // Percussion stem
        music[`music_${biome}_percussion`] = renderPercussion(
            ctx, totalDur, beatDur, def.percussion.hits
        );

        // Melody stem
        music[`music_${biome}_melody`] = renderMelodic(
            ctx, totalDur, beatDur, def.melody.wave, def.melody.notes
        );
    }

    return music;
}

function generateBossMusic(ctx) {
    const music = {};

    for (const [boss, def] of Object.entries(BOSS_DEFS)) {
        const beatDur = 60 / def.bpm;
        const totalDur = def.beats * beatDur;

        const melody = renderMelodic(ctx, totalDur, beatDur, def.wave, def.notes);
        const perc = renderPercussion(ctx, totalDur, beatDur, def.hits);

        music[`music_boss_${boss}`] = mixBuffers(ctx, [melody, perc], totalDur);
    }

    return music;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate all procedural audio and add to Phaser's audio cache.
 * Call this in BootScene.create() before transitioning to the next scene.
 * @param {Phaser.Scene} scene
 */
export function generateAllAudio(scene) {
    const ctx = scene.sound?.context;
    if (!ctx) {
        console.warn('ProceduralAudio: No Web Audio context available');
        return;
    }

    let count = 0;

    // SFX
    const sfx = generateSFX(ctx);
    for (const [key, buffer] of Object.entries(sfx)) {
        scene.cache.audio.add(key, buffer);
        count++;
    }

    // Announcer sounds
    const announcer = generateAnnouncerSounds(ctx);
    for (const [key, buffer] of Object.entries(announcer)) {
        scene.cache.audio.add(key, buffer);
        count++;
    }

    // Biome music stems
    const biomeMusic = generateBiomeMusic(ctx);
    for (const [key, buffer] of Object.entries(biomeMusic)) {
        scene.cache.audio.add(key, buffer);
        count++;
    }

    // Boss themes
    const bossMusic = generateBossMusic(ctx);
    for (const [key, buffer] of Object.entries(bossMusic)) {
        scene.cache.audio.add(key, buffer);
        count++;
    }

    // Standalone tracks
    const standalone = generateStandaloneTracks(ctx);
    for (const [key, buffer] of Object.entries(standalone)) {
        scene.cache.audio.add(key, buffer);
        count++;
    }

    console.log(`ProceduralAudio: Generated ${count} audio items`);
}
