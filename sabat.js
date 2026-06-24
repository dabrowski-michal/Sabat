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

Hooks.on("renderChatMessage", (message, html) => {
  // "Roll Damage" button from weapon skill check
  html.find(".chat-damage-btn").click(async (ev) => {
    const btn = ev.currentTarget;
    const speaker = message.speaker;
    const tokenDoc = speaker.scene ? game.scenes.get(speaker.scene)?.tokens.get(speaker.token) : null;
    const actor = tokenDoc?.actor ?? game.actors.get(speaker.actor);
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

  // --- Spell card: resolve actor helper ---
  function _resolveActor(msg) {
    const sp = msg.speaker;
    const td = sp.scene ? game.scenes.get(sp.scene)?.tokens.get(sp.token) : null;
    return td?.actor ?? game.actors.get(sp.actor);
  }

  // Shared MK roll — uses same card format
  async function _rollMK(actor, target, label, modBreakdown) {
    const roll = await new Roll("1d100").evaluate({ async: true });
    const d = roll.total;
    const margin = target - d;
    const isSuccess = d <= 5 || (d < 96 && d <= target);
    const imgBase = "https://assets.forge-vtt.com/60cd864e5436577c8d4c2acc/ikony/sheet/rolls/";
    const img = isSuccess ? imgBase + "success/1.png" : imgBase + "failure/1.png";

    let resultText, resultClass;
    if (d <= 5) { resultText = "AUTOMATIC SUCCESS"; resultClass = "roll-card-auto-success"; }
    else if (d >= 96) { resultText = "AUTOMATIC FAILURE"; resultClass = "roll-card-auto-fail"; }
    else if (d <= target) {
      const ct = Math.max(1, Math.floor(target * 0.1));
      resultText = d <= ct ? "CRITICAL SUCCESS" : "SUCCESS";
      resultClass = d <= ct ? "roll-card-crit" : "roll-card-success";
    } else {
      const bt = target + Math.floor((100 - target) * 0.9) + 1;
      resultText = d >= bt ? "BLUNDER" : "FAILURE";
      resultClass = d >= bt ? "roll-card-blunder" : "roll-card-fail";
    }

    const marginLabel = isSuccess ? "BEAT BY" : "MISSED BY";
    const isAuto = d <= 5 || d >= 96;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      rolls: [roll],
      content: `
<div class="roll-card">
  <div class="roll-card-title">${label}</div>
  <div class="roll-card-display">
    <img class="roll-card-img" src="${img}" />
    <span class="roll-card-number">${d}</span>
    <img class="roll-card-img roll-card-img-flip" src="${img}" />
  </div>
  <div class="roll-card-result ${resultClass}">${resultText}</div>
  ${isAuto ? "" : `<div class="roll-card-stats"><span>TARGET: <strong>${target}</strong></span><span>${marginLabel}: <strong>${Math.abs(margin)}</strong></span></div>`}
  ${modBreakdown ? `<div class="roll-card-mods">${modBreakdown}</div>` : ""}
</div>`,
      rollMode: game.settings.get("core", "rollMode")
    });
  }

  // Compute total modifier from card inputs
  function _totalMod(card) {
    const visPct = parseInt(card.attr("data-vis-pct")) || 0;
    let total = visPct;
    card.find(".spell-limit-check:checked").each(function () { total += parseInt($(this).attr("data-mod")) || 0; });
    total += parseInt(card.find(".spell-limit-radio:checked").val()) || 0;
    total += (parseInt(card.find(".spell-limit-lp").val()) || 0) * -10;
    total += (parseInt(card.find(".spell-limit-irr").val()) || 0) * -1;
    return total;
  }

  // Live update modifier summary
  html.find(".spell-limit-check, .spell-limit-radio, .spell-limit-number").on("change input", (ev) => {
    const card = $(ev.currentTarget).closest(".sabat-spell-card");
    card.find(".spell-mod-summary").text(`Total modifier: ${_totalMod(card)}%`);
  });

  // Cast Spell button (all modifiers)
  html.find(".spell-cast-btn").click(async (ev) => {
    const card = $(ev.currentTarget).closest(".sabat-spell-card");
    const actor = _resolveActor(message);
    if (!actor) return ui.notifications.warn("Actor not found.");
    const mkVal = actor.system.skills.magicalKnowledge?.value ?? 0;
    const mod = _totalMod(card);
    const target = Math.max(1, mkVal + mod);
    const breakdown = `Magical Knowledge: ${mkVal}% · Modifiers: ${mod}%`;
    await _rollMK(actor, target, "Magical Knowledge", breakdown);
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
