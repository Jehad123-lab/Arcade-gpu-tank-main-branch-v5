import { eventManager } from '@lib/core/event_manager';
import { uiManager } from '@lib/ui/ui_manager';
import { screenManager } from '@lib/screen/screen_manager';
import { inputManager } from '@lib/input/input_manager';
import { Screen } from '@lib/screen/screen';
import { UIMenuText } from '@lib/ui_menu_text/ui_menu_text';
import { MenuAxis } from '@lib/ui_menu/ui_menu';
// ---------------------------------------------------------------------------------------
import { BgIsoScreen } from './bg-iso/bg_iso_screen';
import { BoardScreen } from './board/board_screen';
import { FightScreen } from './fight/fight_screen';
import { FPSArcadeScreen } from './fps-arcade/fps_arcade_screen';
import { IsoScreen } from './iso/iso_screen';
import { PlatformerArcadeScreen } from './platformer-arcade/platformer_arcade_screen';
import { PrerenderedScreen } from './prerendered/prerendered_screen';
import { RPGScreen } from './rpg/rpg_screen';
import { ShootemupScreen } from './shootemup/shootemup_screen';
import { TCGScreen } from './tcg/tcg_screen';
import { CharacterArcadeScreen } from './character-arcade/character_arcade_screen';
import { TilemapScreen } from './tilemap/tilemap_screen';
import { TilemapIsoScreen } from './tilemap-iso/tilemap_iso_screen';
import { TilemapPathfindingScreen } from './tilemap-pathfinding/tilemap_pathfinding_screen';
import { TripleTriadScreen } from './triple-triad/triple_triad_screen';
import { VisualNovelScreen } from './visual-novel/visual_novel_screen';
import { CharacterJoltScreen } from './character-jolt/character_jolt_screen';
import { PlatformerBox2DScreen } from './platformer-box2d/platformer_box2d_screen';
import { CarJoltScreen } from './car-jolt/car_jolt_screen';
import { CurveScreen } from './curve/curve_screen';
import { MenuRingScreen } from './menu-ring/menu_ring_screen';
import { ParticlesScreen } from './particles/particles_screen';
import { PerfScreen } from './perf/perf_screen';
import { ShadowScreen } from './shadow/shadow_screen';
import { UserInterfaceScreen } from './user-interface/user_interface_screen';
import { ViewerScreen } from './viewer/viewer_screen';
import { PackScreen } from './pack/pack_screen';
import { SokobanScreen } from './sokoban/sokoban_screen';
import { ThreeCasualScreen } from './three-casual/three_casual_screen';
import { CarArcadeScreen } from './car-arcade/car_arcade_screen';
import { PrerenderedZScreen } from './prerendered-z/prerendered_z_screen';
import { RailShooterScreen } from './rail-shooter/rail_shooter_screen';
import { RacingShipScreen } from './racing-ship/racing_ship_screen';
import { TwoCasualScreen } from './two-casual/two_casual_screen';
import { MotorcycleJoltScreen } from './motorcycle-jolt/motorcycle_jolt_screen';
import { MotorJoltScreen } from './motor-jolt/motor_jolt_screen';

class BootScreen extends Screen {
  constructor() {
    super();
    this.uiExamples = new UIMenuText({ axis: MenuAxis.XY, rows: 1, columns: 2, className: 'UIMenuText' });
  }

  async onEnter() {
    this.uiExamples.add('0', '2D Background Isometric');
    this.uiExamples.add('1', '2D Checker');
    this.uiExamples.add('2', '2D Fight');
    this.uiExamples.add('3', '3D FPS Arcade');
    this.uiExamples.add('4', '3D Isometric Walkmesh');
    this.uiExamples.add('5', '3D Prerendered Batch');
    this.uiExamples.add('6', '3D RPG Battle System');
    this.uiExamples.add('7', '2D Shootem\'up');
    this.uiExamples.add('8', '2D TCG');
    this.uiExamples.add('9', '3D Character Arcade');
    this.uiExamples.add('10', '2D Tilemap');
    this.uiExamples.add('11', '2D Tilemap Isometric');
    this.uiExamples.add('12', '2D Tilemap Pathfinding');
    this.uiExamples.add('13', '2D Triple Triad');
    this.uiExamples.add('14', '2D Visual Novel');
    this.uiExamples.add('15', '2D Platformer Arcade');
    this.uiExamples.add('16', '3D Character Jolt');
    this.uiExamples.add('17', '2D Platformer Box2D');
    this.uiExamples.add('18', '3D Car Jolt');
    this.uiExamples.add('19', '3D Curve');
    this.uiExamples.add('20', '3D Particles');
    this.uiExamples.add('21', '3D Perf');
    this.uiExamples.add('22', '3D Shadow Map');
    this.uiExamples.add('23', 'UI Menu');
    this.uiExamples.add('24', '3D Viewer');
    this.uiExamples.add('25', '3D Menu Ring');
    this.uiExamples.add('26', '3D Pack');
    this.uiExamples.add('27', '2D Sokoban');
    this.uiExamples.add('28', '3D Casual');
    this.uiExamples.add('29', '3D Car Arcade');
    this.uiExamples.add('30', '3D Prerendered ZBuffer');
    this.uiExamples.add('31', '3D Rail Shooter');
    this.uiExamples.add('32', '3D Racing Ship');
    this.uiExamples.add('33', '2D Casual');
    this.uiExamples.add('34', '3D Motorcycle Jolt');
    this.uiExamples.add('35', '3D Motor Jolt');
    this.uiExamples.setEnabledWidget(31, false);
    uiManager.addWidget(this.uiExamples, 'position:absolute; top:10px; bottom:10px; left:10px; right:10px');

    eventManager.subscribe(this.uiExamples, 'E_ITEM_SELECTED', this, this.handleExamples1Selected);
    uiManager.focus(this.uiExamples);
  }

