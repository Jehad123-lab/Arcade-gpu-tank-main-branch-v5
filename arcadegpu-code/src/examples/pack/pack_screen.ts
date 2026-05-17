import { gfx3DebugRenderer } from '@lib/arcadegpu';
import { gfx3MeshRenderer } from '@lib/arcadegpu';
import { gfx3Manager } from '@lib/arcadegpu';
import { gfx3MeshShadowRenderer } from '@lib/arcadegpu';
import { gfx3SpriteRenderer } from '@lib/arcadegpu';
import { gfx3SkyboxRenderer } from '@lib/arcadegpu';
import { gfx3FlareRenderer } from '@lib/arcadegpu';
import { gfx3ParticlesRenderer } from '@lib/arcadegpu';
import { gfx3PostRenderer } from '@lib/arcadegpu';
import { gfx3ShadowVolumeRenderer } from '@lib/arcadegpu';
import { UT } from '@lib/arcadegpu';
import { Screen } from '@lib/arcadegpu';
import { EnginePack3D } from '@lib/arcadegpu';
// ---------------------------------------------------------------------------------------

class PackScreen extends Screen {
  pack: EnginePack3D;

  constructor() {
    super();
    this.pack = new EnginePack3D();
  }

  async onEnter() {
    this.pack = await EnginePack3D.createFromFile('./scene.blend.pak');
  }

  update(ts: number) {
    this.pack.update(ts);
  }

  draw() {
    gfx3Manager.beginDrawing();
    this.pack.draw();
    gfx3DebugRenderer.drawGrid(UT.MAT4_ROTATE_X(Math.PI * 0.5), 20, 1);
    gfx3Manager.endDrawing();
  }

  render(ts: number) {
    gfx3Manager.beginRender();
    gfx3MeshShadowRenderer.render();
    gfx3ShadowVolumeRenderer.render();
    gfx3Manager.setDestinationTexture(gfx3PostRenderer.getSourceTexture());
    gfx3Manager.beginPassRender(0);
    gfx3SkyboxRenderer.render();
    gfx3DebugRenderer.render();
    gfx3FlareRenderer.render();
    gfx3MeshRenderer.render(ts);
    gfx3SpriteRenderer.render();
    gfx3ParticlesRenderer.render();    
    gfx3Manager.endPassRender();
    gfx3PostRenderer.render(ts, gfx3Manager.getCurrentRenderingTexture());
    gfx3Manager.endRender();
  }
}

export { PackScreen };