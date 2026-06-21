const HIT_LOCATION_LABELS = {
  head: "Head", rightArm: "Right Arm", leftArm: "Left Arm",
  chest: "Chest", abdomen: "Abdomen", rightLeg: "Right Leg", leftLeg: "Left Leg"
};

function _hitLocationKey(d10) {
  if (d10 === 1)  return "head";
  if (d10 === 2)  return "rightArm";
  if (d10 === 3)  return "leftArm";
  if (d10 <= 6)  return "chest";
  if (d10 <= 8)  return "abdomen";
  if (d10 === 9)  return "rightLeg";
  return "leftLeg";
}

export default class SabatActorSheet extends ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sabat", "sheet", "actor"],
      template: "systems/sabat/templates/actor/character-sheet.html",
      width: 780,
      height: 880,
      tabs: [{
        navSelector: ".sheet-tabs",
        contentSelector: ".sheet-body",
        initial: "characteristics"
      }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
    });
  }

  getData() {
    const context = super.getData();
    const actorData = this.actor.toObject(false);
    context.system = actorData.system;
    context.flags = actorData.flags;

    if (this.actor.type === "character") {
      this._prepareCharacterContext(context);
    }

    return context;
  }

  _prepareCharacterContext(context) {
    const system = context.system;

    // Split skills into general and combat groups
    const generalSkillKeys = [
      "alchemy", "animalKnowledge", "areaKnowledge", "astrology", "climb",
      "command", "commerce", "conceal", "courtEtiquette", "craft",
      "discovery", "disguise", "dodge", "drive", "eloquence", "empathy",
      "games", "heal", "jump", "language", "legends", "listen",
      "magicalKnowledge", "medicine", "memory", "mineralKnowledge", "music",
      "pickLock", "plantKnowledge", "readWrite", "ride", "run", "seduction",
      "shipHandling", "singing", "sleightOfHand", "stealth", "swim", "taste",
      "teach", "theology", "throw", "torture", "track"
    ];
    const combatSkillKeys = [
      "axes", "bows", "brawl", "clubs", "crossbows", "knives",
      "longswords", "maces", "shields", "slings", "spears", "swords"
    ];

    context.generalSkills = generalSkillKeys.map(key => ({
      key,
      skill: system.skills[key]
    }));
    context.combatSkills = combatSkillKeys.map(key => ({
      key,
      skill: system.skills[key]
    }));

    // Bucket items by type
    context.weapons = this.actor.items.filter(i => i.type === "weapon");
    context.armor   = this.actor.items.filter(i => i.type === "armor");
    context.items   = this.actor.items.filter(i => i.type === "item");
    context.spells  = this.actor.items.filter(i => i.type === "spell");

    // HP bar percentage
    context.hpPct = system.health.max > 0
      ? Math.round((system.health.value / system.health.max) * 100)
      : 0;

    // Paper doll base image
    const gender = system.gender ?? "male";
    context.bodyImage = `systems/sabat/assets/base_${gender}.png`;

    // Build paper doll layer map from equipped items
    const validLayers = new Set(["weapon", "legs", "boots", "chest", "head", "hands"]);
    const paperDoll = {};
    for (const item of this.actor.items) {
      const layer = item.system.paperDollLayer;
      if (item.system.equipped && layer && validLayers.has(layer)) {
        paperDoll[layer] = item.img;
      }
    }
    context.paperDoll = paperDoll;
  }

  activateListeners(html) {
    super.activateListeners(html);

    if (!this.isEditable) return;

    // Skill roll
    html.find(".skill-roll").click(this._onSkillRoll.bind(this));

    // Item management
    html.find(".item-create").click(this._onItemCreate.bind(this));
    html.find(".item-edit").click(ev => {
      const li = $(ev.currentTarget).closest(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });
    html.find(".item-delete").click(ev => {
      const li = $(ev.currentTarget).closest(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
    });

    // Weapon damage roll
    html.find(".damage-roll").click(this._onDamageRoll.bind(this));

    // Equip/unequip toggle
    html.find(".item-equip-toggle").click(async ev => {
      const li = $(ev.currentTarget).closest(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if (!item) return;
      await item.update({ "system.equipped": !item.system.equipped });
    });
  }

  async _onSkillRoll(event) {
    event.preventDefault();
    const el = event.currentTarget;
    const skillKey = el.dataset.skill;
    const skillLabel = el.dataset.label;
    const target = parseInt(el.dataset.target) || 0;

    const roll = await new Roll("1d100").evaluate({ async: true });
    const d = roll.total;

    let resultLabel, resultClass, marginText;
    const margin = target - d;

    if (d <= 5) {
      resultLabel = "Auto-Success ★";
      resultClass = "result-critical";
      marginText  = "(Automatic)";
    } else if (d >= 96) {
      resultLabel = "Auto-Failure ✗";
      resultClass = "result-blunder";
      marginText  = "(Automatic)";
    } else if (d <= target) {
      const critThreshold = Math.max(1, Math.floor(target * 0.1));
      if (d <= critThreshold) {
        resultLabel = "Critical Success! ★★";
        resultClass = "result-critical";
      } else {
        resultLabel = "Success ✓";
        resultClass = "result-success";
      }
      marginText = `(Beat target by ${margin})`;
    } else {
      const failRange = 100 - target;
      const blunderThreshold = target + Math.floor(failRange * 0.9) + 1;
      if (d >= blunderThreshold) {
        resultLabel = "Blunder! ✗✗";
        resultClass = "result-blunder";
      } else {
        resultLabel = "Failure ✗";
        resultClass = "result-failure";
      }
      marginText = `(Missed target by ${Math.abs(margin)})`;
    }

    const flavor = `
      <div class="sabat-roll">
        <strong>${skillLabel}</strong>
        <div class="roll-details">Rolled <strong>${d}</strong> vs target <strong>${target}%</strong></div>
        <div class="roll-result ${resultClass}">${resultLabel} <span class="margin-text">${marginText}</span></div>
      </div>`;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor,
      rollMode: game.settings.get("core", "rollMode")
    });
  }

  async _onDamageRoll(event) {
    event.preventDefault();
    const li = $(event.currentTarget).closest(".item");
    const item = this.actor.items.get(li.data("itemId"));
    if (!item) return;

    const formula = item.system.damage || "1d6";
    const [damageRoll, locRoll] = await Promise.all([
      new Roll(formula).evaluate({ async: true }),
      new Roll("1d10").evaluate({ async: true })
    ]);

    const locKey   = _hitLocationKey(locRoll.total);
    const locLabel = HIT_LOCATION_LABELS[locKey];

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
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
  }

  async _onItemCreate(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.type;
    const itemData = {
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type
    };
    return await Item.create(itemData, { parent: this.actor });
  }

  // Allow dropping items onto the sheet
  async _onDropItemCreate(itemData) {
    return super._onDropItemCreate(itemData);
  }
}
