import { dnaManager } from '@lib/dna/dna_manager';
import { gfx2Manager } from '@lib/gfx2/gfx2_manager';
import { gfx2Box2DManager } from '@lib/gfx2_box2d/gfx2_box2d_manager';
import { Screen } from '@lib/screen/screen';
import { BOX2D_PM } from '@lib/gfx2_box2d/gfx2_box2d_manager';
// ---------------------------------------------------------------------------------------
import { PhysicsComponent, PhysicsSystem } from './physics';
import { GraphicsSystem } from './graphics';
import { EntityComponent } from './entity';
import { InputComponent, InputSystem } from './input';
// ---------------------------------------------------------------------------------------

class PlatformerBox2DScreen extends Screen {
  eid: number;

  constructor() {
    super();
    this.eid = 0;
  }

  async onEnter() {
    const input = new InputSystem();
    const physics = new PhysicsSystem();
    const graphics = new GraphicsSystem();
    dnaManager.setup([input, physics, graphics]);

    gfx2Box2DManager.addBox({
      width: 100 * BOX2D_PM,
      height: 100 * BOX2D_PM
    });

    gfx2Box2DManager.addEdge({
      startX: -250 * BOX2D_PM,
      startY: 0,
      endX: 250 * BOX2D_PM,
      endY: 0,
      metaData: { name: 'platform1' }
    });

    this.eid = await this.#createEntity();
  }

  update(ts: number) {
    dnaManager.update(ts);
  }

  draw() {
    dnaManager.draw();
  }

  render() {
    gfx2Manager.beginRender();
    gfx2Manager.render();
    gfx2Manager.endRender();
  }

  async #createEntity(): Promise<number> {
    const eid = dnaManager.createEntity();

    const entity = new EntityComponent();
    dnaManager.addComponent(eid, entity);

    const input = new InputComponent();
    dnaManager.addComponent(eid, input);

    const physics = new PhysicsComponent({ x: 0, y: -200 * BOX2D_PM });
    dnaManager.addComponent(eid, physics);

    return eid;
  }
}

export { PlatformerBox2DScreen };