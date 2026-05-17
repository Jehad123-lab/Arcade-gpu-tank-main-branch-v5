import { eventManager } from '../core/event_manager';
import { UIWidget } from '../ui/ui_widget';

/**
 * A UI widget displaying a simple text input.
 * It emit 'E_VALUE_CHANGED' with data { value }
 */
class UIInput extends UIWidget {
  name: string;
  label: string;
  maxLength: number;
  width: number;
  lastPosFocus: number;
  inputEl: HTMLInputElement;
  valueEl: HTMLElement;
  labelEl: HTMLElement;
  handleInputBind: (event: any) => void;

  constructor(options: { name?: string, label?: string, maxLength?: number, width?: number } = {}) {
    super({
      className: 'UIInput',
      template: `
      <div class="UIInput-container">
        <input id="Input${options.name ?? ''}" type="text" class="UIInput-input js-input" value=""/>
        <span class="UIInput-value js-value" dir="rtl"></span>
        <label class="UIInput-label js-label" for="Input${options.name ?? ''}">${options.label ?? ''}</label>
      </div>`
    });

    this.name = options.name ?? '';
    this.label = options.label ?? '';
    this.maxLength = options.maxLength ?? 10;
    this.width = options.width ?? 400;
    this.lastPosFocus = -1;

    this.inputEl = this.node.querySelector<HTMLInputElement>('.js-input')!;
    this.valueEl = this.node.querySelector<HTMLElement>('.js-value')!;
    this.labelEl = this.node.querySelector<HTMLElement>('.js-label')!;

    const container = this.node.querySelector<HTMLElement>('.UIInput-container')!;
    container.style.width = this.width + 'px';

    for (let i = 0; i < this.maxLength; i++) {
      this.valueEl.innerHTML += `<span class="UIInput-value-char"></span>`;
    }

    this.handleInputBind = this.handleInput.bind(this);
    this.inputEl.addEventListener('input', this.handleInputBind);
  }

  /**
   * Free all resources.
   * Warning: You need to call this method to free allocation for this object.
   */
  delete() {
    this.inputEl.removeEventListener('input', this.handleInputBind);
    super.delete();
  }

  /**
   * Focus on.
   */
  focus(): void {
    if (this.lastPosFocus != -1) {
      this.valueEl.children[this.lastPosFocus].classList.add('u-focused');
    }

    this.inputEl.focus();
    super.focus();
  }

  /**
   * Focus off.
   */
  unfocus(): void {
    for (let i = 0; i < this.valueEl.children.length; i++) {
      this.valueEl.children[i].classList.remove('u-focused');
    }

    super.unfocus();
  }

  /**
   * Focus on a specific character.
   * 
   * @param {number} pos - The position of the character.
   */
  focusChar(pos: number): void {
    if (pos < 0 || pos > this.maxLength - 1) {
      return;
    }

    if (this.lastPosFocus != -1) {
      this.valueEl.children[this.lastPosFocus].classList.remove('u-focused');
    }

    this.valueEl.children[pos].classList.add('u-focused');
    this.lastPosFocus = pos;
  }

  /**
   * Set the input value.
   * 
   * @param {string} value - The value.
   */
  setValue(value: string): void {
    if (value == this.inputEl.value) {
      return;
    }

    this.inputEl.value = value;
    this.inputEl.dispatchEvent(new Event('input'));
  }

  /**
   * Returns the input name.
   */
  getName(): string {
    return this.name;
  }

  /**
   * Returns the input label.
   */
  getLabel(): string {
    return this.label;
  }

  /**
   * Set the input label.
   * 
   * @param {string} label - The label.
   */
  setLabel(label: string): void {
    this.label = label;
    this.labelEl.textContent = label;
  }

  /**
   * Returns the input value.
   */
  getValue(): string {
    return this.inputEl.value;
  }

  /**
   * The onAction function.
   * It emits an 'E_VALUE_CHANGED' event when the action is 'OK'.
   */
  onAction(actionId: string): void {
    if (!this.isFocused() || document.activeElement != this.inputEl) {
      return;
    }
    if (this.lastPosFocus < 0) {
      return;
    }

    if (actionId == 'RIGHT' && this.lastPosFocus + 1 <= this.inputEl.value.length - 1) {
      this.focusChar(this.lastPosFocus + 1);
    }
    else if (actionId == 'LEFT') {
      this.focusChar(this.lastPosFocus - 1);
      if (this.lastPosFocus <= 0) {
        this.inputEl.setSelectionRange(2, 2);
      }
    }
  }

  handleInput(event: any) {
    if (this.inputEl.value.length > this.maxLength) {
      this.inputEl.value = this.inputEl.value.slice(0, this.maxLength);
    }

    if (this.inputEl.selectionStart && this.inputEl.selectionStart > this.maxLength) {
      return;
    }

    if (this.inputEl.value == '') {
      this.labelEl.style.justifyContent = 'flex-start';
    }
    else {
      this.labelEl.style.justifyContent = 'flex-end';
    }

    for (let i = 0; i < this.maxLength; i++) {
      const char = this.inputEl.value.charAt(i);
      if (char == ' ') {
        this.valueEl.children[i].textContent = '\u00A0';
      }
      else if (char) {
        this.valueEl.children[i].textContent = char;
      }
      else {
        this.valueEl.children[i].textContent = '';
      }
    }

    eventManager.emit(this, 'E_VALUE_CHANGED', { value: this.inputEl.value });
    
    if (this.inputEl.selectionStart) {
      const pos = this.inputEl.selectionStart - 1;
      this.focusChar(pos);
    }
    else {
      this.focusChar(0);
    }
  }
}

export { UIInput };