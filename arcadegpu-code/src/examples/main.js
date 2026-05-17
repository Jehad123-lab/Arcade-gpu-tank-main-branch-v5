import { em } from '@lib/engine/engine_manager';
import { screenManager } from '@lib/screen/screen_manager';
import { gfx3DebugRenderer } from '@lib/gfx3/gfx3_debug_renderer';
// ---------------------------------------------------------------------------------------
import { BootScreen } from './boot_screen';
// ---------------------------------------------------------------------------------------

em.showStats(true);
em.startup();

screenManager.requestSetScreen(new BootScreen());
gfx3DebugRenderer.setShowDebug(true);