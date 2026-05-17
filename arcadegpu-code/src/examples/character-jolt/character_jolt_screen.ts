import { dnaManager } from '@lib/dna/dna_manager';
import { gfx3DebugRenderer } from '@lib/gfx3/gfx3_debug_renderer';
import { gfx3Manager } from '@lib/gfx3/gfx3_manager';
import { gfx3JoltManager } from '@lib/gfx3_jolt/gfx3_jolt_manager';
import { Screen } from '@lib/screen/screen';
import { Gfx3CameraOrbit } from '@lib/gfx3_camera/gfx3_camera_orbit';
import { UT } from '@lib/core/utils';
import { Gfx3Jolt, JOLT_LAYER_MOVING } from '@lib/gfx3_jolt/gfx3_jolt_manager';
// ---------------------------------------------------------------------------------------
import { PhysicsComponent, PhysicsSystem } from './physics';
import { GraphicsSystem } from './graphics';
import { EntityComponent } from './entity';
import { InputComponent, InputSystem } from './input';
import { Gfx3MeshJSM } from '@lib/gfx3_mesh/gfx3_mesh_jsm';
// ---------------------------------------------------------------------------------------

class CharacterJoltScreen extends Screen {
  camera: Gfx3CameraOrbit;
  eid: number;

  constructor() {
    super();
    this.camera = new Gfx3CameraOrbit(0);
    this.eid = 0;
  }

  async onEnter() {
    const conveyor = gfx3JoltManager.addBox({
      x: 0,
      y: 0,
      z: -10,
      width: 10,
      height: 0.25,
      depth: 2,
      color: [0, 0, 1]
    });

    const input = new InputSystem(this.camera);
    const physics = new PhysicsSystem(conveyor);
    const graphics = new GraphicsSystem();
    dnaManager.setup([input, physics, graphics]);

    const jsm = new Gfx3MeshJSM();
    await jsm.loadFromFile('./examples/character-jolt/shape.jsm');

    gfx3JoltManager.addPolygonShape({
      vertices: jsm.getCoords(),
      indexes: jsm.getIndexes()
    });

    // Movable box
    gfx3JoltManager.addBox({
      x: 5,
      y: 50,
      z: 0,
      width: 1,
      height: 1,
      depth: 1,
      motionType: Gfx3Jolt.EMotionType_Dynamic,
      layer: JOLT_LAYER_MOVING,
      settings: {
        mFriction: 0.01,
        mOverrideMassProperties: Gfx3Jolt.EOverrideMassProperties_CalculateInertia,
        mMassPropertiesOverride: 0.5
      }
    });

    // Floor
    gfx3JoltManager.addBox({
      x: 0,
      y: 0,
      z: 0,
      width: 100,
      height: 0,
      depth: 100
    });

    // Stairs
    for (let j = 0; j < 5; j++) {
      const stepHeight = 0.3 + 0.1 * j;
      for (let i = 1; i < 10; i++) {
        gfx3JoltManager.addBox({
          x: 15 + 5 * j,
          y: i * stepHeight - 0.5 + stepHeight / 2,
          z: -20 - i * 2,
          width: 2,
          height: stepHeight / 2,
          depth: 2
        });
      }
    }

    // Slopes
    for (let i = 0; i < 10; i++) {
      gfx3JoltManager.addBox({
        x: -40 + 5 * i,
        y: 2,
        z: -25,
        rotation: Gfx3Jolt.Quat.prototype.sRotation(new Gfx3Jolt.Vec3(1, 0, 0), UT.DEG_TO_RAD(70 - i * 5.0)),
        width: 2.5,
        height: 0.6,
        depth: 18,
        color: [1, 0, 0]
      });
    }

    this.eid = await this.#createEntity([0, 10, 0], 1, 0.5, 0.5, 0.4);
  }

  update(ts: number) {    
    dnaManager.update(ts);
    const entity = dnaManager.getComponent(this.eid, EntityComponent);
    this.camera.setTarget([entity.x, entity.y, entity.z]);
    this.camera.update(ts);
  }

  draw() {
    gfx3Manager.beginDrawing();
    dnaManager.draw();
    gfx3Manager.endDrawing();
  }

  render() {
    gfx3Manager.beginRender();
    gfx3Manager.beginPassRender(0);
    gfx3DebugRenderer.render();
    gfx3Manager.endPassRender();
    gfx3Manager.endRender();
  }

  async #createEntity(position: vec3, heightStanding: number, radiusStanding: number, heightCrouching: number, radiusCrouching: number): Promise<number> {
    const eid = dnaManager.createEntity();

    const entity = new EntityComponent();
    dnaManager.addComponent(eid, entity);

    const physics = new PhysicsComponent({
      x: position[0],
      y: position[1],
      z: position[2],
      heightStanding: heightStanding,
      radiusStanding: radiusStanding,
      heightCrouching: heightCrouching,
      radiusCrouching: radiusCrouching
    });

    dnaManager.addComponent(eid, new InputComponent());
    dnaManager.addComponent(eid, physics);



    return eid;
  }
}

export { CharacterJoltScreen };