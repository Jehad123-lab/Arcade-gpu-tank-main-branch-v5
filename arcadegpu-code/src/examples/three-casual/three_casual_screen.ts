import Jolt from 'jolt-physics';
// ---------------------------------------------------------------------------------------
import { inputManager } from '@lib/input/input_manager';
import { gfx3DebugRenderer } from '@lib/gfx3/gfx3_debug_renderer';
import { gfx3Manager } from '@lib/gfx3/gfx3_manager';
import { Gfx3JoltEntity, gfx3JoltManager } from '@lib/gfx3_jolt/gfx3_jolt_manager';
import { Screen } from '@lib/screen/screen';
import { Gfx3CameraOrbit } from '@lib/gfx3_camera/gfx3_camera_orbit';
import { Gfx3Jolt, JOLT_LAYER_MOVING, JOLT_QUAT_TO_VEC4 } from '@lib/gfx3_jolt/gfx3_jolt_manager';
// ---------------------------------------------------------------------------------------

const LEVELS = [{
  canX: 0,
  canY: 24,
  canZ: -35,
  playerX: 0,
  playerY: 22,
  playerZ: -20,
  slopeLength: 100,
  slopeWidth: 20,
  slopeHeight: 20,
  wallHeight: 15,
  wallLength: 60
}];

class ThreeCasualScreen extends Screen {
  camera: Gfx3CameraOrbit;
  gameOver: boolean;
  can: Gfx3JoltEntity | null;
  player: Gfx3JoltEntity | null;
  canHasInitialPush: boolean;
  canMaxSpeed: number;
  playerSpeed: number;
  inputForward: boolean;
  inputBackward: boolean;
  inputLeft: boolean;
  inputRight: boolean;

  constructor() {
    super();
    this.camera = new Gfx3CameraOrbit(0);
    this.gameOver = false;

    this.can = null;
    this.player = null;
    this.canHasInitialPush = false;
    this.canMaxSpeed = 25;
    this.playerSpeed = 8;

    this.inputForward = false;
    this.inputBackward = false;
    this.inputLeft = false;
    this.inputRight = false;
  }

  async onEnter() {
    // Créer la pente
    this.#createSlope(LEVELS[0].slopeLength, LEVELS[0].slopeWidth, LEVELS[0].slopeHeight);

    // Créer les murs latéraux
    this.#createWalls(LEVELS[0].wallHeight, LEVELS[0].wallLength, LEVELS[0].slopeWidth);

    // Créer le joueur
    this.player = this.#createPlayer(LEVELS[0].playerX, LEVELS[0].playerY, LEVELS[0].playerZ);

    // Créer la canette
    this.can = this.#createCan(LEVELS[0].canX, LEVELS[0].canY, LEVELS[0].canZ);

    // Positionner la caméra pour voir la scène
    this.camera.setTarget([0, 0, 0]); // Centrer sur la zone de jeu
    this.camera.setDistance(25);
    this.camera.phi = Math.PI * 0.25; // Angle d'élévation plus modéré
    this.camera.theta = 0; // Angle horizontal

    // Ecoute la collision entre la canette et le joueur
    const contactListener = new Gfx3Jolt.ContactListenerJS();
    contactListener.OnContactAdded = (body1, body2, manifold, settings) => { };
    contactListener.OnContactPersisted = (body1, body2, manifold, settings) => { };
    contactListener.OnContactRemoved = (subShapePair) => { };
    contactListener.OnContactValidate = (body1: number, body2: number, baseOffset: number, collideShapeResult: number) => {
      const bodyA = Gfx3Jolt.wrapPointer(body1, Gfx3Jolt.Body);
      const bodyB = Gfx3Jolt.wrapPointer(body2, Gfx3Jolt.Body);
      const dataA = gfx3JoltManager.getMeta(bodyA.GetID().GetIndex());
      const dataB = gfx3JoltManager.getMeta(bodyB.GetID().GetIndex());
      if (!dataA || !dataB) {
        return Gfx3Jolt.ValidateResult_AcceptAllContactsForThisBodyPair;
      }

      const isCollide = (dataA['name'] === 'player' && dataB['name'] === 'can') || (dataA['name'] === 'can' && dataB['name'] === 'player');
      if (isCollide) {
        this.gameOver = true;
        console.log("Game Over! La canette vous a rattrapé!");
      }

      return Gfx3Jolt.ValidateResult_AcceptAllContactsForThisBodyPair;
    };

    gfx3JoltManager.system.SetContactListener(contactListener);
  }

