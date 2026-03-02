/**
 * Skill tree perk definitions for all classes.
 * Each class has 4 branches: Might, Fortitude, Technique, Mastery.
 * Node costs escalate: 50 → 100 → 200 → 400 Soul Shards per tier.
 * Full tree cost per class: ~3,000 shards total.
 */

const TIER_COSTS = [50, 100, 200, 400];

export const PerkData = {
    warrior: {
        might: [
            { id: 'warrior_might_1', name: '+15% Damage', desc: 'All attacks deal 15% more damage.', cost: TIER_COSTS[0], effect: { stat: 'damageMultiplier', value: 0.15 } },
            { id: 'warrior_might_2', name: 'Heavy Blows', desc: 'Attacks push enemies further.', cost: TIER_COSTS[1], effect: { stat: 'knockbackMultiplier', value: 0.5 }, requires: 'warrior_might_1' },
            { id: 'warrior_might_3', name: '+20% Attack Speed', desc: 'Swing 20% faster.', cost: TIER_COSTS[2], effect: { stat: 'attackSpeedMultiplier', value: 0.20 }, requires: 'warrior_might_2' },
            { id: 'warrior_might_4', name: 'Critical Strikes', desc: '10% chance to deal 2x damage.', cost: TIER_COSTS[3], effect: { stat: 'critChance', value: 0.10 }, requires: 'warrior_might_3' },
        ],
        fortitude: [
            { id: 'warrior_fort_1', name: '+20 Max HP', desc: 'Increases maximum health by 20.', cost: TIER_COSTS[0], effect: { stat: 'bonusHp', value: 20 } },
            { id: 'warrior_fort_2', name: '+4 Defense', desc: 'Reduces incoming damage by 4.', cost: TIER_COSTS[1], effect: { stat: 'bonusDefense', value: 4 }, requires: 'warrior_fort_1' },
            { id: 'warrior_fort_3', name: 'Room Clear Heal', desc: 'Heal 5 HP when a room is cleared.', cost: TIER_COSTS[2], effect: { stat: 'roomClearHeal', value: 5 }, requires: 'warrior_fort_2' },
            { id: 'warrior_fort_4', name: 'Last Stand', desc: 'Revive once per run at 30% HP.', cost: TIER_COSTS[3], effect: { stat: 'reviveOnce', value: true }, requires: 'warrior_fort_3' },
        ],
        technique: [
            { id: 'warrior_tech_1', name: 'Extended Stun', desc: 'Shield Bash stuns for 2s (from 1s).', cost: TIER_COSTS[0], effect: { stat: 'bashStunDuration', value: 2000 } },
            { id: 'warrior_tech_2', name: 'Efficient Bash', desc: 'Shield Bash costs 10 mana (from 15).', cost: TIER_COSTS[1], effect: { stat: 'bashManaCost', value: 10 }, requires: 'warrior_tech_1' },
            { id: 'warrior_tech_3', name: 'Shockwave', desc: 'Shield Bash creates an AoE shockwave.', cost: TIER_COSTS[2], effect: { stat: 'bashAoE', value: true }, requires: 'warrior_tech_2' },
        ],
        mastery: [
            { id: 'warrior_mast_1', name: 'Cleave', desc: 'Attacks cleave through enemies.', cost: TIER_COSTS[1], effect: { stat: 'cleave', value: true } },
            { id: 'warrior_mast_2', name: 'Bloodthirst', desc: 'Killing enemies heals 3 HP.', cost: TIER_COSTS[2], effect: { stat: 'killHeal', value: 3 }, requires: 'warrior_mast_1' },
            { id: 'warrior_mast_3', name: 'IRON WILL', desc: "Can't die for 5s when HP hits 0 (once per floor).", cost: TIER_COSTS[3], effect: { stat: 'ironWill', value: true }, requires: 'warrior_mast_2' },
        ],
    },

    wizard: {
        might: [
            { id: 'wizard_might_1', name: 'Pierce +1', desc: 'Fireball pierces one additional enemy.', cost: TIER_COSTS[0], effect: { stat: 'extraPierce', value: 1 } },
            { id: 'wizard_might_2', name: '+25% Spell Damage', desc: 'All spells deal 25% more damage.', cost: TIER_COSTS[1], effect: { stat: 'damageMultiplier', value: 0.25 }, requires: 'wizard_might_1' },
            { id: 'wizard_might_3', name: 'Impact Explosion', desc: 'Fireball explodes on impact (AoE).', cost: TIER_COSTS[2], effect: { stat: 'fireballAoE', value: true }, requires: 'wizard_might_2' },
            { id: 'wizard_might_4', name: 'Ignite', desc: 'Fireball ignites enemies (burn status).', cost: TIER_COSTS[3], effect: { stat: 'fireballBurn', value: true }, requires: 'wizard_might_3' },
        ],
        fortitude: [
            { id: 'wizard_fort_1', name: '+30 Max HP', desc: 'Increases maximum health by 30.', cost: TIER_COSTS[0], effect: { stat: 'bonusHp', value: 30 } },
            { id: 'wizard_fort_2', name: 'Mana Shield', desc: 'Take mana damage before HP (10%).', cost: TIER_COSTS[1], effect: { stat: 'manaShield', value: 0.10 }, requires: 'wizard_fort_1' },
            { id: 'wizard_fort_3', name: '+3 Mana Regen', desc: 'Mana regenerates 3/s faster.', cost: TIER_COSTS[2], effect: { stat: 'bonusManaRegen', value: 3 }, requires: 'wizard_fort_2' },
            { id: 'wizard_fort_4', name: 'Potion Synergy', desc: 'HP potion also restores 15 mana.', cost: TIER_COSTS[3], effect: { stat: 'potionManaRestore', value: 15 }, requires: 'wizard_fort_3' },
        ],
        technique: [
            { id: 'wizard_tech_1', name: 'Blink Trail', desc: 'Blink leaves a damage trail.', cost: TIER_COSTS[0], effect: { stat: 'blinkDamageTrail', value: true } },
            { id: 'wizard_tech_2', name: 'Efficient Blink', desc: 'Blink costs 15 mana (from 25).', cost: TIER_COSTS[1], effect: { stat: 'blinkManaCost', value: 15 }, requires: 'wizard_tech_1' },
            { id: 'wizard_tech_3', name: 'Blink Reset', desc: 'Blink resets on kill within 2s.', cost: TIER_COSTS[2], effect: { stat: 'blinkResetOnKill', value: true }, requires: 'wizard_tech_2' },
        ],
        mastery: [
            { id: 'wizard_mast_1', name: 'Chain Lightning', desc: 'Spells chain to a nearby enemy.', cost: TIER_COSTS[1], effect: { stat: 'spellChain', value: true } },
            { id: 'wizard_mast_2', name: 'Mana Refund', desc: 'Kills refund 50% mana cost.', cost: TIER_COSTS[2], effect: { stat: 'killManaRefund', value: 0.50 }, requires: 'wizard_mast_1' },
            { id: 'wizard_mast_3', name: 'ARCANE FURY', desc: 'Below 30% HP: +50% cast speed and damage.', cost: TIER_COSTS[3], effect: { stat: 'arcaneFury', value: true }, requires: 'wizard_mast_2' },
        ],
    },

    archer: {
        might: [
            { id: 'archer_might_1', name: 'Piercing Arrows', desc: 'Arrows pierce the first enemy.', cost: TIER_COSTS[0], effect: { stat: 'arrowPierce', value: true } },
            { id: 'archer_might_2', name: '+15% Attack Speed', desc: 'Fire arrows 15% faster.', cost: TIER_COSTS[1], effect: { stat: 'attackSpeedMultiplier', value: 0.15 }, requires: 'archer_might_1' },
            { id: 'archer_might_3', name: 'Critical Arrows', desc: '15% chance for critical hit.', cost: TIER_COSTS[2], effect: { stat: 'critChance', value: 0.15 }, requires: 'archer_might_2' },
            { id: 'archer_might_4', name: 'Poison Arrows', desc: 'Arrows apply 3s poison.', cost: TIER_COSTS[3], effect: { stat: 'poisonArrows', value: true }, requires: 'archer_might_3' },
        ],
        fortitude: [
            { id: 'archer_fort_1', name: '+25 Max HP', desc: 'Increases maximum health by 25.', cost: TIER_COSTS[0], effect: { stat: 'bonusHp', value: 25 } },
            { id: 'archer_fort_2', name: 'Swift Dodge', desc: 'Dodge grants 2s +30% speed.', cost: TIER_COSTS[1], effect: { stat: 'dodgeSpeedBoost', value: 0.30 }, requires: 'archer_fort_1' },
            { id: 'archer_fort_3', name: '+5 Defense', desc: 'Reduces incoming damage by 5.', cost: TIER_COSTS[2], effect: { stat: 'bonusDefense', value: 5 }, requires: 'archer_fort_2' },
            { id: 'archer_fort_4', name: 'Double Dodge', desc: 'Dodge has 2 charges.', cost: TIER_COSTS[3], effect: { stat: 'dodgeCharges', value: 2 }, requires: 'archer_fort_3' },
        ],
        technique: [
            { id: 'archer_tech_1', name: 'Slowing Traps', desc: 'Traps slow enemies 40%.', cost: TIER_COSTS[0], effect: { stat: 'trapSlow', value: 0.40 } },
            { id: 'archer_tech_2', name: 'Double Trap', desc: 'Place 2 traps simultaneously.', cost: TIER_COSTS[1], effect: { stat: 'doubleTrap', value: true }, requires: 'archer_tech_1' },
            { id: 'archer_tech_3', name: 'Efficient Traps', desc: 'Trap costs 12 mana (from 20).', cost: TIER_COSTS[2], effect: { stat: 'trapManaCost', value: 12 }, requires: 'archer_tech_2' },
        ],
        mastery: [
            { id: 'archer_mast_1', name: 'Momentum', desc: 'Moving increases damage (up to 25%).', cost: TIER_COSTS[1], effect: { stat: 'movementDamageBonus', value: 0.25 } },
            { id: 'archer_mast_2', name: 'Ricochet', desc: 'Arrows ricochet off walls once.', cost: TIER_COSTS[2], effect: { stat: 'arrowRicochet', value: true }, requires: 'archer_mast_1' },
            { id: 'archer_mast_3', name: 'DEAD EYE', desc: 'Every 10th arrow is a guaranteed crit that pierces all.', cost: TIER_COSTS[3], effect: { stat: 'deadEye', value: true }, requires: 'archer_mast_2' },
        ],
    },

    valkyrie: {
        might: [
            { id: 'valkyrie_might_1', name: 'Wide Thrust', desc: 'Spear thrust hits wider.', cost: TIER_COSTS[0], effect: { stat: 'attackArcBonus', value: 20 } },
            { id: 'valkyrie_might_2', name: 'Exploit Weakness', desc: '+20% damage to stunned enemies.', cost: TIER_COSTS[1], effect: { stat: 'stunDamageBonus', value: 0.20 }, requires: 'valkyrie_might_1' },
            { id: 'valkyrie_might_3', name: 'Lightning Strike', desc: 'Lightning on every 5th hit.', cost: TIER_COSTS[2], effect: { stat: 'lightningEvery', value: 5 }, requires: 'valkyrie_might_2' },
            { id: 'valkyrie_might_4', name: '+15% Attack Speed', desc: 'Strike 15% faster.', cost: TIER_COSTS[3], effect: { stat: 'attackSpeedMultiplier', value: 0.15 }, requires: 'valkyrie_might_3' },
        ],
        fortitude: [
            { id: 'valkyrie_fort_1', name: '+20 Max HP', desc: 'Increases maximum health by 20.', cost: TIER_COSTS[0], effect: { stat: 'bonusHp', value: 20 } },
            { id: 'valkyrie_fort_2', name: 'Block', desc: 'Hold attack to block (50% reduction).', cost: TIER_COSTS[1], effect: { stat: 'block', value: 0.50 }, requires: 'valkyrie_fort_1' },
            { id: 'valkyrie_fort_3', name: '+5 Defense', desc: 'Reduces incoming damage by 5.', cost: TIER_COSTS[2], effect: { stat: 'bonusDefense', value: 5 }, requires: 'valkyrie_fort_2' },
            { id: 'valkyrie_fort_4', name: 'Perfect Block', desc: 'Perfect block reflects damage back.', cost: TIER_COSTS[3], effect: { stat: 'perfectBlock', value: true }, requires: 'valkyrie_fort_3' },
        ],
        technique: [
            { id: 'valkyrie_tech_1', name: 'Bounce Shield', desc: 'Shield bounces to a 2nd enemy.', cost: TIER_COSTS[0], effect: { stat: 'shieldBounce', value: 2 } },
            { id: 'valkyrie_tech_2', name: 'Shield Stun', desc: 'Shield throw stuns for 1.5s.', cost: TIER_COSTS[1], effect: { stat: 'shieldStunDuration', value: 1500 }, requires: 'valkyrie_tech_1' },
            { id: 'valkyrie_tech_3', name: 'Efficient Shield', desc: 'Shield costs 12 mana (from 20).', cost: TIER_COSTS[2], effect: { stat: 'shieldManaCost', value: 12 }, requires: 'valkyrie_tech_2' },
        ],
        mastery: [
            { id: 'valkyrie_mast_1', name: 'Dodge Block', desc: 'Blocking during dodge negates all damage.', cost: TIER_COSTS[1], effect: { stat: 'dodgeBlock', value: true } },
            { id: 'valkyrie_mast_2', name: 'Mark of War', desc: 'Spear attacks mark enemies (+20% damage taken).', cost: TIER_COSTS[2], effect: { stat: 'markOfWar', value: 0.20 }, requires: 'valkyrie_mast_1' },
            { id: 'valkyrie_mast_3', name: "VALHALLA'S CALL", desc: 'On death, revive at 50% HP + 5s invincibility (once per run).', cost: TIER_COSTS[3], effect: { stat: 'valhallasCall', value: true }, requires: 'valkyrie_mast_2' },
        ],
    },

    necromancer: {
        might: [
            { id: 'necro_might_1', name: 'Wider Wave', desc: 'Dark wave is 20% wider.', cost: TIER_COSTS[0], effect: { stat: 'attackArcBonus', value: 12 } },
            { id: 'necro_might_2', name: '+20% Spell Damage', desc: 'All spells deal 20% more damage.', cost: TIER_COSTS[1], effect: { stat: 'damageMultiplier', value: 0.20 }, requires: 'necro_might_1' },
            { id: 'necro_might_3', name: 'Soul Orbs', desc: 'Kills create soul orbs (heal 5HP).', cost: TIER_COSTS[2], effect: { stat: 'soulOrbs', value: 5 }, requires: 'necro_might_2' },
            { id: 'necro_might_4', name: 'Dark Slow', desc: 'Dark wave slows enemies 30%.', cost: TIER_COSTS[3], effect: { stat: 'darkWaveSlow', value: 0.30 }, requires: 'necro_might_3' },
        ],
        fortitude: [
            { id: 'necro_fort_1', name: '+25 Max HP', desc: 'Increases maximum health by 25.', cost: TIER_COSTS[0], effect: { stat: 'bonusHp', value: 25 } },
            { id: 'necro_fort_2', name: 'Bone Shield', desc: 'Skeletons take 25% damage for you (proximity).', cost: TIER_COSTS[1], effect: { stat: 'skeletonDamageShare', value: 0.25 }, requires: 'necro_fort_1' },
            { id: 'necro_fort_3', name: '+4 Defense', desc: 'Reduces incoming damage by 4.', cost: TIER_COSTS[2], effect: { stat: 'bonusDefense', value: 4 }, requires: 'necro_fort_2' },
            { id: 'necro_fort_4', name: 'Death Renewal', desc: 'Your death heals all active skeletons to full.', cost: TIER_COSTS[3], effect: { stat: 'deathHealSkeletons', value: true }, requires: 'necro_fort_3' },
        ],
        technique: [
            { id: 'necro_tech_1', name: 'Raise Two', desc: 'Raise 2 skeletons at once.', cost: TIER_COSTS[0], effect: { stat: 'raiseCount', value: 2 } },
            { id: 'necro_tech_2', name: 'Extended Undeath', desc: 'Skeletons last 60s (from 30s).', cost: TIER_COSTS[1], effect: { stat: 'skeletonDuration', value: 60000 }, requires: 'necro_tech_1' },
            { id: 'necro_tech_3', name: 'Efficient Raise', desc: 'Raise costs 20 mana (from 30).', cost: TIER_COSTS[2], effect: { stat: 'raiseManaCost', value: 20 }, requires: 'necro_tech_2' },
        ],
        mastery: [
            { id: 'necro_mast_1', name: 'Death Burst', desc: 'Skeletons explode on death (AoE damage).', cost: TIER_COSTS[1], effect: { stat: 'skeletonDeathExplosion', value: true } },
            { id: 'necro_mast_2', name: 'Life Drain', desc: 'Dark wave life-steals 15%.', cost: TIER_COSTS[2], effect: { stat: 'lifeSteal', value: 0.15 }, requires: 'necro_mast_1' },
            { id: 'necro_mast_3', name: 'ARMY OF DARKNESS', desc: 'Can have 5 skeletons; they gain +50% damage and HP.', cost: TIER_COSTS[3], effect: { stat: 'armyOfDarkness', value: true }, requires: 'necro_mast_2' },
        ],
    },
};

/** Flat lookup: perkId → perk definition */
export const PerkLookup = {};
for (const [classKey, branches] of Object.entries(PerkData)) {
    for (const [branchKey, perks] of Object.entries(branches)) {
        for (const perk of perks) {
            PerkLookup[perk.id] = { ...perk, classKey, branchKey };
        }
    }
}

/** Respec cost escalation */
export const RESPEC_COSTS = [0, 100, 250, 500, 1000];

export { TIER_COSTS };
