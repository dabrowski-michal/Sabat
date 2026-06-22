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

const SKILL_LABELS = {
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
  crossbows: "Crossbows", improvised: "Improvised", knives: "Knives",
  longswords: "Longswords", maces: "Maces", shields: "Shields",
  slings: "Slings", spears: "Spears", swords: "Swords"
};

const SKILL_ATTRS = {
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
  teach: "COM", theology: "CUL", throw: "AGI", torture: "COM", track: "PER"
};

const GENERAL_SKILL_GROUPS = [
  { attrKey: "agi", label: "Agility", keys: ["climb","dodge","jump","ride","run","shipHandling","sleightOfHand","stealth","swim","throw"] },
  { attrKey: "com", label: "Communication", keys: ["command","commerce","courtEtiquette","disguise","eloquence","singing","teach","torture"] },
  { attrKey: "cul", label: "Culture", keys: ["alchemy","animalKnowledge","areaKnowledge","astrology","games","language","legends","magicalKnowledge","medicine","mineralKnowledge","music","plantKnowledge","readWrite","theology"] },
  { attrKey: "dex", label: "Dexterity", keys: ["conceal","craft","drive","heal","pickLock"] },
  { attrKey: "per", label: "Perception", keys: ["discovery","empathy","listen","memory","taste","track"] },
  { attrKey: "app", label: "Appearance", keys: ["seduction"] }
];

const COMBAT_SKILL_KEYS = [
  "axes", "bows", "brawl", "clubs", "crossbows", "improvised",
  "knives", "longswords", "maces", "shields", "slings", "spears", "swords"
];

