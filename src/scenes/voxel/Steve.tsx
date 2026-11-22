import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PlayerObject } from 'skinview3d'
import { SceneHtml } from '../SceneHtml'
import { useSettings } from '@/lib/settings'
import { skinModel, skinTexture, type SkinName } from './skins'

// Steve, the sidekick: a real Minecraft player model (skinview3d) wearing a Minecraft skin.
// Used in the farm game and in lesson scenes. Moods drive simple poses.
export type Mood = 'idle' | 'happy' | 'sad' | 'talk' | 'think' | 'sit'
export const MOODS: Mood[] = ['idle', 'talk', 'happy', 'sad', 'think', 'sit']

/** Height in scene units (a block is 1). */
const HEIGHT = 2

export function Steve({ mood, pos, skin = 'steve', name = 'Steve', turn = -0.5 }: { mood: Mood; pos: [number, number, number]; skin?: SkinName; name?: string; turn?: number }) {
  const { reducedMotion } = useSettings()
  const outer = useRef<THREE.Group>(null)
  const player = useMemo(() => {
    const p = new PlayerObject()
    // skinview3d is typed against its own copy of three's types; the objects are the same at runtime
    p.skin.map = skinTexture(skin) as unknown as typeof p.skin.map
    p.skin.modelType = skinModel(skin)
    p.cape.visible = false
    p.elytra.visible = false
    p.ears.visible = false
    p.traverse((o) => void ((o as unknown as THREE.Mesh).isMesh && (o.castShadow = true)))
    // skinview3d units are pixels (32 tall) with the origin at the waist: stand it on the ground.
    const s = HEIGHT / 32
    p.scale.setScalar(s)
    p.position.y = 16 * s
    return p
  }, [skin])
  useEffect(() => () => {
    player.traverse((o) => {
      const m = o as unknown as THREE.Mesh
      if (!m.isMesh) return
      m.geometry?.dispose()
      for (const mat of ([] as THREE.Material[]).concat(m.material)) {
        // the skin texture is shared: keep it
        mat.dispose()
      }
    })
  }, [player])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const sk = player.skin
    const g = outer.current
    if (!g) return
    const calm = reducedMotion
    sk.head.rotation.set(0, calm ? 0 : Math.sin(t * 0.7) * 0.12, 0)
    sk.rightArm.rotation.set(0, 0, calm ? 0.04 : 0.04 + Math.sin(t * 1.6) * 0.03)
    sk.leftArm.rotation.set(0, 0, calm ? -0.04 : -0.04 - Math.sin(t * 1.6) * 0.03)
    sk.rightLeg.rotation.set(0, 0, 0)
    sk.leftLeg.rotation.set(0, 0, 0)
    g.position.y = 0
    g.rotation.y = turn
    if (mood === 'talk') {
      sk.head.rotation.x = calm ? 0 : Math.sin(t * 9) * 0.07
      sk.rightArm.rotation.x = -0.5 + (calm ? 0 : Math.sin(t * 4) * 0.25)
    } else if (mood === 'happy') {
      sk.rightArm.rotation.set(Math.PI, 0, 0.35 + (calm ? 0 : Math.sin(t * 10) * 0.15))
      sk.leftArm.rotation.set(Math.PI, 0, -0.35 - (calm ? 0 : Math.sin(t * 10) * 0.15))
      if (!calm) g.position.y = Math.abs(Math.sin(t * 6)) * 0.45
    } else if (mood === 'sad') {
      sk.head.rotation.set(0.5, 0, 0)
      sk.rightArm.rotation.set(0.1, 0, 0.02)
      sk.leftArm.rotation.set(0.1, 0, -0.02)
    } else if (mood === 'sit') {
      // thighs forward, as if on a chair (the hips are 0.75 above the feet)
      sk.rightLeg.rotation.set(-Math.PI / 2, 0, 0.05)
      sk.leftLeg.rotation.set(-Math.PI / 2, 0, -0.05)
      sk.rightArm.rotation.set(-0.5, 0, 0.1)
      sk.leftArm.rotation.set(-0.5, 0, -0.1)
    } else if (mood === 'think') {
      sk.head.rotation.set(-0.15, 0.2, calm ? 0.15 : 0.15 + Math.sin(t * 1.5) * 0.05)
      sk.rightArm.rotation.set(-1.9, 0, 0.55)
    }
  })

  return (
    <group position={pos}>
      <SceneHtml position={[0, HEIGHT + 0.45, 0]} center zIndexRange={[10, 0]}>
        <div className="scene-tag small" style={{ display: name ? undefined : 'none' }}>{name}</div>
      </SceneHtml>
      <group ref={outer}>
        <primitive object={player} />
      </group>
    </group>
  )
}
