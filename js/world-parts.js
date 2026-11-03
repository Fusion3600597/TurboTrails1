import { buildSky, buildLights, buildTerrain, buildRoad } from './world-base.js?v=20261108';
import {
  buildStartArea, buildGrandstands, buildLamps, buildItems, buildBoosts,
  buildTurnMarkers, buildWeather,
} from './world-props.js?v=20261108';
import { buildScenery } from './scenery.js?v=20261108';

export function buildWorld(w) {
  buildSky(w);
  buildLights(w);
  buildTerrain(w);
  buildRoad(w);
  buildStartArea(w);
  buildGrandstands(w);
  buildLamps(w);
  buildBoosts(w);
  buildTurnMarkers(w);
  buildItems(w);
  buildWeather(w);
  buildScenery(w);
}
