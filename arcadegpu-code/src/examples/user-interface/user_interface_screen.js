import { eventManager } from '@lib/core/event_manager';
import { uiManager } from '@lib/ui/ui_manager';
import { Screen } from '@lib/screen/screen';
import { UIMenuText } from '@lib/ui_menu_text/ui_menu_text';
import { UIText } from '@lib/ui_text/ui_text';
import { UIInput } from '@lib/ui_input/ui_input';
// ---------------------------------------------------------------------------------------

class UserInterfaceScreen extends Screen {
  constructor() {
    super();
    this.uiTitle = new UIText();
    this.uiMenu1 = new UIMenuText();
    this.uiMenu2 = new UIMenuText();
    this.uiInput = new UIInput();
  }

  async onEnter() {
    this.uiTitle.setText('Menu');
    uiManager.addWidget(this.uiTitle, 'position:absolute; top:0; left:0; right:0; height:50px');
    
    this.uiMenu1.add('1', 'Click to focus second menu');
    this.uiMenu1.add('2', 'Click to focus second menu');
    this.uiMenu1.add('3', 'Click to focus second menu');
    uiManager.addWidget(this.uiMenu1, 'position:absolute; top:50px; left:0; bottom:0; width:40%');

    this.uiMenu2.add('1', 'Click to focus input');
    this.uiMenu2.add('2', 'Click to focus input');
    this.uiMenu2.add('3', 'Click to focus input');
    uiManager.addWidget(this.uiMenu2, 'position:absolute; top:50px; left:40%; bottom:0; width:60%');

    this.uiInput = new UIInput({ name: 'li', label: 'Name', maxLength: 10, width: 300 });
    uiManager.addWidget(this.uiInput, 'position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);');

    eventManager.subscribe(this.uiMenu1, 'E_ITEM_SELECTED', this, this.handleMenu1ItemSelected);
    eventManager.subscribe(this.uiMenu2, 'E_CLOSED', this, this.handleMenu2Closed);
    eventManager.subscribe(this.uiMenu2, 'E_ITEM_SELECTED', this, this.handleMenu2ItemSelected);

    uiManager.focus(this.uiMenu1);
  }

  onExit() {
    uiManager.removeWidget(this.uiTitle);
    uiManager.removeWidget(this.uiMenu1);
    uiManager.removeWidget(this.uiMenu2);
  }

  handleMenu1ItemSelected(data) {
    uiManager.focus(this.uiMenu2);
  }

  handleMenu2Closed() {
    this.uiMenu1.unselectWidgets();
    uiManager.focus(this.uiMenu1);
  }

  handleMenu2ItemSelected(data) {
    this.uiTitle.setText('You have selected menu item at index : ' + data.index);
    this.uiMenu1.unselectWidgets();
    this.uiMenu2.unselectWidgets();
    uiManager.focus(this.uiInput);    
  }
}

export { UserInterfaceScreen };