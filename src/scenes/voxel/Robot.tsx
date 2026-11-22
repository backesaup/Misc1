import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SceneHtml } from '../SceneHtml'

// The robot sidekick (original voxel design). Used in the farm game and in lesson scenes.
export type Mood = 'idle' | 'happy' | 'sad' | 'talk' | 'think'
export const MOODS: Mood[] = ['idle', 'talk', 'happy', 'sad', 'think']

export function Robot({ mood, pos, color = '#5fa3d9', name }: { mood: Mood; pos: [number, number, number]; color?: string; name?: string }) {
  const g = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!g.current || !head.current) return
    g.current.position.y = mood === 'happy' ? Math.abs(Math.sin(t * 7)) * 0.7 : Math.sin(t * 2) * 0.05
    g.current.rotation.y = mood === 'happy' ? t * 4 : -0.5 + Math.sin(t * 0.8) * 0.15
    head.current.rotation.z = mood === 'sad' ? 0.35 : mood === 'think' ? 0.25 * Math.sin(t * 1.5) : mood === 'talk' ? Math.sin(t * 9) * 0.06 : 0
    head.current.position.y = mood === 'sad' ? 1.45 : 1.6
  })
  return (
    <group position={pos}>
      <SceneHtml position={[0, 2.75, 0]} center zIndexRange={[10, 0]}>
        <div className="scene-tag small" style={{ display: name ? undefined : 'none' }}>{name}</div>
      </SceneHtml>
      <group ref={g}>
        <mesh position={[0, 0.65, 0]} castShadow>
          <boxGeometry args={[0.9, 0.9, 0.7]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.7, 0.36]}>
          <boxGeometry args={[0.4, 0.3, 0.02]} />
          <meshStandardMaterial color="#ffd166" emissive="#ffd166" emissiveIntensity={0.4} />
        </mesh>
        <group ref={head} position={[0, 1.6, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.8, 0.65, 0.65]} />
            <meshStandardMaterial color="#e9eef4" roughness={0.4} />
          </mesh>
          {[-0.18, 0.18].map((x) => (
            <mesh key={x} position={[x, mood === 'happy' ? 0.06 : 0.03, 0.33]}>
              <boxGeometry args={[0.13, mood === 'happy' ? 0.06 : 0.16, 0.02]} />
              <meshBasicMaterial color="#2b2a33" />
            </mesh>
          ))}
          <mesh position={[0, -0.15, 0.33]} rotation={[0, 0, mood === 'sad' ? Math.PI : 0]}>
            <torusGeometry args={[0.1, 0.025, 6, 12, Math.PI]} />
            <meshBasicMaterial color="#2b2a33" />
          </mesh>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.3]} />
            <meshStandardMaterial color="#9aa3ad" />
          </mesh>
          <mesh position={[0, 0.65, 0]}>
            <sphereGeometry args={[0.09, 12, 8]} />
            <meshStandardMaterial color="#e07a4f" emissive="#e07a4f" emissiveIntensity={0.5} />
          </mesh>
        </group>
        {[-0.25, 0.25].map((x) => (
          <mesh key={x} position={[x, 0.12, 0]} castShadow>
            <boxGeometry args={[0.25, 0.25, 0.4]} />
            <meshStandardMaterial color="#3d6f99" />
          </mesh>
        ))}
      </group>
    </group>
  )
}
