import SabatActor from "./module/actor/actor.js";
import SabatActorSheet from "./module/actor/actor-sheet.js";
import SabatItem from "./module/item/item.js";
import SabatItemSheet from "./module/item/item-sheet.js";

Hooks.once("ready", async function () {
  if (!game.user?.isGM) return;

  // Migrate legacy "equipment" items → "armor" type.
  // The type field is immutable on existing documents, so we delete + recreate.
  const ARMOR_DEFAULTS = {
    description: "", protection: 0, equipped: false, paperDollLayer: "",
    locations: { head: false, rightArm: false, leftArm: false, chest: false, abdomen: false, rightLeg: false, leftLeg: false }
  };

  function buildArmorData(src) {
    return {
      name: src.name,
      type: "armor",
      img: src.img,
      flags: src.flags,
      system: {
        ...ARMOR_DEFAULTS,
        description: src.system?.description ?? "",
        protection: src.system?.armorValue ?? src.system?.protection ?? 0,
        equipped: src.system?.equipped ?? false,
      }
    };
  }

  let migrated = 0;

  // World-level items
  const worldEquip = game.items.filter(i => i.type === "equipment");
  if (worldEquip.length) {
    const snapshots = worldEquip.map(i => i.toObject());
    await Item.deleteDocuments(worldEquip.map(i => i.id));
    await Item.createDocuments(snapshots.map(buildArmorData));
    migrated += snapshots.length;
  }

  // Actor-owned items
  for (const actor of game.actors) {
    const owned = actor.items.filter(i => i.type === "equipment");
    if (!owned.length) continue;
    const snapshots = owned.map(i => i.toObject());
    await actor.deleteEmbeddedDocuments("Item", owned.map(i => i.id));
    await actor.createEmbeddedDocuments("Item", snapshots.map(buildArmorData));
    migrated += snapshots.length;
  }

  if (migrated > 0) {
    ui.notifications.info(`Sabat | Migrated ${migrated} legacy "equipment" item(s) to "armor".`);
    console.log(`Sabat | Migration: ${migrated} equipment → armor`);
  }
});

Hooks.once("init", function () {
  console.log("Sabat | Initializing system");

  CONFIG.Actor.documentClass = SabatActor;
  CONFIG.Item.documentClass = SabatItem;

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("sabat", SabatActorSheet, {
    makeDefault: true,
    label: "Sabat Character Sheet"
  });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("sabat", SabatItemSheet, {
    makeDefault: true,
    label: "Sabat Item Sheet"
  });

  _registerHandlebarsHelpers();
});

const HIT_LOCATION_LABELS = {
  head: "Head", rightArm: "Right Arm", leftArm: "Left Arm",
  chest: "Chest", abdomen: "Abdomen", rightLeg: "Right Leg", leftLeg: "Left Leg"
};

function _chatHitLocationKey(d10) {
  if (d10 === 1)  return "head";
  if (d10 === 2)  return "rightArm";
  if (d10 === 3)  return "leftArm";
  if (d10 <= 6)  return "chest";
  if (d10 <= 8)  return "abdomen";
  if (d10 === 9)  return "rightLeg";
  return "leftLeg";
}

Hooks.on("renderChatMessage", (_message, html) => {
  // "Roll Damage" button from weapon skill check
  html.find(".chat-damage-btn").click(async (ev) => {
    const btn = ev.currentTarget;
    const actor = game.actors.get(btn.dataset.actorId);
    const item = actor?.items.get(btn.dataset.itemId);
    if (!actor || !item) return ui.notifications.warn("Weapon or actor not found.");

    const formula = item.system.damage || "1d6";
    const [damageRoll, locRoll] = await Promise.all([
      new Roll(formula).evaluate({ async: true }),
      new Roll("1d10").evaluate({ async: true })
    ]);

    const locKey = _chatHitLocationKey(locRoll.total);
    const locLabel = HIT_LOCATION_LABELS[locKey];

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      rolls: [damageRoll],
      content: `
        <div class="sabat-roll sabat-damage-roll">
          <strong>${item.name}</strong>
          <div class="roll-details">
            Damage: <strong>${damageRoll.total}</strong>
            &nbsp;|&nbsp;
            Hit Location (d10=${locRoll.total}): <strong>${locLabel}</strong>
          </div>
          <button class="apply-damage-btn"
            data-damage="${damageRoll.total}"
            data-location="${locKey}">
            ⚔ Apply Damage to Selected Token(s)
          </button>
        </div>`
    });

    $(btn).prop("disabled", true).text("Damage Rolled");
  });

  html.find(".apply-damage-btn").click(async (ev) => {
    const btn      = ev.currentTarget;
    const damage   = parseInt(btn.dataset.damage) || 0;
    const location = btn.dataset.location;
    const locLabel = HIT_LOCATION_LABELS[location] ?? location;

    const targets = canvas.tokens?.controlled ?? [];
    if (!targets.length) {
      return ui.notifications.warn("Select one or more tokens before applying damage.");
    }

    for (const token of targets) {
      const actor = token.actor;
      if (!actor) continue;

      const protection  = actor.system.protection?.[location] ?? 0;
      const actualDmg   = Math.max(0, damage - protection);
      const newHp       = Math.max(0, (actor.system.health.value ?? 0) - actualDmg);

      await actor.update({ "system.health.value": newHp });

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `
          <div class="sabat-roll">
            <strong>${actor.name}</strong> — struck in the <strong>${locLabel}</strong>.
            <div class="roll-details">
              Armor absorbed <strong>${protection}</strong> ·
              Damage dealt: <strong>${actualDmg}</strong> ·
              HP: ${newHp} / ${actor.system.health.max}
            </div>
          </div>`
      });
    }
  });
});

