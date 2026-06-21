export default class AquelarreItemSheet extends ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["aquelarre", "sheet", "item"],
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
    return `systems/aquelarre/templates/item/${type}-sheet.html`;
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
