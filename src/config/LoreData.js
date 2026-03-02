/**
 * Lore entries, item flavor text, environmental descriptions.
 * 6-channel delivery system:
 *   1. Environmental details (biome descriptions)
 *   2. Item flavor text (legendary items)
 *   3. Lore scrolls in secret rooms (25 total, 5 per biome)
 *   4. Announcer lore lines (handled in AnnouncerSystem)
 *   5. Death screen fragments (between runs)
 *   6. Floor transition tips (between floors)
 */

export const LoreData = {
    /** Biome environmental flavor text (shown on minimap/HUD) */
    biomeDescriptions: {
        crypt: 'The bones of a thousand loyal subjects line these halls.',
        caves: 'The air tastes of spores. The walls breathe.',
        fortress: 'Gears turn endlessly. The builder never finished.',
        inferno: 'The heat consumes. Only ashes remember what came before.',
        abyss: 'Reality bends. The dungeon watches you back.',
    },

    /**
     * Lore scrolls found in secret rooms — 25 total, 5 per biome.
     * Collecting all 25 reveals the Void Architect backstory.
     */
    scrolls: [
        // ── Crypt (5) ─────────────────────────────────────────────────────
        { id: 'scroll_crypt_01', biome: 'crypt', title: 'Royal Decree',
          text: 'He wished them back. They came — but not as he remembered. Their eyes held no recognition, only hunger.' },
        { id: 'scroll_crypt_02', biome: 'crypt', title: 'Crown Fragments',
          text: 'Crown fragments scatter the floor. A king still rules — but his court is bones and his throne is grief.' },
        { id: 'scroll_crypt_03', biome: 'crypt', title: 'Loyal Subject',
          text: 'A soldier\'s journal: "My king called us home. I answered. I cannot stop answering."' },
        { id: 'scroll_crypt_04', biome: 'crypt', title: 'The Resurrection',
          text: 'The wish was precise: bring them all back. The dungeon was generous. It brought back everything — bones, memories, pain.' },
        { id: 'scroll_crypt_05', biome: 'crypt', title: 'Empty Throne',
          text: 'The Bone Sovereign sits motionless for years at a time. Then a hero enters, and he rises. He always rises.' },

        // ── Fungal Caves (5) ──────────────────────────────────────────────
        { id: 'scroll_caves_01', biome: 'caves', title: 'Druidic Symbols',
          text: 'She poured her power into the earth to cleanse it. The earth drank deep and wanted more.' },
        { id: 'scroll_caves_02', biome: 'caves', title: 'Petrified Roots',
          text: 'Druidic symbols carved in petrified wood. The corruption wears her face and speaks with her voice.' },
        { id: 'scroll_caves_03', biome: 'caves', title: 'Spore Journal',
          text: 'The mushrooms remember. Every thought she ever had lives in the mycelium. She is everywhere and nowhere.' },
        { id: 'scroll_caves_04', biome: 'caves', title: 'The Purification',
          text: 'Her wish was to heal the land. The dungeon twisted this — she became the disease she sought to cure.' },
        { id: 'scroll_caves_05', biome: 'caves', title: 'Living Network',
          text: 'The Sporemind doesn\'t attack. It absorbs. Every fallen hero feeds the network. She doesn\'t mean to. She can\'t stop.' },

        // ── Iron Fortress (5) ─────────────────────────────────────────────
        { id: 'scroll_fortress_01', biome: 'fortress', title: 'Blueprints',
          text: '"Almost free," the inscription reads. The tunnel leads nowhere. Every path drawn leads back to the same room.' },
        { id: 'scroll_fortress_02', biome: 'fortress', title: 'Escape Tunnels',
          text: 'Escape tunnel blueprints. Cross-referenced, triple-checked. Every path, calculated to perfection, curves back.' },
        { id: 'scroll_fortress_03', biome: 'fortress', title: 'Engineer\'s Log',
          text: 'Day 4,380: The machine is 99% complete. It will open the way. Day 4,381: I am part of the machine now.' },
        { id: 'scroll_fortress_04', biome: 'fortress', title: 'The Machine',
          text: 'His wish was for tools to escape. The dungeon gave him everything he needed — and fused them to his flesh.' },
        { id: 'scroll_fortress_05', biome: 'fortress', title: 'Iron Tears',
          text: 'The Iron Warden builds compulsively. Gears, walls, traps. He cannot stop. He doesn\'t remember why he started.' },

        // ── Inferno (5) ───────────────────────────────────────────────────
        { id: 'scroll_inferno_01', biome: 'inferno', title: 'Battle Standards',
          text: 'Scorched battle standards. An army marched in. Only fire marched out.' },
        { id: 'scroll_inferno_02', biome: 'inferno', title: 'Charred Diary',
          text: 'A charred diary: "I can feel it consuming me. But the power — oh, the power is magnificent."' },
        { id: 'scroll_inferno_03', biome: 'inferno', title: 'The General',
          text: 'He was the greatest warrior of his age. He wished for the strength to destroy the dungeon from within.' },
        { id: 'scroll_inferno_04', biome: 'inferno', title: 'Ash Memory',
          text: 'The dungeon gave him fire that never dies. It consumed his army, his mind, his humanity. Only rage remains.' },
        { id: 'scroll_inferno_05', biome: 'inferno', title: 'Eternal Flame',
          text: 'The Ember Tyrant doesn\'t recognize heroes. He sees only fuel. Every battle feeds the flame he cannot control.' },

        // ── Abyss (5) ─────────────────────────────────────────────────────
        { id: 'scroll_abyss_01', biome: 'abyss', title: 'The First',
          text: 'The first hero wished to understand. Now there is no hero — only the dungeon, wearing his curiosity like a mask.' },
        { id: 'scroll_abyss_02', biome: 'abyss', title: 'The Cycle',
          text: 'Every century it appears. Every century heroes enter. None return. The cycle feeds on hope.' },
        { id: 'scroll_abyss_03', biome: 'abyss', title: 'Architect\'s Notes',
          text: 'He was a scholar. He wanted to know what the dungeon was. The dungeon showed him by making him part of itself.' },
        { id: 'scroll_abyss_04', biome: 'abyss', title: 'The Pattern',
          text: 'Five heroes. Five wishes. Five tragedies. The dungeon doesn\'t grant wishes — it feeds on the wanting.' },
        { id: 'scroll_abyss_05', biome: 'abyss', title: 'Final Entry',
          text: 'If you\'re reading this, you\'re the latest. Break the cycle. Or don\'t. The dungeon is patient. It has forever.' },
    ],

    /** Boss lore (shown during BossIntroScene) */
    bossLore: {
        bone_sovereign: {
            title: 'The Bone Sovereign',
            former: 'A king who sought to resurrect his kingdom.',
            corruption: 'His people returned as undead. He rules them forever.',
        },
        sporemind: {
            title: 'The Sporemind',
            former: 'A druid who tried to purify the dungeon.',
            corruption: 'Her power was absorbed and twisted into fungal corruption.',
        },
        iron_warden: {
            title: 'The Iron Warden',
            former: 'An engineer who tried to build a way out.',
            corruption: 'His machines became his prison, fused to his body.',
        },
        ember_tyrant: {
            title: 'The Ember Tyrant',
            former: 'A warrior who wished for power to destroy the dungeon.',
            corruption: 'He got the power but lost his mind.',
        },
        void_architect: {
            title: 'The Void Architect',
            former: 'The very first hero, thousands of years ago.',
            corruption: 'He wished to understand the dungeon — became the dungeon.',
        },
    },

    /** Legendary item flavor text */
    legendaryItems: {
        bone_harvest: { name: 'Bone Harvest', desc: 'Melee attacks raise temporary micro-skeletons.', lore: 'Forged from the Bone Sovereign\'s own rib.' },
        stormcaller: { name: 'Stormcaller', desc: 'Every 3rd hit calls a lightning bolt.', lore: 'The sky remembers when the Valkyries rode.' },
        phasewalker_bow: { name: 'Phasewalker Bow', desc: 'Arrows teleport you to where they land.', lore: 'Distance is a suggestion to those who hunt between worlds.' },
        inferno_core: { name: 'Inferno Core', desc: 'Fireballs leave permanent burning ground.', lore: 'The Ember Tyrant\'s heart still beats with rage.' },
        oathkeeper: { name: 'Oathkeeper', desc: 'Damage increases the lower your HP (up to +100%).', lore: 'An oath sworn in blood is paid in blood.' },
    },

    /** Ending descriptions */
    endings: {
        liberation: {
            title: 'Liberation',
            text: 'The cycle breaks. Ancient souls rise free, their torment ended.\n\nThe dungeon crumbles as light pours in. The bosses, restored to who they once were, bow in gratitude.\n\nThe Gauntlet of Eternity is no more.',
        },
        ascension: {
            title: 'Ascension',
            text: 'Power courses through you. The dungeon bends to your will.\n\nThe throne of the Void Architect fits perfectly. You are the dungeon now.\n\nThe next century of heroes will face you.',
        },
        escape: {
            title: 'Escape',
            text: 'The Void Architect falls, but the dungeon endures.\n\nYou climb through the rubble into daylight. Behind you, the entrance seals.\n\nOthers remain trapped. You are free — but freedom tastes bittersweet.',
        },
        eternal: {
            title: 'The Eternal',
            text: 'You chose nothing. Changed nothing.\n\nThe dungeon keeps you — not as prisoner, but as witness.\n\nYou drift between floors, a ghost narrator whispering warnings\nthat future heroes will ignore.',
        },
    },

    /** Moral choice descriptions */
    moralChoices: {
        compassion: {
            biome: 'caves',
            floor: 8,
            prompt: 'A trapped ghost reaches out...',
            selfless: 'Free the ghost (costs 20% HP)',
            selfish: 'Walk past',
        },
        mercy: {
            biome: 'fortress',
            floor: 13,
            prompt: 'A weakened mini-boss surrenders...',
            selfless: 'Spare it (no loot)',
            selfish: 'Execute it (epic gear)',
        },
        sacrifice: {
            biome: 'inferno',
            floor: 18,
            prompt: 'A fallen companion can be restored...',
            selfless: 'Sacrifice your best equipment',
            selfish: 'Keep your gear',
        },
    },

    /**
     * Death screen lore fragments — rotating quotes based on deepest biome.
     * Typewriter reveal between runs.
     */
    deathFragments: {
        crypt: [
            'The bones remember what the living forget.',
            'In the crypt, even silence has weight.',
            'He wished them back. They came — but wrong.',
            'A crown without a kingdom is just cold metal.',
            'The dead serve willingly. They have nothing left to lose.',
        ],
        caves: [
            'The spores carry memories of a druid\'s dream.',
            'Growth without purpose is just decay with ambition.',
            'She poured her power into the earth. The earth drank deep.',
            'The mycelium remembers every footstep.',
            'Nature is patient. Corruption is nature unchained.',
        ],
        fortress: [
            'Every escape tunnel led back to the same room.',
            'The gears turn. The builder never finished.',
            'Freedom is a blueprint. The walls are real.',
            'He built the perfect cage. He lives in it.',
            'The machine doesn\'t think. It just builds.',
        ],
        inferno: [
            'Power consumed him. He became the flame.',
            'The heat erases. Only ashes remember.',
            'He wished for strength. The dungeon obliged.',
            'Fire doesn\'t choose what it burns.',
            'His army followed him into the fire. He didn\'t notice.',
        ],
        abyss: [
            'The first hero wished to understand. Now there is no hero.',
            'The cycle feeds. Every century, it rises.',
            'Reality bends. The dungeon watches you back.',
            'The wish is the trap. The wanting is the fuel.',
            'Break the cycle. Or become part of it.',
        ],
    },

    /**
     * Floor transition tips — alternate gameplay tips and lore fragments
     * shown during stair descent loading screen.
     */
    floorTransitionTips: [
        // Gameplay tips
        'Destroy spawners quickly to stop enemy reinforcements.',
        'Dodge through enemy attacks — i-frames protect you.',
        'Shrines offer powerful temporary buffs. Always interact.',
        'Secret rooms hide lore scrolls. Collect all 25 for the full story.',
        'Companions adopt the abilities of their class.',
        'Each biome has unique trap types. Watch the floor.',
        'Boss encounters have 3 phases. Save potions for phase 3.',
        'Uncommon+ items have stat bonuses. Check your inventory.',
        'Soul Shards persist between runs. Invest in the skill tree.',
        'Explore every room — gold and gear compound over time.',
        // Lore fragments
        'The dungeon remembers your choices.',
        'Five heroes entered. Five wishes twisted. Five bosses born.',
        'The Void Architect was once like you.',
        'The dungeon rises once per century. You are the latest challenger.',
        'Silence during a choice is the announcer\'s only comment.',
        'Every boss was once a hero who reached the bottom.',
        'The wish is real. The cost is everything.',
        'No hero has ever returned. The records are clear on this.',
    ],
};
