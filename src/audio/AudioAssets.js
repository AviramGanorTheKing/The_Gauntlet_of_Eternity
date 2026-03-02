/**
 * AudioAssets — configuration for all audio files to preload.
 * Uses downloaded 8-bit music and sound effects packs.
 *
 * Music: CodeManu 8-bit pack (CC-BY 3.0)
 * SFX: 512 Retro Video Game SFX (CC0) + RPG Sound Pack (CC0)
 */

const BASE_MUSIC = 'assets/audio/music';
const BASE_SFX_RETRO = 'assets/audio/sfx/retro_512';
const BASE_SFX_RPG = 'assets/audio/sfx/RPG Sound Pack';

/**
 * Music tracks to preload.
 * Uses single-track approach (no layered stems) for simplicity.
 */
export const MUSIC_ASSETS = {
    // Menu / UI
    music_title: `${BASE_MUSIC}/bgm_menu.mp3`,
    music_shop: `${BASE_MUSIC}/bgm_menu.mp3`,
    music_death_jingle: `${BASE_MUSIC}/bgm_action_5.mp3`,
    music_victory_fanfare: `${BASE_MUSIC}/bgm_action_3.mp3`,

    // Biome music (single track per biome - no layered stems)
    music_crypt: `${BASE_MUSIC}/bgm_action_1.mp3`,
    music_caves: `${BASE_MUSIC}/bgm_action_2.mp3`,
    music_fortress: `${BASE_MUSIC}/bgm_action_3.mp3`,
    music_inferno: `${BASE_MUSIC}/bgm_action_4.mp3`,
    music_abyss: `${BASE_MUSIC}/bgm_action_5.mp3`,

    // Boss music (reuse action tracks)
    music_boss_bone_sovereign: `${BASE_MUSIC}/bgm_action_5.mp3`,
    music_boss_sporemind: `${BASE_MUSIC}/bgm_action_4.mp3`,
    music_boss_iron_warden: `${BASE_MUSIC}/bgm_action_3.mp3`,
    music_boss_ember_tyrant: `${BASE_MUSIC}/bgm_action_4.mp3`,
    music_boss_void_architect: `${BASE_MUSIC}/bgm_action_5.mp3`,
};

/**
 * Sound effect files to preload.
 * Mapped to game event keys used by AudioManager.
 */
