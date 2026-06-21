export default class SabatActor extends Actor {

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

    // Max HP = VIT
    system.health.max = ch.vit;

    // Luck = COM + PER + CUL
    sec.luckInitial = ch.com + ch.per + ch.cul;

    // IRR is bound to RR
    sec.irr = 100 - sec.rr;

    // Max CP = ceil(IRR * 0.2)
    sec.concentrationPoints.max = Math.ceil(sec.irr * 0.2);

    // Max FP = ceil(RR * 0.2)
    sec.faithPoints.max = Math.ceil(sec.rr * 0.2);

    // Clamp current HP
    if (system.health.value > system.health.max) {
      system.health.value = system.health.max;
    }

    // Derived protection from equipped armor items
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