  update(ts: number) {
    if (this.gameOver) {
      return;
    }

    this.camera.update(ts);
    gfx3JoltManager.update(ts);

    this.updateInputs();
    this.updatePlayer(ts);
    this.updateCan(ts);

    if (this.player) {
      // Suivre le joueur avec la caméra (avec un décalage pour voir la scène)
      const position = this.player.body.GetPosition();
      this.camera.setTarget([position.GetX(), position.GetY() + 3, position.GetZ()]);
    }
  }

  draw() {
    gfx3Manager.beginDrawing();
    gfx3JoltManager.draw();
    gfx3Manager.endDrawing();
  }

  render() {
    gfx3Manager.beginRender();
    gfx3Manager.beginPassRender(0);
    gfx3DebugRenderer.render();
    gfx3Manager.endPassRender();
    gfx3Manager.endRender();
  }

  updateInputs() {
    this.inputForward = false;
    this.inputBackward = false;
    this.inputLeft = false;
    this.inputRight = false;

    if (inputManager.isActiveAction('UP')) {
      this.inputForward = true;
    }

    if (inputManager.isActiveAction('DOWN')) {
      this.inputBackward = true;
    }

    if (inputManager.isActiveAction('LEFT')) {
      this.inputLeft = true;
    }

    if (inputManager.isActiveAction('RIGHT')) {
      this.inputRight = true;
    }
  }

  updatePlayer(ts: number) {
    if (!this.player) {
      return;
    }

    let moveX = 0;
    let moveZ = 0;
    if (this.inputForward) moveZ -= 1;
    if (this.inputBackward) moveZ += 1;
    if (this.inputLeft) moveX -= 1;
    if (this.inputRight) moveX += 1;

    // Normaliser le mouvement diagonal
    if (moveX !== 0 && moveZ !== 0) {
      const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
      moveX /= length;
      moveZ /= length;
    }

    // Appliquer la vitesse avec amortissement
    const targetVelX = moveX * this.playerSpeed;
    const targetVelZ = moveZ * this.playerSpeed;

    const velocity = this.player.body.GetLinearVelocity();
    const dampingFactor = 0.8;
    const newVelX = velocity.GetX() * dampingFactor + targetVelX * (1 - dampingFactor);
    const newVelZ = velocity.GetZ() * dampingFactor + targetVelZ * (1 - dampingFactor);

    this.player.body.SetLinearVelocity(new Gfx3Jolt.Vec3(newVelX, velocity.GetY(), newVelZ));

    // Forcer le joueur à rester debout (rotation nulle)
    this.player.body.SetAngularVelocity(new Gfx3Jolt.Vec3(0, 0, 0));
    // Utiliser l'interface body pour réinitialiser la rotation
    gfx3JoltManager.bodyInterface.SetRotation(this.player.body.GetID(), new Gfx3Jolt.Quat(0, 0, 0, 1), Gfx3Jolt.EActivation_DontActivate);
  }

