const VIS_CP_COST = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 5, 6: 5, 7: 10 };
const VIS_PCT_MOD = { 1: 0, 2: -15, 3: -35, 4: -50, 5: -75, 6: -100, 7: -150 };

const ORDO_PCT_MOD = { 1: 0, 2: -20, 3: -40, 4: -60, 5: -80, 6: -100 };
const ORDO_FP_REQ = { 1: 10, 2: 13, 3: 15, 4: 18, 5: 20, 6: 20 };

const ASSET_BASE = "https://assets.forge-vtt.com/60cd864e5436577c8d4c2acc/";
const ICON_DEFAULTS = {
  item:       ASSET_BASE + "ui/icons/items/default.png",
  weapon:     ASSET_BASE + "ui/icons/paperdoll/default.png",
  armor:      ASSET_BASE + "ui/icons/paperdoll/default.png",
  spell:      ASSET_BASE + "ui/icons/spells/default.png",
  ritual:     ASSET_BASE + "ui/icons/rituals/default.png",
  trait:      ASSET_BASE + "ui/icons/boons/default.png",
  skill:      ASSET_BASE + "ui/icons/skills/default.png",
  affliction: ASSET_BASE + "ui/icons/afflictions/default.png",
};
const FOUNDRY_DEFAULT = "icons/svg/item-bag.svg";

export default class SabatItem extends Item {

  prepareDerivedData() {
    super.prepareDerivedData();
    if (this.type === "spell") {
      const vis = this.system.vis ?? 1;
      this.system.cpCost = VIS_CP_COST[vis] ?? 1;
      this.system.pctMod = VIS_PCT_MOD[vis] ?? 0;
    }
    if (this.type === "ritual") {
      const ordo = this.system.ordo ?? 1;
      this.system.pctMod = ORDO_PCT_MOD[ordo] ?? 0;
      this.system.fpRequired = ORDO_FP_REQ[ordo] ?? 10;
    }
  }

  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    if (!data.img || data.img === FOUNDRY_DEFAULT) {
      const fallback = ICON_DEFAULTS[data.type];
      if (fallback) this.updateSource({ img: fallback });
    }
    if (data.type === "trait") {
      const traitType = data.system?.traitType ?? "boon";
      const folder = traitType === "bane" ? "banes" : "boons";
      this.updateSource({ img: ASSET_BASE + "ui/icons/" + folder + "/default.png" });
    }
  }

  async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);

    const sys = changed.system ?? {};

    if (this.type === "spell") {
      if (sys.vis !== undefined) {
        if (!changed.system) changed.system = {};
        changed.system.vis = parseInt(sys.vis) || 1;
      }
      const form = sys.form ?? this.system.form;
      const nature = sys.nature ?? this.system.nature;
      if ((sys.form !== undefined || sys.nature !== undefined) && form && nature) {
        changed.img = ASSET_BASE + `ui/icons/spells/${nature.toLowerCase()}${form}.png`;
      }
    }

    if (this.type === "ritual") {
      if (sys.ordo !== undefined) {
        if (!changed.system) changed.system = {};
        changed.system.ordo = parseInt(sys.ordo) || 1;
      }
    }

    if (this.type === "trait") {
      const traitType = sys.traitType ?? this.system.traitType;
      if (sys.traitType !== undefined && traitType) {
        const folder = traitType === "bane" ? "banes" : "boons";
        changed.img = ASSET_BASE + "ui/icons/" + folder + "/default.png";
      }
    }
  }
}