  onExit() {
    uiManager.removeWidget(this.uiExamples);
  }

  handleExamples1Selected(data) {
    switch (data.id) {
      case '0':
        screenManager.requestSetScreen(new BgIsoScreen());
        break;
      case '1':
        screenManager.requestSetScreen(new BoardScreen());
        break;
      case '2':
        screenManager.requestSetScreen(new FightScreen());
        break;
      case '3':
        screenManager.requestSetScreen(new FPSArcadeScreen());
        break;
      case '4':
        screenManager.requestSetScreen(new IsoScreen());
        break;
      case '5':
        screenManager.requestSetScreen(new PrerenderedScreen());
        break;
      case '6':
        screenManager.requestSetScreen(new RPGScreen());
        break;
      case '7':
        screenManager.requestSetScreen(new ShootemupScreen());
        break;
      case '8':
        screenManager.requestSetScreen(new TCGScreen(), { duelId: '0000' });
        break;
      case '9':
        screenManager.requestSetScreen(new CharacterArcadeScreen());
        break;
      case '10':
        screenManager.requestSetScreen(new TilemapScreen());
        break;
      case '11':
        screenManager.requestSetScreen(new TilemapIsoScreen());
        break;
      case '12':
        screenManager.requestSetScreen(new TilemapPathfindingScreen());
        break;
      case '13':
        screenManager.requestSetScreen(new TripleTriadScreen());
        break;
      case '14':
        screenManager.requestSetScreen(new VisualNovelScreen());
        break;
      case '15':
        screenManager.requestSetScreen(new PlatformerArcadeScreen());
        break;
      case '16':
        screenManager.requestSetScreen(new CharacterJoltScreen());
        break;
      case '17':
        screenManager.requestSetScreen(new PlatformerBox2DScreen());
        break;
      case '18':
        screenManager.requestSetScreen(new CarJoltScreen());
        break;
      case '19':
        screenManager.requestSetScreen(new CurveScreen());
        break;
      case '20':
        screenManager.requestSetScreen(new ParticlesScreen());
        break;
      case '21':
        screenManager.requestSetScreen(new PerfScreen());
        break;
      case '22':
        screenManager.requestSetScreen(new ShadowScreen());
        break;
      case '23':
        screenManager.requestSetScreen(new UserInterfaceScreen());
        break;
      case '24':
        screenManager.requestSetScreen(new ViewerScreen());
        break;
      case '25':
        screenManager.requestSetScreen(new MenuRingScreen());
        break;
      case '26':
        screenManager.requestSetScreen(new PackScreen());
        break;
      case '27':
        screenManager.requestSetScreen(new SokobanScreen());
        break;
      case '28':
        screenManager.requestSetScreen(new ThreeCasualScreen());
        break;
      case '29':
        screenManager.requestSetScreen(new CarArcadeScreen());
        break;
      case '30':
        screenManager.requestSetScreen(new PrerenderedZScreen());
        break;
      case '31':
        screenManager.requestSetScreen(new RailShooterScreen());
        break;
      case '32':
        screenManager.requestSetScreen(new RacingShipScreen());
        break;
      case '33':
        screenManager.requestSetScreen(new TwoCasualScreen());
        break;
      case '34':
        screenManager.requestSetScreen(new MotorcycleJoltScreen());
        break;
      case '35':
        screenManager.requestSetScreen(new MotorJoltScreen());
        break;
      default:
        console.log('Unknown template ID:', data.id);
    }
  }
}

export { BootScreen };