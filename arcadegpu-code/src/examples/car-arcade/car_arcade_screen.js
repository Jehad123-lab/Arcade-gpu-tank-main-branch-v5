import { gfx3Manager } from '@lib/gfx3/gfx3_manager';
import { gfx3MeshRenderer } from '@lib/gfx3_mesh/gfx3_mesh_renderer';
import { gfx3DebugRenderer } from '@lib/gfx3/gfx3_debug_renderer';
import { gfx3TextureManager } from '@lib/gfx3/gfx3_texture_manager';
import { inputManager } from '@lib/input/input_manager';
import { Curve } from '@lib/core/curve';
import { UT } from '@lib/core/utils';
import { Screen } from '@lib/screen/screen';
import { Gfx3PhysicsJWM } from '@lib/gfx3_physics/gfx3_physics_jwm';
import { Gfx3MeshJSM } from '@lib/gfx3_mesh/gfx3_mesh_jsm';
import { Gfx3Camera } from '@lib/gfx3_camera/gfx3_camera';
// ---------------------------------------------------------------------------------------
import { CarController } from './car_controller';
// ---------------------------------------------------------------------------------------

const CAMERA_DISTANCE = 15;
const CAMERA_HEIGHT = 5;
const CAMERA_LERP = 0.1;

class CarArcadeScreen extends Screen {
  constructor() {
    super();
    this.circuitWalkmesh = new Gfx3PhysicsJWM();
    this.circuit = new Gfx3MeshJSM();
    this.camera = new Gfx3Camera(0);
    this.camFollowPos = [0, 0, 0];
    this.car = new CarController(this.circuitWalkmesh, {
      position: [50, 10, 0]
    });
  }

  async onEnter() {
    await this.circuitWalkmesh.loadFromFile('./examples/car-arcade/circuit.jwm');
    await this.circuit.loadFromFile('./examples/car-arcade/circuit.jsm');
    this.circuit.mat.setTexture(await gfx3TextureManager.loadTexture('./examples/car-arcade/textures/asphalt.jpg'));

    await this.car.loadFromFiles(
      './examples/car-arcade/car.jsm',
      './examples/car-arcade/textures/car/car1.jpg',
      './examples/car-arcade/wheel.jsm',
      './examples/car-arcade/textures/car/wheel2.jpg'
    );

    // Initialiser la position de la caméra
    const carPos = this.car.mesh.getPosition();
    this.camFollowPos = [carPos[0], carPos[1] + CAMERA_HEIGHT, carPos[2]];
  }

  update(ts) {
    if (inputManager.isActiveAction('LEFT')) {
      this.car.inputLeft = true;
    }
    if (inputManager.isActiveAction('RIGHT')) {
      this.car.inputRight = true;
    }
    if (inputManager.isActiveAction('UP')) {
      this.car.inputAccel = true;
    }
    if (inputManager.isActiveAction('DOWN')) {
      this.car.inputBrake = true;
    }
    if (inputManager.isActiveAction('SELECT')) {
      this.car.inputHandbrake = true;
    }

    this.car.update(ts);
    this.updateCamera();
    this.circuitWalkmesh.update(ts);
  }

  updateCamera() {
    const carPos = this.car.mesh.getPosition();
    const directionAngle = this.car.directionAngle;

    const camTargetPos = [
      carPos[0] - this.car.forward[0] * CAMERA_DISTANCE,
      carPos[1] + CAMERA_HEIGHT,
      carPos[2] - this.car.forward[2] * CAMERA_DISTANCE
    ];

    this.camFollowPos[0] = UT.LERP(this.camFollowPos[0], camTargetPos[0], CAMERA_LERP);
    this.camFollowPos[1] = UT.LERP(this.camFollowPos[1], camTargetPos[1], CAMERA_LERP);
    this.camFollowPos[2] = UT.LERP(this.camFollowPos[2], camTargetPos[2], CAMERA_LERP);

    this.camera.setPosition(
      this.camFollowPos[0],
      this.camFollowPos[1],
      this.camFollowPos[2]
    );

    this.camera.lookAt(
      carPos[0],
      carPos[1] + 1,
      carPos[2]
    );
  }

  draw() {
    gfx3Manager.beginDrawing();
    this.car.draw();
    this.circuitWalkmesh.draw();
    this.circuit.draw();
    gfx3DebugRenderer.drawGizmo(UT.MAT4_IDENTITY(), 1);
    gfx3Manager.endDrawing();
  }

  render(ts) {
    gfx3Manager.beginRender();
    gfx3Manager.beginPassRender(0);
    gfx3DebugRenderer.render();
    gfx3MeshRenderer.render(ts);
    gfx3Manager.endPassRender();
    gfx3Manager.endRender();
  }
}

export { CarArcadeScreen };