import { useEffect, useRef, type RefObject } from 'react'
import { HtmlRoot } from '@/scenes/SceneHtml'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { SceneDef, SceneProps } from '@/scenes/types'

function CameraRig({ def, reduced, ctrl }: { def: SceneDef; reduced: boolean; ctrl: SceneProps['ctrl'] }) {
  const { camera, size } = useThree()
  const target = useRef(new THREE.Vector3())
  const goal = useRef(new THREE.Vector3())
  const first = useRef(true)
  useEffect(() => {
    first.current = true
  }, [def])
  useFrame((_, dt) => {
    const base = def.camera ?? { position: [8, 8, 12] as [number, number, number], target: [0, 1, 0] as [number, number, number] }
    const aim = def.aim?.(ctrl)
    const c = aim
      ? { ...base, target: aim, position: [base.position[0] + aim[0] - base.target[0], base.position[1] + aim[1] - base.target[1], base.position[2] + aim[2] - base.target[2]] as [number, number, number] }
      : base
    // portrait screens need the camera further back to fit the same scene
    const aspect = size.width / Math.max(1, size.height)
    const pull = aspect < 1 ? 1 + (1 - aspect) * 1.7 : 1
    goal.current.set(...c.position).sub(new THREE.Vector3(...c.target)).multiplyScalar(pull).add(new THREE.Vector3(...c.target))
    const k = first.current || reduced ? 1 : 1 - Math.exp(-dt * 3)
    camera.position.lerp(goal.current, k)
    target.current.lerp(new THREE.Vector3(...c.target), k)
    camera.lookAt(target.current)
    const pc = camera as THREE.PerspectiveCamera
    if (c.fov && pc.fov !== c.fov) {
      pc.fov = c.fov
      pc.updateProjectionMatrix()
    }
    first.current = false
  })
  return null
}

function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <circleGeometry args={[9, 64]} />
        <meshStandardMaterial color="#cfe3b4" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[9.6, 64]} />
        <meshStandardMaterial color="#b9d39b" roughness={1} />
      </mesh>
    </group>
  )
}

export function Stage3D({ def, props, htmlRoot }: { def: SceneDef; props: SceneProps; htmlRoot: RefObject<HTMLDivElement | null> }) {
  const Comp = def.Component
  return (
    <Canvas
      className="stage-canvas"
      shadows="percentage"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: def.camera?.position ?? [8, 8, 12], fov: def.camera?.fov ?? 40 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
      }}
    >
      <hemisphereLight args={['#fff6e0', '#9bb88a', 1.1]} />
      <directionalLight
        position={[6, 12, 8]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0004}
      />
      <CameraRig def={def} reduced={props.reduced} ctrl={props.ctrl} />
      <Ground />
      <HtmlRoot.Provider value={htmlRoot}>
        <Comp {...props} />
      </HtmlRoot.Provider>
    </Canvas>
  )
}
