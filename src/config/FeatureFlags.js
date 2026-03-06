/**
 * FeatureFlags.js — Master on/off switches for every experimental feature.
 *
 * HOW TO USE:
 *   - Set a flag to `true` to enable a feature, `false` to disable it.
 *   - You can also toggle flags live in the browser devtools console:
 *       FeatureFlags.SCREEN_SHAKE = true;
 *   - To revert the entire game to the pre-feature baseline:
 *       git checkout v0.6.2-stable
 *
 * FLAGS ARE GROUPED BY CATEGORY. All start as false until tested and approved.
 */
export const FeatureFlags = {

    // ─── GRAPHICS & VISUALS ──────────────────────────────────────────────────

    /** Camera shake when melee/projectile hits land and when player takes damage. */
    SCREEN_SHAKE: false,

    /** Red vignette border flash when the player takes a hit. */
    DAMAGE_VIGNETTE: false,

    /** Particle burst (tween-driven sprites) when an enemy dies. */
    DEATH_PARTICLES: false,

    /** Small spark particles at the point of melee/projectile impact. */
    HIT_PARTICLES: false,

    /** Blue iframe aura on player during active dodge invincibility window. */
    DODGE_IFRAME_AURA: false,

    /** Particle trail + glow ring on boss projectiles. */
    PROJECTILE_GLOW: false,

    /** Colored status-effect aura rings drawn on affected entities. */
    STATUS_EFFECT_AURA: false,

    /** Biome-specific color-grading uniforms injected into the CRT shader. */
    BIOME_COLOR_GRADING: false,

    /** Expanding ring + particle burst on boss phase transitions. */
    BOSS_PHASE_VFX: false,

    // ─── COMBAT FEEL ─────────────────────────────────────────────────────────

    /** Brief physics pause on successful hit for "hit-stop" weight. */
    HIT_STOP: false,

    /** Roll crit chance on damage; 1.5× multiplier + gold damage number. */
    CRIT_SYSTEM: false,

    /** Enemy AI pauses briefly on knockback (hitstun). */
    HITSTUN: false,

    /** Damage numbers vary by type: crit=gold+large, status=color, heals=green. */
    DYNAMIC_DAMAGE_NUMBERS: false,

    // ─── UX & POLISH ─────────────────────────────────────────────────────────

    /** SFX + HUD flash when swapping active weapon. */
    WEAPON_SWAP_SFX: false,

    /** Dramatic 2-second boss entrance sequence before combat begins. */
    BOSS_ENTRANCE: false,

    /** Floor-transition summary screen (kills / gold / time) on stair use. */
    FLOOR_TRANSITION_SCREEN: false,

    /** First-use context hints overlay for new players. */
    TUTORIAL_HINTS: false,

    /** Heartbeat audio overlay when player HP is below 25%. */
    LOW_HEALTH_HEARTBEAT: false,

    /** Fanfare + screen flash on weapon level-up and perk unlock. */
    WEAPON_LEVELUP_FANFARE: false,

    // ─── CONTENT & DESIGN ────────────────────────────────────────────────────

    /** Random encounter rooms (8-10 event types) sprinkled through floors. */
    EVENT_ROOMS: false,

    /** Multiple shop archetypes (Standard / Weapon / Alchemist / Gambler). */
    SHOP_VARIETY: false,

    /** Enemy HP and damage scale by floor number (+15% HP, +10% dmg per floor). */
    FLOOR_DIFFICULTY_SCALE: false,

    /** Pity counter: guarantee a legendary drop after 50 non-legendary kills. */
    LOOT_PITY: false,

    /** Class-specific Ascension Perks unlockable after beating the Abyss. */
    ASCENSION_PERKS: false,
};

// Expose globally so devtools console can toggle during a live run.
if (typeof window !== 'undefined') {
    window.FeatureFlags = FeatureFlags;
}