export const SFX_ASSETS = {
    // ── Combat ──────────────────────────────────────────────────────────────
    sfx_sword_swing: `${BASE_SFX_RPG}/battle/swing.wav`,
    sfx_sword_swing2: `${BASE_SFX_RPG}/battle/swing2.wav`,
    sfx_sword_swing3: `${BASE_SFX_RPG}/battle/swing3.wav`,
    sfx_hit: `${BASE_SFX_RETRO}/General Sounds/Impacts/sfx_sounds_impact1.wav`,
    sfx_hit2: `${BASE_SFX_RETRO}/General Sounds/Impacts/sfx_sounds_impact2.wav`,
    sfx_hit3: `${BASE_SFX_RETRO}/General Sounds/Impacts/sfx_sounds_impact3.wav`,
    sfx_player_hit: `${BASE_SFX_RETRO}/General Sounds/Negative Sounds/sfx_sounds_damage1.wav`,
    sfx_critical_hit: `${BASE_SFX_RETRO}/General Sounds/Impacts/sfx_sounds_impact14.wav`,
    sfx_arrow_fire: `${BASE_SFX_RETRO}/Weapons/Single Shot Sounds/sfx_weapon_singleshot15.wav`,
    sfx_magic_cast: `${BASE_SFX_RPG}/battle/spell.wav`,
    sfx_dodge: `${BASE_SFX_RETRO}/Movement/Jumping and Landing/sfx_movement_jump14.wav`,
    sfx_enemy_death: `${BASE_SFX_RETRO}/Death Screams/Human/sfx_deathscream_human1.wav`,
    sfx_enemy_death2: `${BASE_SFX_RETRO}/Death Screams/Human/sfx_deathscream_human2.wav`,
    sfx_enemy_death3: `${BASE_SFX_RETRO}/Death Screams/Human/sfx_deathscream_human3.wav`,
    sfx_explosion: `${BASE_SFX_RETRO}/Explosions/Medium Length/sfx_exp_medium1.wav`,
    sfx_explosion2: `${BASE_SFX_RETRO}/Explosions/Medium Length/sfx_exp_medium2.wav`,
    sfx_explosion_short: `${BASE_SFX_RETRO}/Explosions/Short/sfx_exp_short_hard1.wav`,

    // ── Pickups ─────────────────────────────────────────────────────────────
    sfx_gold: `${BASE_SFX_RPG}/inventory/coin.wav`,
    sfx_gold2: `${BASE_SFX_RPG}/inventory/coin2.wav`,
    sfx_gold3: `${BASE_SFX_RPG}/inventory/coin3.wav`,
    sfx_potion: `${BASE_SFX_RPG}/inventory/bubble.wav`,
    sfx_heal: `${BASE_SFX_RPG}/inventory/bubble2.wav`,
    sfx_gear_common: `${BASE_SFX_RPG}/inventory/armor-light.wav`,
    sfx_gear_rare: `${BASE_SFX_RPG}/inventory/chainmail1.wav`,
    sfx_gear_legendary: `${BASE_SFX_RPG}/inventory/metal-ringing.wav`,
    sfx_chest_open: `${BASE_SFX_RPG}/inventory/wood-small.wav`,
    sfx_equip: `${BASE_SFX_RPG}/inventory/chainmail2.wav`,

    // ── UI / Menu ───────────────────────────────────────────────────────────
    sfx_menu_select: `${BASE_SFX_RPG}/interface/interface1.wav`,
    sfx_menu_confirm: `${BASE_SFX_RPG}/interface/interface2.wav`,
    sfx_menu_cancel: `${BASE_SFX_RPG}/interface/interface3.wav`,
    sfx_pause_open: `${BASE_SFX_RETRO}/General Sounds/Pause Sounds/sfx_sounds_pause1_in.wav`,
    sfx_pause_close: `${BASE_SFX_RETRO}/General Sounds/Pause Sounds/sfx_sounds_pause1_out.wav`,
    sfx_level_up: `${BASE_SFX_RETRO}/General Sounds/Fanfares/sfx_sounds_fanfare1.wav`,
    sfx_shard_earned: `${BASE_SFX_RETRO}/General Sounds/Coins/sfx_coin_double1.wav`,
    sfx_typewriter: `${BASE_SFX_RETRO}/General Sounds/Simple Bleeps/sfx_sounds_Blip1.wav`,

    // ── Environmental ───────────────────────────────────────────────────────
    sfx_shrine: `${BASE_SFX_RETRO}/General Sounds/Positive Sounds/sfx_sounds_powerup1.wav`,
    sfx_secret: `${BASE_SFX_RETRO}/General Sounds/Fanfares/sfx_sounds_fanfare3.wav`,
    sfx_stairs: `${BASE_SFX_RETRO}/General Sounds/Neutral Sounds/sfx_sound_neutral1.wav`,
    sfx_trap: `${BASE_SFX_RETRO}/General Sounds/Negative Sounds/sfx_sounds_error1.wav`,
    sfx_door: `${BASE_SFX_RPG}/world/door.wav`,
    sfx_boss_appear: `${BASE_SFX_RETRO}/General Sounds/Alarms/Alarms/sfx_alarm_loop1.wav`,
    sfx_spawner_destroy: `${BASE_SFX_RETRO}/Explosions/Short/sfx_exp_short_soft1.wav`,

    // ── Monster sounds (for variety) ────────────────────────────────────────
    sfx_monster_hit: `${BASE_SFX_RPG}/NPC/ogre/ogre1.wav`,
    sfx_monster_growl: `${BASE_SFX_RPG}/NPC/gutteral beast/gutteral beast1.wav`,
    sfx_slime_hit: `${BASE_SFX_RPG}/NPC/slime/slime1.wav`,

    // ── Announcer-style sounds ──────────────────────────────────────────────
    announcer_health_warning: `${BASE_SFX_RETRO}/General Sounds/Alarms/Alarms/sfx_alarm_loop4.wav`,
    announcer_health_critical: `${BASE_SFX_RETRO}/General Sounds/Alarms/Alarms/sfx_alarm_loop2.wav`,
    announcer_death: `${BASE_SFX_RETRO}/General Sounds/Negative Sounds/sfx_sounds_error10.wav`,
    announcer_boss_encounter: `${BASE_SFX_RETRO}/General Sounds/Alarms/Alarms/sfx_alarm_loop3.wav`,
    announcer_boss_phase: `${BASE_SFX_RETRO}/General Sounds/High Pitched Sounds/sfx_sounds_high1.wav`,
    announcer_boss_defeated: `${BASE_SFX_RETRO}/General Sounds/Fanfares/sfx_sounds_fanfare2.wav`,
    announcer_secret: `${BASE_SFX_RETRO}/General Sounds/Positive Sounds/sfx_sounds_powerup4.wav`,
    announcer_streak: `${BASE_SFX_RETRO}/General Sounds/Positive Sounds/sfx_sounds_powerup2.wav`,
    announcer_spawner: `${BASE_SFX_RETRO}/General Sounds/Positive Sounds/sfx_sounds_powerup3.wav`,
    announcer_treasure: `${BASE_SFX_RETRO}/General Sounds/Coins/sfx_coin_double7.wav`,
    announcer_shrine: `${BASE_SFX_RETRO}/General Sounds/Positive Sounds/sfx_sounds_powerup5.wav`,
    announcer_floor_deeper: `${BASE_SFX_RETRO}/General Sounds/Neutral Sounds/sfx_sound_neutral2.wav`,
    announcer_floor_biome: `${BASE_SFX_RETRO}/General Sounds/Neutral Sounds/sfx_sound_neutral5.wav`,
};

/**
 * Load all audio assets in BootScene.
 * Call this in preload().
 * @param {Phaser.Scene} scene
 */
export function preloadAllAudio(scene) {
    // Load music (MP3)
    for (const [key, path] of Object.entries(MUSIC_ASSETS)) {
        scene.load.audio(key, path);
    }

    // Load SFX (WAV)
    for (const [key, path] of Object.entries(SFX_ASSETS)) {
        scene.load.audio(key, path);
    }
}
