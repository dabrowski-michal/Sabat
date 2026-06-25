const VIS_LABELS = { 1: "Prima", 2: "Secunda", 3: "Tertia", 4: "Quarta", 5: "Quinta", 6: "Sexta", 7: "Septima" };

const FEMININE_FORMS = new Set(["Invocatio", "Potio"]);

const NATURE_LATIN = {
  Black: { F: "nigra", N: "nigrum" },
  White: { F: "alba", N: "album" }
};

const ORIGIN_LATIN = {
  Folk:       { F: "rustica",    N: "rusticum" },
  Alchemical: { F: "alchemica",  N: "alchemicum" },
  Infernal:   { F: "infernalis", N: "infernale" },
  Forbidden:  { F: "vetita",     N: "vetitum" }
};

function computeLatinDescription(system) {
  const { form, origin, nature } = system;
  if (!form || !origin || !nature) return "";
  const gender = FEMININE_FORMS.has(form) ? "F" : "N";
  const natureLatin = NATURE_LATIN[nature]?.[gender] ?? "";
  const originLatin = ORIGIN_LATIN[origin]?.[gender] ?? "";
  if (!natureLatin || !originLatin) return "";
  return `${form} ${natureLatin} ${originLatin}`;
}

export default class SabatItemSheet extends ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sabat", "sheet", "item"],
      width: 520,
      height: 560,
      tabs: [{
        navSelector: ".sheet-tabs",
        contentSelector: ".sheet-body",
        initial: "details"
      }]
    });
  }

  get template() {
    const type = this.item.type;
    const valid = ["weapon", "armor", "item", "spell", "ritual", "boon", "bane"];
    const resolved = valid.includes(type) ? type : "item";
    return `systems/sabat/templates/item/${resolved}-sheet.html`;
  }

  getData() {
    const context = super.getData();
    const itemData = this.item.toObject(false);
    context.system = itemData.system;
    context.flags = itemData.flags;

    if (this.item.type === "spell") {
      context.visLabel = VIS_LABELS[itemData.system.vis] ?? "Prima";
      context.latinDescription = computeLatinDescription(itemData.system);
      context.cpCost = this.item.system.cpCost ?? 1;
      context.pctMod = this.item.system.pctMod ?? 0;
    }

    const ORDO_LABELS = { 1: "Primus", 2: "Secundus", 3: "Tertius", 4: "Quartus", 5: "Quintus", 6: "Sextus" };
    if (this.item.type === "ritual") {
      context.ordoLabel = ORDO_LABELS[itemData.system.ordo] ?? "Primus";
      context.pctMod = this.item.system.pctMod ?? 0;
      context.fpRequired = this.item.system.fpRequired ?? 10;
    }

    return context;
  }

  _editMode = true;

  activateListeners(html) {
    super.activateListeners(html);

    const form = html.closest("form");
    const toggleBtn = html.find(".edit-toggle");

    const applyEditMode = () => {
      form.toggleClass("edit-locked", !this._editMode);
      toggleBtn.find("i").attr("class", this._editMode ? "fas fa-lock-open" : "fas fa-lock");
      form.find("input[type='text'], input[type='number'], select, textarea").prop("disabled", !this._editMode);
    };

    toggleBtn.click(ev => {
      ev.preventDefault();
      this._editMode = !this._editMode;
      applyEditMode();
    });

    applyEditMode();
  }
}