export default class SabatActorSheet extends ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sabat", "sheet", "actor"],
      template: "systems/sabat/templates/actor/character-sheet.html",
      width: 820,
      height: 880,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "characteristics" }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
    });
  }

  getData() {
    const context = super.getData();
    const actorData = this.actor.toObject(false);
    context.system = actorData.system;
    context.flags = actorData.flags;
    if (this.actor.type === "character") this._prepareCharacterContext(context);
    return context;
  }

  _prepareCharacterContext(context) {
    const system = context.system;
    const customSkills = system.customSkills ?? {};
    const favSkills = system.favorites?.skills ?? {};
    const favWeapons = system.favorites?.weapons ?? {};

    // Header display labels + character title
    const KINGDOMS = {
      "lesser-poland": "Duchy of Lesser Poland", "silesia": "Duchies of Silesia", "masovia": "Duchy of Masovia",
      "hungary": "Kingdom of Hungary", "rus": "Rus' Principalities", "greater-poland": "Duchy of Greater Poland",
      "teutonic": "Teutonic Order", "bohemia": "Kingdom of Bohemia", "yotvingia": "Yotvingia",
      "pomerania": "Duchy of Pomerania", "brandenburg": "Margraviate of Brandenburg",
      "lithuania": "Grand Duchy of Lithuania", "venice": "Republic of Venice",
      "scandinavia": "Scandinavian Kingdoms", "hre": "Holy Roman Empire", "papal": "Papal States",
      "byzantium": "Byzantine Empire", "france": "Kingdom of France", "england": "Kingdom of England",
      "golden-horde": "Golden Horde", "iberia": "Iberian Kingdoms", "arabia": "Arabian Emirates",
      "jewish-diaspora": "Jewish Diaspora"
    };
    const PEOPLES = {
      "lesser-polish": "Lesser Polish", "silesian": "Silesian", "masovian": "Masovian",
      "hungarian": "Hungarian", "ruthenian": "Ruthenian", "greater-polish": "Greater Polish",
      "teutonic": "Teutonic", "bohemian": "Bohemian", "yotvingian": "Yotvingian",
      "pomeranian": "Pomeranian", "brandenburgian": "Brandenburgian", "lithuanian": "Lithuanian",
      "venetian": "Venetian", "norse": "Norse", "german": "German", "italian": "Italian",
      "greek": "Greek", "french": "French", "english": "English", "mongol": "Mongol",
      "iberian": "Iberian", "saracen": "Saracen", "jewish": "Jewish"
    };
    const CLASSES = { "upper-nobility": "Upper Nobility", "lower-nobility": "Lower Nobility", burgher: "Burgher", townsfolk: "Townsfolk", peasant: "Peasant", slave: "Slave" };

    const peopleLabel = PEOPLES[system.background.people] ?? "";
    const kingdomLabel = KINGDOMS[system.background.kingdom] ?? "";
    context.kingdomLabel = kingdomLabel;
    context.peopleLabel = peopleLabel;
    context.socialClassLabel = CLASSES[system.background.socialClass] ?? "";
    context.genderLabel = system.gender === "female" ? "Female" : "Male";

    // Nationality icon
    const iconBase = "https://assets.forge-vtt.com/60cd864e5436577c8d4c2acc/ikony/rasy/";
    context.nationalityIcon = peopleLabel ? iconBase + peopleLabel.replace(/ /g, "_") + ".png" : "";

    // Character title
    const bg = system.background;
    const age = bg.age ?? 0;
    const ageDesc = age > 100 ? "Dead" : age >= 76 ? "Decrepit" : age >= 56 ? "Old" : age >= 36 ? "Seasoned" : age >= 20 ? "Adult" : age >= 13 ? "Youthful" : "Childlike";
    const h = bg.height ?? 0;
    const heightDesc = h >= 191 ? "towering" : h >= 176 ? "tall" : h >= 156 ? "average-height" : h >= 131 ? "short" : "tiny";
    const w = bg.weight ?? 0;
    const weightDesc = w >= 116 ? "massive" : w >= 86 ? "stout" : w >= 66 ? "sturdy" : w >= 46 ? "slender" : "frail";
    const genderWord = system.gender === "female" ? "woman" : "man";
    const classDesc = { "upper-nobility": "of high noble birth", "lower-nobility": "of noble birth", burgher: "of the rich burgher class", townsfolk: "of the common townsfolk", peasant: "of peasant stock", slave: "bound as a slave" };
    const socialPhrase = classDesc[bg.socialClass] ?? "";
    const profession = bg.profession || "";

    let title = "";
    if (peopleLabel || profession) {
      const parts = [age ? ageDesc : "", peopleLabel, profession].filter(Boolean).join(" ");
      if (kingdomLabel) title = `${parts} from ${kingdomLabel}`;
      else title = parts;
      const article = /^[aeiou]/i.test(heightDesc) ? "an" : "a";
      title += `, ${article} ${heightDesc} and ${weightDesc} ${genderWord}`;
      if (socialPhrase) title += ` ${socialPhrase}`;
      title += ".";
    }
    context.characterTitle = title;

    // Skill groups
    context.skillGroups = GENERAL_SKILL_GROUPS.map(group => ({
      attrKey: group.attrKey,
      label: group.label,
      skills: group.keys.map(key => ({
        key, label: SKILL_LABELS[key] ?? key,
        skill: system.skills[key] ?? { value: 0, advancement: false },
        isFav: !!favSkills[key]
      })),
      customSkills: Object.entries(customSkills)
        .filter(([, v]) => v.attr === group.attrKey)
        .map(([id, v]) => ({ id, ...v, isFav: !!favSkills[`custom.${id}`] }))
    }));

    context.combatSkills = COMBAT_SKILL_KEYS.map(key => ({
      key,
      skill: system.skills[key] ?? { value: 0, advancement: false },
      isFav: !!favSkills[key]
    }));

    // Items by type
    context.armor  = this.actor.items.filter(i => i.type === "armor");
    context.items  = this.actor.items.filter(i => i.type === "item");
    context.spells = this.actor.items.filter(i => i.type === "spell");

    // Weapons with linked skill info
    context.weaponsData = this.actor.items.filter(i => i.type === "weapon").map(w => {
      const sk = w.system.skill || "improvised";
      return {
        id: w.id, name: w.name, system: w.system,
        skillLabel: SKILL_LABELS[sk] ?? sk,
        skillValue: system.skills[sk]?.value ?? 0,
        isFav: !!favWeapons[w.id]
      };
    });

    // Favourite skills (read-only)
    context.favSkillsList = [];
    for (const [key, val] of Object.entries(favSkills)) {
      if (!val) continue;
      if (key.startsWith("custom.")) {
        const csId = key.slice(7);
        const cs = customSkills[csId];
        if (cs) context.favSkillsList.push({ key, label: cs.name, value: cs.value, advancement: cs.advancement });
      } else {
        const sk = system.skills[key];
        if (sk) context.favSkillsList.push({ key, label: SKILL_LABELS[key] ?? key, value: sk.value, advancement: sk.advancement });
      }
    }

    // Favourite weapons (read-only, with skill info)
    context.favWeaponsList = [];
    for (const [itemId, val] of Object.entries(favWeapons)) {
      if (!val) continue;
      const w = this.actor.items.get(itemId);
      if (!w) continue;
      const sk = w.system.skill || "improvised";
      context.favWeaponsList.push({
        id: w.id, name: w.name, system: w.system,
        skillLabel: SKILL_LABELS[sk] ?? sk,
        skillValue: system.skills[sk]?.value ?? 0
      });
    }

    // HP bar
    context.hpPct = system.health.max > 0 ? Math.round((system.health.value / system.health.max) * 100) : 0;

    // Paper doll
    const gender = system.gender ?? "male";
    context.bodyImage = gender === "female"
      ? "https://assets.forge-vtt.com/60cd864e5436577c8d4c2acc/paperdoll/base_woman.png"
      : "https://assets.forge-vtt.com/60cd864e5436577c8d4c2acc/paperdoll/base_man.png";

    const validLayers = new Set(["weapon", "legs", "boots", "chest", "head", "hands"]);
    const paperDoll = {};
    for (const item of this.actor.items) {
      const layer = item.system.paperDollLayer;
      if (item.system.equipped && layer && validLayers.has(layer)) paperDoll[layer] = item.img;
    }
    context.paperDoll = paperDoll;

    // Alignment portrait background
    const rr = system.secondaryCharacteristics.rr ?? 50;
    const bgBase = "https://assets.forge-vtt.com/60cd864e5436577c8d4c2acc/ikony/sheet/";
    context.alignmentBackground = rr >= 66 ? bgBase + "good.png" : rr >= 33 ? bgBase + "neutral.png" : bgBase + "evil.png";
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find(".skill-roll-btn").click(this._onSkillRollBtn.bind(this));
    html.find(".weapon-roll-btn").click(this._onWeaponRoll.bind(this));
    html.find(".skill-add").click(this._onAddCustomSkill.bind(this));
    html.find(".skill-delete").click(this._onSkillDelete.bind(this));
    html.find(".custom-skill-delete").click(this._onDeleteCustomSkill.bind(this));
    html.find(".skill-edit").click(this._onSkillEdit.bind(this));
    html.find(".fav-toggle").click(this._onToggleFavorite.bind(this));

    html.find(".item-create").click(this._onItemCreate.bind(this));
    html.find(".item-edit").click(ev => {
      const li = $(ev.currentTarget).closest("[data-item-id]");
      const item = this.actor.items.get(li.data("itemId"));
      if (item) item.sheet.render(true);
    });
    html.find(".item-delete").click(ev => {
      const li = $(ev.currentTarget).closest("[data-item-id]");
      const item = this.actor.items.get(li.data("itemId"));
      if (item) item.delete();
    });

    html.find(".item-equip-toggle").click(async ev => {
      const li = $(ev.currentTarget).closest("[data-item-id]");
      const item = this.actor.items.get(li.data("itemId"));
      if (item) await item.update({ "system.equipped": !item.system.equipped });
    });

    // Slider fill helper — updates gradient to show filled portion
    function updateFill(el, fillColor, baseColor) {
      const pct = el.max > el.min ? ((el.value - el.min) / (el.max - el.min)) * 100 : 0;
      const base = baseColor || "transparent";
      el.style.background = `linear-gradient(to right, ${fillColor} ${pct}%, ${base} ${pct}%)`;
    }

    const SLIDER_FILLS = {
      "hp-slider":   { fill: "#c0392b" },
      "luck-slider": { fill: "#2d8a2d" },
      "rr-slider":   { fill: "#d4a528", base: "#4a0a1a" },
      "cp-slider":   { fill: "#6a1b3a" },
      "fp-slider":   { fill: "#d4a528" }
    };

    // Init fills + bind live updates
    for (const [id, colors] of Object.entries(SLIDER_FILLS)) {
      const el = html.find(`#${id}`)[0];
      if (!el) continue;
      updateFill(el, colors.fill, colors.base);
      el.addEventListener("input", () => updateFill(el, colors.fill, colors.base));
    }

    // RR slider extra: update display + portrait background
    const bgBase = "https://assets.forge-vtt.com/60cd864e5436577c8d4c2acc/ikony/sheet/";
    html.find("#rr-slider").on("input", function () {
      const rr = parseInt(this.value);
      html.find("#rr-display").text(rr);
      html.find("#irr-display").text(100 - rr);
      const src = rr >= 66 ? bgBase + "good.png" : rr >= 33 ? bgBase + "neutral.png" : bgBase + "evil.png";
      html.find("#portrait-bg-layer").attr("src", src);
    });

    // Other sliders: update display values
    html.find("#hp-slider").on("input", function () { html.find("#hp-current-display").text(this.value); });
    html.find("#luck-slider").on("input", function () { html.find("#luck-current-display").text(this.value); });
    html.find("#cp-slider").on("input", function () { html.find("#cp-current-display").text(this.value); });
    html.find("#fp-slider").on("input", function () { html.find("#fp-current-display").text(this.value); });
  }

  // --- Skill roll ---
  async _onSkillRollBtn(event) {
    event.preventDefault();
    const el = event.currentTarget;
    await this._rollSkillCheck(el.dataset.label, parseInt(el.dataset.target) || 0);
  }

  async _rollSkillCheck(skillLabel, target) {
    const roll = await new Roll("1d100").evaluate({ async: true });
    const d = roll.total;
    const margin = target - d;
    let resultLabel, resultClass, marginText;

    if (d <= 5) { resultLabel = "Auto-Success ★"; resultClass = "result-critical"; marginText = "(Automatic)"; }
    else if (d >= 96) { resultLabel = "Auto-Failure ✗"; resultClass = "result-blunder"; marginText = "(Automatic)"; }
    else if (d <= target) {
      const ct = Math.max(1, Math.floor(target * 0.1));
      resultLabel = d <= ct ? "Critical Success! ★★" : "Success ✓";
      resultClass = d <= ct ? "result-critical" : "result-success";
      marginText = `(Beat target by ${margin})`;
    } else {
      const bt = target + Math.floor((100 - target) * 0.9) + 1;
      resultLabel = d >= bt ? "Blunder! ✗✗" : "Failure ✗";
      resultClass = d >= bt ? "result-blunder" : "result-failure";
      marginText = `(Missed target by ${Math.abs(margin)})`;
    }

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<div class="sabat-roll"><strong>${skillLabel}</strong>
        <div class="roll-details">Rolled <strong>${d}</strong> vs target <strong>${target}%</strong></div>
        <div class="roll-result ${resultClass}">${resultLabel} <span class="margin-text">${marginText}</span></div></div>`,
      rollMode: game.settings.get("core", "rollMode")
    });
  }

  // --- Weapon roll: skill check then damage button ---
  async _onWeaponRoll(event) {
    event.preventDefault();
    const li = $(event.currentTarget).closest("[data-item-id]");
    const item = this.actor.items.get(li.data("itemId"));
    if (!item) return;

    const skillKey = item.system.skill || "improvised";
    const skillData = this.actor.system.skills[skillKey] ?? { value: 0 };
    const skillLabel = SKILL_LABELS[skillKey] ?? skillKey;
    const target = skillData.value;

    const roll = await new Roll("1d100").evaluate({ async: true });
    const d = roll.total;
    const margin = target - d;
    let resultLabel, resultClass, marginText;

    if (d <= 5) { resultLabel = "Auto-Success ★"; resultClass = "result-critical"; marginText = "(Automatic)"; }
    else if (d >= 96) { resultLabel = "Auto-Failure ✗"; resultClass = "result-blunder"; marginText = "(Automatic)"; }
    else if (d <= target) {
      const ct = Math.max(1, Math.floor(target * 0.1));
      resultLabel = d <= ct ? "Critical Success! ★★" : "Success ✓";
      resultClass = d <= ct ? "result-critical" : "result-success";
      marginText = `(Beat target by ${margin})`;
    } else {
      const bt = target + Math.floor((100 - target) * 0.9) + 1;
      resultLabel = d >= bt ? "Blunder! ✗✗" : "Failure ✗";
      resultClass = d >= bt ? "result-blunder" : "result-failure";
      marginText = `(Missed target by ${Math.abs(margin)})`;
    }

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<div class="sabat-roll"><strong>${item.name}</strong> — <em>${skillLabel}</em>
        <div class="roll-details">Rolled <strong>${d}</strong> vs target <strong>${target}%</strong></div>
        <div class="roll-result ${resultClass}">${resultLabel} <span class="margin-text">${marginText}</span></div>
        <button class="chat-damage-btn" data-item-id="${item.id}">🗡 Roll Damage</button></div>`,
      rollMode: game.settings.get("core", "rollMode")
    });
  }

  // --- Favourites ---
  async _onToggleFavorite(event) {
    event.preventDefault();
    const el = event.currentTarget;
    const { favType, favKey } = el.dataset;
    const current = this.actor.system.favorites?.[favType]?.[favKey];
    if (current) await this.actor.update({ [`system.favorites.${favType}.-=${favKey}`]: null });
    else await this.actor.update({ [`system.favorites.${favType}.${favKey}`]: true });
  }

  // --- Skill edit dialog ---
  async _onSkillEdit(event) {
    event.preventDefault();
    const el = event.currentTarget;
    const skillKey = el.dataset.skill;
    const customId = el.dataset.customId;

    if (customId) {
      const cs = this.actor.system.customSkills[customId];
      if (!cs) return;
      new Dialog({
        title: `Edit: ${cs.name}`,
        content: `<div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div><label style="font-size:.8em;font-weight:bold">Name</label><input type="text" id="cs-name" value="${cs.name}" style="width:100%" /></div>
          <div><label style="font-size:.8em;font-weight:bold">Value</label><input type="number" id="cs-val" value="${cs.value}" min="0" max="200" style="width:100%" /></div>
          <div><label style="font-size:.8em;font-weight:bold"><input type="checkbox" id="cs-adv" ${cs.advancement ? "checked" : ""} /> Advancement</label></div>
        </div>`,
        buttons: {
          save: { label: "Save", callback: html => {
            const name = html.find("#cs-name").val().trim() || cs.name;
            const value = parseInt(html.find("#cs-val").val()) || 0;
            const advancement = html.find("#cs-adv").is(":checked");
            this.actor.update({ [`system.customSkills.${customId}`]: { ...cs, name, value, advancement } });
          }},
          cancel: { label: "Cancel" }
        },
        default: "save"
      }).render(true);
    } else if (skillKey) {
      const sk = this.actor.system.skills[skillKey] ?? { value: 0, advancement: false };
      const label = SKILL_LABELS[skillKey] ?? skillKey;
      const attr = SKILL_ATTRS[skillKey] ?? "—";
      new Dialog({
        title: `Edit: ${label}`,
        content: `<div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div><label style="font-size:.8em;font-weight:bold">Name</label><input type="text" value="${label}" disabled style="width:100%" /></div>
          <div><label style="font-size:.8em;font-weight:bold">Attribute</label><input type="text" value="${attr}" disabled style="width:100%" /></div>
          <div><label style="font-size:.8em;font-weight:bold">Value</label><input type="number" id="sk-val" value="${sk.value}" min="0" max="200" style="width:100%" /></div>
          <div><label style="font-size:.8em;font-weight:bold"><input type="checkbox" id="sk-adv" ${sk.advancement ? "checked" : ""} /> Advancement</label></div>
        </div>`,
        buttons: {
          save: { label: "Save", callback: html => {
            const value = parseInt(html.find("#sk-val").val()) || 0;
            const advancement = html.find("#sk-adv").is(":checked");
            this.actor.update({ [`system.skills.${skillKey}.value`]: value, [`system.skills.${skillKey}.advancement`]: advancement });
          }},
          cancel: { label: "Cancel" }
        },
        default: "save"
      }).render(true);
    }
  }

  // --- Skill delete (reset built-in to 0) ---
  async _onSkillDelete(event) {
    event.preventDefault();
    const key = event.currentTarget.dataset.skill;
    if (!key) return;
    await this.actor.update({
      [`system.skills.${key}.value`]: 0,
      [`system.skills.${key}.advancement`]: false,
      [`system.favorites.skills.-=${key}`]: null
    });
  }

  // --- Custom skill management ---
  async _onAddCustomSkill(event) {
    event.preventDefault();
    const attrKey = event.currentTarget.dataset.attr;
    const name = await new Promise(resolve => {
      new Dialog({
        title: `Add Skill (${attrKey.toUpperCase()})`,
        content: `<div style="margin-bottom:8px"><label>Skill name:</label>
          <input type="text" id="custom-skill-name" style="width:100%;margin-top:4px" autofocus /></div>`,
        buttons: {
          ok: { label: "Add", callback: html => resolve(html.find("#custom-skill-name").val().trim()) },
          cancel: { label: "Cancel", callback: () => resolve(null) }
        },
        default: "ok"
      }).render(true);
    });
    if (!name) return;
    await this.actor.update({ [`system.customSkills.cs_${Date.now()}`]: { name, attr: attrKey, value: 0, advancement: false } });
  }

  async _onDeleteCustomSkill(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.customId;
    await this.actor.update({ [`system.customSkills.-=${id}`]: null, [`system.favorites.skills.-=custom.${id}`]: null });
  }

  // --- Items ---
  async _onItemCreate(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.type;
    return await Item.create({ name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`, type }, { parent: this.actor });
  }

  async _onDropItemCreate(itemData) { return super._onDropItemCreate(itemData); }
}
