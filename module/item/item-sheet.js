export default class SabatItemSheet extends ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sabat", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{
        navSelector: ".sheet-tabs",
        contentSelector: ".sheet-body",
        initial: "details"
      }]
    });
  }

  get template() {
    const type = this.item.type;
    const valid = ["weapon", "armor", "item", "spell"];
    const resolved = valid.includes(type) ? type : "item";
    return `systems/sabat/templates/item/${resolved}-sheet.html`;
  }

  getData() {
    const context = super.getData();
    const itemData = this.item.toObject(false);
    context.system = itemData.system;
    context.flags = itemData.flags;
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
  }
}