  updateCan(ts: number) {
    if (!this.can) {
      return;
    }

    // Donner une impulsion initiale pour que la canette commence à rouler
    if (!this.canHasInitialPush) {
      const initialForce = new Gfx3Jolt.Vec3(0, 0, 15); // Force vers le bas de la pente
      this.can.body.AddForce(initialForce);
      this.canHasInitialPush = true;
    }

    // Limiter la vitesse maximale pour éviter que la canette aille trop vite
    const velocity = this.can.body.GetLinearVelocity();
    const currentSpeed = Math.sqrt(velocity.GetX() ** 2 + velocity.GetY() ** 2 + velocity.GetZ() ** 2);

    if (currentSpeed > this.canMaxSpeed) {
      const scale = this.canMaxSpeed / currentSpeed;
      this.can.body.SetLinearVelocity(new Gfx3Jolt.Vec3(
        velocity.GetX() * scale,
        velocity.GetY() * scale,
        velocity.GetZ() * scale
      ));
    }
  }

  #createSlope(length: number, width: number, height: number) {
    // Pente principale (inclinée)
    const slopeLength = length;
    const slopeWidth = width;
    const slopeHeight = height;
    const angle = Math.atan(slopeHeight / slopeLength);

    // Position au centre de la pente
    const centerY = slopeHeight / 2;
    const centerZ = 0;

    // Rotation autour de l'axe X pour incliner la pente
    const rotationX = angle;

    gfx3JoltManager.addBox({
      x: 0,
      y: centerY,
      z: centerZ,
      rotation: Gfx3Jolt.Quat.prototype.sRotation(new Gfx3Jolt.Vec3(1, 0, 0), rotationX),
      width: slopeWidth,
      height: 1,
      depth: slopeLength
    });
  }

  #createWalls(height: number, length: number, slopeWidth: number) {
    const wallHeight = height;
    const wallLength = length;

    // Mur gauche
    gfx3JoltManager.addBox({
      x: -slopeWidth / 2,
      y: wallHeight / 2,
      z: 0,
      qx: 0,
      qy: 0,
      qz: 0,
      qw: 1,
      width: 1,
      height: wallHeight,
      depth: wallLength
    });

    // Mur droit
    gfx3JoltManager.addBox({
      x: slopeWidth / 2,
      y: wallHeight / 2,
      z: 0,
      width: 1,
      height: wallHeight,
      depth: wallLength
    });
  }

  #createPlayer(x: number, y: number, z: number): Gfx3JoltEntity {
    return gfx3JoltManager.addCapsule({
      x: x,
      y: y,
      z: z,
      radius: 1,
      height: 0.5,
      motionType: Gfx3Jolt.EMotionType_Dynamic,
      layer: JOLT_LAYER_MOVING,
      meta: {
        name: 'player'
      },
      settings: {
        mFriction: 0.8, // Bonne adhérence
        mRestitution: 0.0, // Pas de rebond
        mOverrideMassProperties: Gfx3Jolt.EOverrideMassProperties_CalculateInertia,
        mMassPropertiesOverride: 70, // Poids humain réaliste
        mAngularDamping: 0.99 // Empêcher la rotation pour que le joueur reste debout. Très fort amortissement angulaire
      }
    });
  }

  #createCan(x: number, y: number, z: number): Gfx3JoltEntity {
    // Rotation de 90° sur l'axe Z pour coucher la canette et qu'elle roule le long de la pente

    return gfx3JoltManager.addCapsule({
      x: x,
      y: y,
      z: z,
      rotation: Gfx3Jolt.Quat.prototype.sRotation(new Gfx3Jolt.Vec3(0, 0, 1), Math.PI / 2),
      radius: 1,
      height: 2,
      motionType: Gfx3Jolt.EMotionType_Dynamic,
      layer: JOLT_LAYER_MOVING,
      meta: {
        name: 'can'
      },
      settings: {
        mFriction: 0.3, // Friction modérée pour rouler
        mRestitution: 0.2, // Peu de rebond
        mOverrideMassProperties: Gfx3Jolt.EOverrideMassProperties_CalculateInertia,
        mMassPropertiesOverride: 0.5, // Canette légère
      }
    });
  }
}

export { ThreeCasualScreen };