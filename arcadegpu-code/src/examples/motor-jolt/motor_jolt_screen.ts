import { gfx3DebugRenderer } from '@lib/gfx3/gfx3_debug_renderer';
import { gfx3Manager } from '@lib/gfx3/gfx3_manager';
import { em } from '@lib/engine/engine_manager';
import { gfx3JoltManager, Gfx3Jolt, Jolt, JOLT_LAYER_NON_MOVING, JOLT_LAYER_MOVING } from '@lib/gfx3_jolt/gfx3_jolt_manager';
import { Screen } from '@lib/screen/screen';
import { Gfx3CameraOrbit } from '@lib/gfx3_camera/gfx3_camera_orbit';
// ---------------------------------------------------------------------------------------

class MotorJoltScreen extends Screen {
  camera: Gfx3CameraOrbit;
  pTime: number;
  counter: number;
  colors: Array<number>;
  offsets: Array<number>;
  slider: { box: Jolt.Body, constraint: Jolt.SliderConstraint };
  wing: Jolt.Body;

  constructor() {
    super();
    this.camera = new Gfx3CameraOrbit(0);
    this.camera.setTarget([0, 0, 0]);
    this.camera.setDistance(30);
    this.pTime = 0;
    this.counter = 4;
    this.colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00];
    this.offsets = [0, 4, 13, 21];
    this.slider = this.#createSlider();
    this.wing = this.#createWindmill();
  }

  async onEnter() {
    // Floor
    gfx3JoltManager.addBox({ x: 0, y: 0, z: 0, width: 100, height: 0, depth: 100 });
  }

  update(ts: number) {
    const time = em.getTimeStamp() / 1000;
    this.camera.update(ts);

    if (time - this.pTime > 1.0) {
      this.pTime = time;
      const index = Math.abs(this.counter++ % (this.offsets.length * 2 - 2) - (this.offsets.length - 1));
      this.slider.constraint.SetTargetPosition(this.offsets[index]);
      gfx3JoltManager.bodyInterface.ActivateBody(this.slider.box.GetID());
    }

    gfx3JoltManager.update(ts);
  }

  draw() {
    gfx3Manager.beginDrawing();
    gfx3JoltManager.draw();
    gfx3JoltManager.drawShape(this.wing.GetShape(), this.wing.GetCenterOfMassTransform());
    gfx3Manager.endDrawing();
  }

  render() {
    gfx3Manager.beginRender();
    gfx3Manager.beginPassRender(0);
    gfx3DebugRenderer.render();
    gfx3Manager.endPassRender();
    gfx3Manager.endRender();
  }

  #createWindmill(): Jolt.Body {
    const box = gfx3JoltManager.addBox({
      x: 0,
      y: 10,
      z: 0,
      width: 0.5,
      height: 0.5,
      depth: 0.5,
      motionType: Gfx3Jolt.EMotionType_Static,
      layer: JOLT_LAYER_NON_MOVING
    });

    const wingsShapeSettings = new Gfx3Jolt.StaticCompoundShapeSettings();
    wingsShapeSettings.AddShape(new Gfx3Jolt.Vec3(5, 0, 0), Gfx3Jolt.Quat.prototype.sIdentity(), new Gfx3Jolt.BoxShapeSettings(new Gfx3Jolt.Vec3(4, 0.5, 0.5), 0.05), 0);
    wingsShapeSettings.AddShape(new Gfx3Jolt.Vec3(-5, 0, 0), Gfx3Jolt.Quat.prototype.sIdentity(), new Gfx3Jolt.BoxShapeSettings(new Gfx3Jolt.Vec3(4, 0.5, 0.5), 0.05), 0);
    wingsShapeSettings.AddShape(new Gfx3Jolt.Vec3(0, 5, 0), Gfx3Jolt.Quat.prototype.sIdentity(), new Gfx3Jolt.BoxShapeSettings(new Gfx3Jolt.Vec3(0.5, 4, 0.5), 0.05), 0);
    wingsShapeSettings.AddShape(new Gfx3Jolt.Vec3(0, -5, 0), Gfx3Jolt.Quat.prototype.sIdentity(), new Gfx3Jolt.BoxShapeSettings(new Gfx3Jolt.Vec3(0.5, 4, 0.5), 0.05), 0);

    const wingsShape = wingsShapeSettings.Create().Get();
    const wingsCreationSettings = new Gfx3Jolt.BodyCreationSettings(wingsShape, new Gfx3Jolt.RVec3(0, 10, 0), Gfx3Jolt.Quat.prototype.sIdentity(), Gfx3Jolt.EMotionType_Dynamic, JOLT_LAYER_MOVING);
    const wing = gfx3JoltManager.bodyInterface.CreateBody(wingsCreationSettings);
    gfx3JoltManager.bodyInterface.AddBody(wing.GetID(), Gfx3Jolt.EActivation_Activate);

    // Constrain the wings to the box using a powered hinge
    let c = new Gfx3Jolt.HingeConstraintSettings();
    c.mPoint1 = c.mPoint2 = wingsCreationSettings.mPosition;
    c.mHingeAxis1.Set(0, 0, 1);
    c.mHingeAxis2 = c.mHingeAxis1;
    c.mNormalAxis1.Set(1, 0, 0);
    c.mNormalAxis2 = c.mNormalAxis1;
    const joint = c.Create(box.body, wing);
    const hinge = Gfx3Jolt.castObject(joint, Gfx3Jolt.HingeConstraint);
    gfx3JoltManager.system.AddConstraint(hinge);
    hinge.SetMotorState(Gfx3Jolt.EMotorState_Velocity);
    hinge.SetTargetAngularVelocity(-5);

    const sphere = gfx3JoltManager.addSphere({ // Sphere moving towards the wings
      x: -20,
      y: 2,
      z: 0,
      radius: 2,
      motionType: Gfx3Jolt.EMotionType_Dynamic,
      layer: JOLT_LAYER_MOVING
    });

    sphere.body.GetMotionProperties().SetInverseMass(1.0 / 15);
    sphere.body.AddImpulse(new Gfx3Jolt.Vec3(250.0, 0, 0));
    sphere.body.SetRestitution(0.45);

    gfx3JoltManager.addBox({ // Target wall
      x: -25,
      y: 15,
      z: 0,
      width: 0.4,
      height: 30,
      depth: 10,
      motionType: Gfx3Jolt.EMotionType_Static,
      layer: JOLT_LAYER_NON_MOVING
    });

    return wing;
  }

  #createSlider(): { box: Jolt.Body, constraint: Jolt.SliderConstraint } {
    gfx3JoltManager.addBox({ // Slider platform
      x: 18,
      y: 0.25,
      z: 0,
      width: 25,
      height: 0.5,
      depth: 4,
      motionType: Gfx3Jolt.EMotionType_Static,
      layer: JOLT_LAYER_NON_MOVING
    });

    const target = gfx3JoltManager.addBox({ // Slider target
      x: 30,
      y: 2,
      z: 0,
      width: 1,
      height: 4,
      depth: 4,
      motionType: Gfx3Jolt.EMotionType_Static,
      layer: JOLT_LAYER_NON_MOVING
    });

    const box = gfx3JoltManager.addBox({ // Slider box
      x: 15,
      y: 1.25,
      z: 0,
      width: 1.5,
      height: 1.5,
      depth: 1.5,
      motionType: Gfx3Jolt.EMotionType_Dynamic,
      layer: JOLT_LAYER_MOVING
    });

    this.colors.forEach((color, index) => { // Slider checkpoints
      gfx3JoltManager.addBox({
        x: 28 - this.offsets[index],
        y: 2,
        z: -2.75,
        width: 2,
        height: 8,
        depth: 1.5,
        motionType: Gfx3Jolt.EMotionType_Static,
        layer: JOLT_LAYER_NON_MOVING
      })
    });

    const c = new Gfx3Jolt.SliderConstraintSettings();
    c.mPoint1.Set(15, 1.25, 0);
    c.mPoint2.Set(28, 1.25, 0);
    c.mSliderAxis1.Set(1, 0, 0);
    c.mSliderAxis2 = c.mSliderAxis1;
    c.mNormalAxis1.Set(0, 1, 0);
    c.mNormalAxis2 = c.mNormalAxis1;
    const joint = c.Create(box.body, target.body);
    const slider = Gfx3Jolt.castObject(joint, Gfx3Jolt.SliderConstraint);
    gfx3JoltManager.system.AddConstraint(slider);
    slider.SetMotorState(Gfx3Jolt.EMotorState_Position);
    slider.SetTargetPosition(0);

    return { box: box.body, constraint: slider };
  }
}

export { MotorJoltScreen };