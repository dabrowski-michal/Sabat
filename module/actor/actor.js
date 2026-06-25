const DEFAULT_SKILLS = [
  // Combat skills (auto-created)
  { name: "Axes", system: { attribute: "Strength", combat: true } },
  { name: "Bows", system: { attribute: "Perception", combat: true } },
  { name: "Brawl", system: { attribute: "Agility", combat: true } },
  { name: "Clubs", system: { attribute: "Agility", combat: true } },
  { name: "Crossbows", system: { attribute: "Perception", combat: true } },
  { name: "Improvised", system: { attribute: "Agility", combat: true } },
  { name: "Knives", system: { attribute: "Dexterity", combat: true } },
  { name: "Longswords", system: { attribute: "Strength", combat: true } },
  { name: "Maces", system: { attribute: "Strength", combat: true } },
  { name: "Shields", system: { attribute: "Strength", combat: true } },
  { name: "Slings", system: { attribute: "Perception", combat: true } },
  { name: "Spears", system: { attribute: "Agility", combat: true } },
  { name: "Swords", system: { attribute: "Dexterity", combat: true } },
  // Key general skills (auto-created)
  { name: "Dodge", system: { attribute: "Agility", combat: false } },
  { name: "Heal", system: { attribute: "Dexterity", combat: false } },
  { name: "Discovery", system: { attribute: "Perception", combat: false } },
  { name: "Stealth", system: { attribute: "Agility", combat: false } },
  { name: "Teach", system: { attribute: "Communication", combat: false } },
  { name: "Theology", system: { attribute: "Culture", combat: false } },
  { name: "Magical Knowledge", system: { attribute: "Culture", combat: false } },
];

export default class SabatActor extends Actor {

  async _onCreate(data, options, userId) {
    await super._onCreate(data, options, userId);
    if (this.type !== "character" || game.user.id !== userId) return;
    if (this.items.filter(i => i.type === "skill").length > 0) return;

    const skillItems = DEFAULT_SKILLS.map(s => ({
      name: s.name,
      type: "skill",
      system: { attribute: s.system.attribute, combat: s.system.combat, advancement: false, value: 0, description: "" }
    }));
    await this.createEmbeddedDocuments("Item", skillItems);
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    const system = this.system;

    if (this.type === "character") {
      this._prepareCharacterData(system);
    }
  }

  _prepareCharacterData(system) {
    const ch = system.characteristics;
    const sec = system.secondaryCharacteristics;

    system.health.max = ch.vit;
    sec.luckInitial = ch.com + ch.per + ch.cul;
    sec.irr = 100 - sec.rr;
    sec.concentrationPoints.max = Math.ceil(sec.irr * 0.2);
    sec.faithPoints.max = Math.ceil(sec.rr * 0.2);

    if (system.health.value > system.health.max) {
      system.health.value = system.health.max;
    }

    const locs = ["head", "rightArm", "leftArm", "chest", "abdomen", "rightLeg", "leftLeg"];
    system.protection = Object.fromEntries(locs.map(l => [l, 0]));
    for (const item of this.items) {
      if (item.type !== "armor" || !item.system.equipped) continue;
      const prot = item.system.protection ?? 0;
      for (const loc of locs) {
        if (item.system.locations?.[loc]) system.protection[loc] += prot;
      }
    }
  }
}
