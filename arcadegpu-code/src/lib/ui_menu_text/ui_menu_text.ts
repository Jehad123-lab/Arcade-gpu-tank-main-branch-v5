import { UIMenu } from '../ui_menu/ui_menu';
import { UIWidget } from '../ui/ui_widget';
import { MenuAxis } from '../ui_menu/ui_menu';
import { UIMenuTextItem } from './ui_menu_text_item';
import { eventManager } from '../core/event_manager';
import { gfx2TextureManager } from '../gfx2/gfx2_texture_manager';
import { spritesheetManager } from '../core/spritesheet_manager';
import { FormatJAS, getSpriteAnimation } from '../core/format_jas';

/**
 * A UI widget displaying a simple text menu.
 * It send same events as UIMenu.
 */
class UIMenuText extends UIMenu {
  spritesheetImageUrl: string | null;
  spritesheetJAS: FormatJAS | null;
  spritesheetWidth: number;
  spritesheetHeight: number;
  animationNamesByIds: Map<string, string>;
  animationNamesByIdsOnFocus: Map<string, string>;
  previousImageItemFocused: UIWidget | null;

  constructor(options: { axis?: MenuAxis, className?: string } = {}) {
    super(Object.assign(options, {
      className: options.className ?? 'UIMenuText'
    }));

    this.spritesheetImageUrl = null;
    this.spritesheetJAS = null;
    this.spritesheetWidth = 0;
    this.spritesheetHeight = 0;
    this.animationNamesByIds = new Map();
    this.animationNamesByIdsOnFocus = new Map();
    this.previousImageItemFocused = null;

    eventManager.subscribe(this, 'E_ITEM_FOCUSED', this, this.handleItemFocused);
  }

  /**
   * Free all resources.
   * Warning: You need to call this method to free allocation for this object.
   */
  delete() {
    eventManager.unsubscribe(this, 'E_ITEM_FOCUSED', this.handleItemFocused);
    super.delete();
  }

  /**
   * Add text item.
   * 
   * @param {string} id - The unique identifier of the item.
   * @param {string} text - The text content.
   */
  add(id: string, text: string): void {
    const item = new UIMenuTextItem();
    item.setId(id);
    item.setText(text);
    this.addWidget(item);
  }

  /**
   * Set the text of a menu item.
   * 
   * @param {string} id - The unique identifier of the item.
   * @param {string} text - The text content.
   */
  set(id: string, text: string): void {
    const item = this.widgets.find(w => w.getId() == id) as UIMenuTextItem;
    if (!item) {
      throw new Error('UIMenuText::set(): item not found !');
    }

    item.setText(text);
  }

  /**
   * Set the spritesheet path.
   * 
   * @param {string} imagePath - The spritesheet path (need to be loaded before).
   */
  setSpritesheet(imagePath: string, jasPath: string): void {
    const texture = gfx2TextureManager.getTexture(imagePath);
    this.spritesheetImageUrl = gfx2TextureManager.getTextureURL(imagePath);
    this.spritesheetJAS = spritesheetManager.getSpritesheet(jasPath);
    this.spritesheetWidth = texture.width;
    this.spritesheetHeight = texture.height;
  }

  /**
   * Add text item.
   * 
   * @param {string} id - The unique identifier of the item.
   * @param {string} imageFile - The image of item.
   */
  addImageItem(id: string, animationName: string, animationNameOnFocus: string): void {
    if (!this.spritesheetImageUrl || !this.spritesheetJAS) {
      throw new Error('UIMenuText::addImageItem(): spritesheet not set !');
    }

    const item = new UIMenuTextItem();
    item.setId(id);
    item.setText('');

    const anim = getSpriteAnimation(this.spritesheetJAS, animationName);
    if (anim) {
      item.node.style.backgroundImage = `url(${this.spritesheetImageUrl})`;
      item.node.style.backgroundPositionX = -anim['Frames'][0]['X'] + 'px';
      item.node.style.backgroundPositionY = -anim['Frames'][0]['Y'] + 'px';
      item.node.style.width = anim['Frames'][0]['Width'] + 'px';
      item.node.style.height = anim['Frames'][0]['Height'] + 'px';
      item.node.style.backgroundSize = `${this.spritesheetWidth}px ${this.spritesheetHeight}px`;
    }

    this.animationNamesByIds.set(id, animationName);
    this.animationNamesByIdsOnFocus.set(id, animationNameOnFocus);
    this.addWidget(item);
  }

  /**
   * Removes an item.
   * 
   * @param {string} id - The unique identifier of the item.
   */
  remove(id: string): void {
    const widgetIndex = this.widgets.findIndex(w => w.getId() == id);
    if (widgetIndex == -1) {
      throw new Error('UIMenuText::remove(): item not found !');
    }

    this.removeWidget(widgetIndex);
  }

  /**
   * Returns the selected widget ID as a string or null.
   */
  getSelectedId(): string | null {
    return this.getSelectedWidgetId();
  }

  handleItemFocused(data: any) {
    if (!this.spritesheetJAS) {
      return;
    }
    if (!this.animationNamesByIds.has(data.id)) {
      return;
    }

    if (this.previousImageItemFocused) {
      const animationName = this.animationNamesByIds.get(this.previousImageItemFocused.getId())!;
      const animation = getSpriteAnimation(this.spritesheetJAS, animationName);

      this.previousImageItemFocused.node.style.backgroundPositionX = -animation['Frames'][0]['X'] + 'px';
      this.previousImageItemFocused.node.style.backgroundPositionY = -animation['Frames'][0]['Y'] + 'px';
      this.previousImageItemFocused.node.style.width = animation['Frames'][0]['Width'] + 'px';
      this.previousImageItemFocused.node.style.height = animation['Frames'][0]['Height'] + 'px';
    }

    const animationName = this.animationNamesByIdsOnFocus.get(data.id)!;
    const animation = getSpriteAnimation(this.spritesheetJAS, animationName);

    const item = this.widgets[data.index];
    item.node.style.backgroundPositionX = -animation['Frames'][0]['X'] + 'px';
    item.node.style.backgroundPositionY = -animation['Frames'][0]['Y'] + 'px';
    item.node.style.width = animation['Frames'][0]['Width'] + 'px';
    item.node.style.height = animation['Frames'][0]['Height'] + 'px';

    this.previousImageItemFocused = item;
  }
}

export { UIMenuText };