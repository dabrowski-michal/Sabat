export default class AquelarreActorSheet extends ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["aquelarre", "sheet", "actor"],
      template: "systems/aquelarre/templates/actor/character-sheet.html",
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
    context.weapons   = this.actor.items.filter(i => i.type === "weapon");
    context.equipment = this.actor.items.filter(i => i.type === "equipment");
    context.items     = this.actor.items.filter(i => i.type === "item");
    context.spells    = this.actor.items.filter(i => i.type === "spell");

    // HP bar percentage
    context.hpPct = system.health.max > 0
      ? Math.round((system.health.value / system.health.max) * 100)
      : 0;
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
  }

  async _onSkillRoll(event) {
    event.preventDefault();
    const el = event.currentTarget;
    const skillKey = el.dataset.skill;
    const skillLabel = el.dataset.label;
    const target = parseInt(el.dataset.target) || 0;

    const roll = await new Roll("1d100").evaluate({ async: true });
    const d = roll.total;

    let resultLabel, resultClass;

    if (d <= 5) {
      resultLabel = "Auto-Success ★";
      resultClass = "result-critical";
    } else if (d >= 96) {
      resultLabel = "Auto-Failure ✗";
      resultClass = "result-blunder";
    } else if (d <= target) {
      const critThreshold = Math.max(1, Math.floor(target * 0.1));
      if (d <= critThreshold) {
        resultLabel = "Critical Success! ★★";
        resultClass = "result-critical";
      } else {
        resultLabel = "Success ✓";
        resultClass = "result-success";
      }
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
    }

    const flavor = `
      <div class="aquelarre-roll">
        <strong>${skillLabel}</strong>
        <div class="roll-details">Rolled <strong>${d}</strong> vs target <strong>${target}%</strong></div>
        <div class="roll-result ${resultClass}">${resultLabel}</div>
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
    const roll = await new Roll(formula).evaluate({ async: true });
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<strong>${item.name}</strong> — Damage`
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
