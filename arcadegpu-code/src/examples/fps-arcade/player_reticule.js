import { uiManager } from '@lib/ui/ui_manager';
// ---------------------------------------------------------------------------------------

export class PlayerReticule {
  constructor() {
    this.crosshair = document.createElement('img');
    this.crosshair.src = 'examples/fps/crosshair.png';
    uiManager.addNode(this.crosshair, 'position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);');
  }

  delete() {
    uiManager.removeNode(this.crosshair);
  }
}