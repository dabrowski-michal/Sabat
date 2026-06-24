const VIS_CP_COST = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 5, 6: 5, 7: 10 };
const VIS_PCT_MOD = { 1: 0, 2: -15, 3: -35, 4: -50, 5: -75, 6: -100, 7: -150 };

export default class SabatItem extends Item {

  prepareDerivedData() {
    super.prepareDerivedData();
    if (this.type === "spell") {
      const vis = this.system.vis ?? 1;
      this.system.cpCost = VIS_CP_COST[vis] ?? 1;
      this.system.pctMod = VIS_PCT_MOD[vis] ?? 0;
    }
  }

  async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);
    if (this.type !== "spell") return;

    const sys = changed.system ?? {};

    // Vis comes as string from <select>, force to int
    if (sys.vis !== undefined) {
      if (!changed.system) changed.system = {};
      changed.system.vis = parseInt(sys.vis) || 1;
    }

    const form = sys.form ?? this.system.form;
    const nature = sys.nature ?? this.system.nature;

    if ((sys.form !== undefined || sys.nature !== undefined) && form && nature) {
      const imgName = `${nature}${form}`;
      const imgPath = `https://assets.forge-vtt.com/60cd864e5436577c8d4c2acc/ikony/spells/${imgName}.png`;
      changed.img = imgPath;
    }
  }
}
