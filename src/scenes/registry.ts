import type { SceneRef } from '@/lesson/types'
import { sceneCatalog } from './catalog'
import type { SceneDef } from './types'
import { blocks64 } from './voxel/Blocks64'
import { solarCube } from './voxel/SolarCube'
import { disco } from './voxel/Disco'
import { arrange } from './voxel/Arrange'
import { wiring } from './diagram/Wiring'
import { power } from './diagram/Power'

export const scenes: Record<string, Record<string, SceneDef>> = {
  voxel: { blocks64, solarCube, disco, arrange },
  diagram: { wiring, power },
}

export const sceneKey = (s: SceneRef) => `${s.type}:${s.preset}`
export const getScene = (s: SceneRef): SceneDef | undefined => scenes[s.type]?.[s.preset]

if (import.meta.env.DEV) {
  for (const [type, presets] of Object.entries(sceneCatalog))
    for (const [preset, actions] of Object.entries(presets)) {
      const def = scenes[type]?.[preset]
      if (!def) console.warn(`scene ${type}:${preset} is in the catalog but not registered`)
      else for (const a of actions) if (!def.actions[a]) console.warn(`scene ${type}:${preset} is missing action ${a}`)
    }
}
