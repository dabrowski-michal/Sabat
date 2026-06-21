import SabatActor from "./module/actor/actor.js";
import SabatActorSheet from "./module/actor/actor-sheet.js";
import SabatItem from "./module/item/item.js";
import SabatItemSheet from "./module/item/item-sheet.js";

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
      crossbows: "Crossbows", knives: "Knives", longswords: "Longswords",
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
      track: "PER", axes: "STR", bows: "PER", brawl: "AGI",
      clubs: "AGI", crossbows: "PER", knives: "DEX", longswords: "STR",
      maces: "STR", shields: "STR", slings: "PER", spears: "AGI",
      swords: "DEX"
    };
    return attrs[key] ?? "—";
  });
}
