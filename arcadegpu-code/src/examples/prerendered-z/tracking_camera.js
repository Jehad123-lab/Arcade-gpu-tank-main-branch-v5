import { gfx3Manager } from '@lib/gfx3/gfx3_manager';
import { UT } from '@lib/core/utils';
import { Gfx3ProjectionMode } from '@lib/gfx3/gfx3_view';
// ---------------------------------------------------------------------------------------

class TrackingCamera {
  constructor(viewIndex) {
    this.target = null;
    this.minClipOffset = [0, 0];
    this.maxClipOffset = [0, 0];
    this.view = gfx3Manager.getView(viewIndex);
    this.view.setProjectionMode(Gfx3ProjectionMode.PERSPECTIVE);
  }

  async loadFromData(data) {
    this.minClipOffset[0] = data['MinClipOffsetX'];
    this.minClipOffset[1] = data['MinClipOffsetY'];
    this.maxClipOffset[0] = data['MaxClipOffsetX'];
    this.maxClipOffset[1] = data['MaxClipOffsetY'];
    this.view.setCameraMatrix(data['Matrix']);
    this.view.setPerspectiveFovy(UT.DEG_TO_RAD(parseInt(data['Fovy'])));
    this.view.setPerspectiveNear(data['Near']);
    this.view.setPerspectiveFar(data['Far']);
  }

  setTarget(target) {
    this.target = target;
  }
}

export { TrackingCamera };