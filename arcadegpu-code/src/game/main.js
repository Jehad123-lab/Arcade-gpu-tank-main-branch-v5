import { em } from '@lib/engine/engine_manager';
import { screenManager } from '@lib/screen/screen_manager';
import { gfx3DebugRenderer } from '@lib/gfx3/gfx3_debug_renderer';
// ---------------------------------------------------------------------------------------
import { GameScreen } from './game_screen';
// ---------------------------------------------------------------------------------------

em.showStats(true);
em.startup();

screenManager.requestSetScreen(new GameScreen());
gfx3DebugRenderer.setShowDebug(true);