function _registerHandlebarsHelpers() {
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("gt", (a, b) => a > b);
  Handlebars.registerHelper("lt", (a, b) => a < b);
  Handlebars.registerHelper("add", (a, b) => a + b);
  Handlebars.registerHelper("pct", (value, max) => max > 0 ? Math.round((value / max) * 100) : 0);

  Handlebars.registerHelper("skillLabel", (key) => {
    const labels = {
      alchemy: "Alchemy", animalKnowledge: "Animal Knowledge",
      areaKnowledge: "Area Knowledge", astrology: "Astrology",
      climb: "Climb", command: "Command", commerce: "Commerce",
      conceal: "Conceal", courtEtiquette: "Court Etiquette", craft: "Craft",
      discovery: "Discovery", disguise: "Disguise", dodge: "Dodge",
      drive: "Drive", eloquence: "Eloquence", empathy: "Empathy",
      games: "Games", heal: "Heal", jump: "Jump", language: "Language",
      legends: "Legends", listen: "Listen", magicalKnowledge: "Magical Knowledge",
      medicine: "Medicine", memory: "Memory", mineralKnowledge: "Mineral Knowledge",
      music: "Music", pickLock: "Pick Lock", plantKnowledge: "Plant Knowledge",
      readWrite: "Read/Write", ride: "Ride", run: "Run",
      seduction: "Seduction", shipHandling: "Ship Handling", singing: "Singing",
      sleightOfHand: "Sleight of Hand", stealth: "Stealth", swim: "Swim",
      taste: "Taste", teach: "Teach", theology: "Theology",
      throw: "Throw", torture: "Torture", track: "Track",
      axes: "Axes", bows: "Bows", brawl: "Brawl", clubs: "Clubs",
      crossbows: "Crossbows", improvised: "Improvised", knives: "Knives", longswords: "Longswords",
      maces: "Maces", shields: "Shields", slings: "Slings",
      spears: "Spears", swords: "Swords"
    };
    return labels[key] ?? key;
  });

  Handlebars.registerHelper("skillAttr", (key) => {
    const attrs = {
      alchemy: "CUL", animalKnowledge: "CUL", areaKnowledge: "CUL",
      astrology: "CUL", climb: "AGI", command: "COM", commerce: "COM",
      conceal: "DEX", courtEtiquette: "COM", craft: "DEX",
      discovery: "PER", disguise: "COM", dodge: "AGI", drive: "DEX",
      eloquence: "COM", empathy: "PER", games: "CUL", heal: "DEX",
      jump: "AGI", language: "CUL", legends: "CUL", listen: "PER",
      magicalKnowledge: "CUL", medicine: "CUL", memory: "PER",
      mineralKnowledge: "CUL", music: "CUL", pickLock: "DEX",
      plantKnowledge: "CUL", readWrite: "CUL", ride: "AGI", run: "AGI",
      seduction: "APP", shipHandling: "AGI", singing: "COM",
      sleightOfHand: "DEX", stealth: "AGI", swim: "AGI", taste: "PER",
      teach: "COM", theology: "CUL", throw: "AGI", torture: "COM",
      track: "PER", axes: "STR", bows: "PER", brawl: "AGI", improvised: "AGI",
      clubs: "AGI", crossbows: "PER", knives: "DEX", longswords: "STR",
      maces: "STR", shields: "STR", slings: "PER", spears: "AGI",
      swords: "DEX"
    };
    return attrs[key] ?? "—";
  });
}
