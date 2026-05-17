import { dnaManager } from '@lib/dna/dna_manager';
import { gfx3DebugRenderer } from '@lib/gfx3/gfx3_debug_renderer';
import { gfx3Manager } from '@lib/gfx3/gfx3_manager';
import { gfx3JoltManager, Gfx3Jolt, Jolt, JOLT_LAYER_NON_MOVING } from '@lib/gfx3_jolt/gfx3_jolt_manager';
import { Screen } from '@lib/screen/screen';
import { Gfx3CameraOrbit } from '@lib/gfx3_camera/gfx3_camera_orbit';
// ---------------------------------------------------------------------------------------
import { PhysicsComponent, PhysicsSystem } from './physics';
import { GraphicsSystem } from './graphics';
import { EntityComponent } from './entity';
import { InputComponent, InputSystem } from './input';
// ---------------------------------------------------------------------------------------

class CarJoltScreen extends Screen {
  camera: Gfx3CameraOrbit;
  eid: number;
  trackBodies: Array<Jolt.Body>;

  constructor() {
    super();
    this.camera = new Gfx3CameraOrbit(0);
    this.eid = 0;
    this.trackBodies = [];
  }

  async onEnter() {
    const input = new InputSystem(this.camera);
    const physics = new PhysicsSystem();
    const graphics = new GraphicsSystem();
    dnaManager.setup([input, physics, graphics]);

    this.trackBodies = this.#createTrack();
    this.eid = await this.#createEntity([0, 50, 0]);
  }

  update(ts: number) {
    this.camera.update(ts);
    dnaManager.update(ts);
    const entity = dnaManager.getComponent(this.eid, EntityComponent);
    this.camera.setTarget([entity.x, entity.y, entity.z]);
  }

  draw() {
    gfx3Manager.beginDrawing();
    dnaManager.draw();
    gfx3JoltManager.draw();

    this.trackBodies.forEach(body => {
      gfx3JoltManager.drawShape(body.GetShape(), body.GetWorldTransform());
    });

    gfx3Manager.endDrawing();
  }

  render() {
    gfx3Manager.beginRender();
    gfx3Manager.beginPassRender(0);
    gfx3DebugRenderer.render();
    gfx3Manager.endPassRender();
    gfx3Manager.endRender();
  }

  async #createEntity(position: vec3): Promise<number> {
    const eid = dnaManager.createEntity();

    const entity = new EntityComponent();
    entity.y = 10;
    entity.z = 10;
    dnaManager.addComponent(eid, entity);

    dnaManager.addComponent(eid, new PhysicsComponent({
      x: position[0],
      y: position[1],
      z: position[2],
      maxEngineTorque: 8000,
    }));

    const input = new InputComponent();
    dnaManager.addComponent(eid, input);

    return eid;
  }

  #createTrack(): Array<Jolt.Body> {
    const track = [
      [[[38, 64, -14], [38, 64, -16], [38, -64, -16], [38, -64, -14], [64, -64, -16], [64, -64, -14], [64, 64, -16], [64, 64, -14]], [[-16, 64, -14], [-16, 64, -16], [-16, -64, -16], [-16, -64, -14], [10, -64, -16], [10, -64, -14], [10, 64, -16], [10, 64, -14]], [[10, -48, -14], [10, -48, -16], [10, -64, -16], [10, -64, -14], [38, -64, -16], [38, -64, -14], [38, -48, -16], [38, -48, -14]], [[10, 64, -14], [10, 64, -16], [10, 48, -16], [10, 48, -14], [38, 48, -16], [38, 48, -14], [38, 64, -16], [38, 64, -14]]],
      [[[38, 48, -10], [38, 48, -14], [38, -48, -14], [38, -48, -10], [40, -48, -14], [40, -48, -10], [40, 48, -14], [40, 48, -10]], [[62, 62, -10], [62, 62, -14], [62, -64, -14], [62, -64, -10], [64, -64, -14], [64, -64, -10], [64, 62, -14], [64, 62, -10]], [[8, 48, -10], [8, 48, -14], [8, -48, -14], [8, -48, -10], [10, -48, -14], [10, -48, -10], [10, 48, -14], [10, 48, -10]], [[-16, 62, -10], [-16, 62, -14], [-16, -64, -14], [-16, -64, -10], [-14, -64, -14], [-14, -64, -10], [-14, 62, -14], [-14, 62, -10]], [[-14, -62, -10], [-14, -62, -14], [-14, -64, -14], [-14, -64, -10], [62, -64, -14], [62, -64, -10], [62, -62, -14], [62, -62, -10]], [[8, -48, -10], [8, -48, -14], [8, -50, -14], [8, -50, -10], [40, -50, -14], [40, -50, -10], [40, -48, -14], [40, -48, -10]], [[8, 50, -10], [8, 50, -14], [8, 48, -14], [8, 48, -10], [40, 48, -14], [40, 48, -10], [40, 50, -14], [40, 50, -10]], [[-16, 64, -10], [-16, 64, -14], [-16, 62, -14], [-16, 62, -10], [64, 62, -14], [64, 62, -10], [64, 64, -14], [64, 64, -10]]],
      [[[-4, 22, -14], [-4, -14, -14], [-4, -14, -10], [4, -14, -14], [4, -14, -10], [4, 22, -14]], [[-4, -27, -14], [-4, -48, -14], [-4, -48, -11], [4, -48, -14], [4, -48, -11], [4, -27, -14]], [[-4, 50, -14], [-4, 30, -14], [-4, 30, -12], [4, 30, -14], [4, 30, -12], [4, 50, -14]], [[46, 50, -14], [46, 31, -14], [46, 50, -12], [54, 31, -14], [54, 50, -12], [54, 50, -14]], [[46, 16, -14], [46, -19, -14], [46, 16, -10], [54, -19, -14], [54, 16, -10], [54, 16, -14]], [[46, -28, -14], [46, -48, -14], [46, -28, -11], [54, -48, -14], [54, -28, -11], [54, -28, -14]]]
    ];

    let tempVec = new Gfx3Jolt.Vec3(0, 1, 0);
    const mapRot = Gfx3Jolt.Quat.prototype.sRotation(tempVec, 0.5 * Math.PI);
    let tempRVec = new Gfx3Jolt.RVec3(0, 0, 0);
    let bodies = new Array<Jolt.Body>();

    track.forEach((type, tIdx) => {
      type.forEach(block => {
        const hull = new Gfx3Jolt.ConvexHullShapeSettings();

        block.forEach(v => {
          tempVec.Set(-v[1], v[2], v[0]);
          hull.mPoints.push_back(tempVec);
        });

        const shape = hull.Create().Get();
        tempRVec.Set(0, 10, 0);

        const creationSettings = new Gfx3Jolt.BodyCreationSettings(shape, tempRVec, mapRot, Gfx3Jolt.EMotionType_Static, JOLT_LAYER_NON_MOVING);
        Gfx3Jolt.destroy(hull);
        const body = gfx3JoltManager.bodyInterface.CreateBody(creationSettings);
        Gfx3Jolt.destroy(creationSettings);
        body.SetFriction(1.0);

        bodies.push(body);
        gfx3JoltManager.bodyInterface.AddBody(body.GetID(), Gfx3Jolt.EActivation_Activate);
      });
    });

    Gfx3Jolt.destroy(tempVec);
    Gfx3Jolt.destroy(tempRVec);

    return bodies;
  }
}

export { CarJoltScreen };