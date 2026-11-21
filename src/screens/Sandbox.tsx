import { useMemo, useRef, useState } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { ArrowLeft, Eraser, Plus, RotateCcw, RotateCw, Undo2 } from 'lucide-react'
import { go } from '@/lib/router'
import { sfx } from '@/lib/sfx'
import { log } from '@/lib/activity'
import { useSettings } from '@/lib/settings'
import { HoldButton } from '@/components/HoldButton'
import { blockTexture } from '@/scenes/voxel/textures'

// Free play: no questions, no goals. Build squares, cubes and stacks; the counter shows how many blocks.
const SIZE = 10
const KINDS = [
  { id: 'planks', label: 'Wood', swatch: '#c9945c' },
  { id: 'stone', label: 'Stone', swatch: '#9a9a95' },
  { id: 'grass_top', label: 'Grass', swatch: '#7fb05a' },
  { id: 'clay', label: 'Clay', swatch: '#e2845c' },
] as const
type Kind = (typeof KINDS)[number]['id']
type Block = { x: number; y: number; z: number; kind: Kind }
const key = (b: { x: number; y: number; z: number }) => `${b.x},${b.y},${b.z}`

function World({ blocks, onTapGround, onTapBlock }: { blocks: Block[]; onTapGround: (x: number, z: number) => void; onTapBlock: (b: Block, n: THREE.Vector3) => void }) {
  const mats = useMemo(() => Object.fromEntries(KINDS.map((k) => [k.id, new THREE.MeshStandardMaterial({ map: blockTexture(k.id, 5), roughness: 0.85 })])), [])
  const shellMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#2b2a33', side: THREE.BackSide }), [])
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const isTap = (e: ThreeEvent<MouseEvent>) => e.delta < 6
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={(e) => {
          if (!isTap(e)) return
          e.stopPropagation()
          onTapGround(Math.floor(e.point.x + SIZE / 2), Math.floor(e.point.z + SIZE / 2))
        }}
      >
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial color="#cfe3b4" />
      </mesh>
      <gridHelper args={[SIZE, SIZE, '#9cb889', '#b5cd9f']} position={[0, 0.002, 0]} />
      {blocks.map((b) => (
        <group key={key(b)} position={[b.x - SIZE / 2 + 0.5, b.y + 0.5, b.z - SIZE / 2 + 0.5]}>
          <mesh
            geometry={box}
            material={mats[b.kind]}
            scale={0.88}
            castShadow
            onClick={(e) => {
              if (!isTap(e)) return
              e.stopPropagation()
              const n = e.face?.normal?.clone() ?? new THREE.Vector3(0, 1, 0)
              onTapBlock(b, n.round())
            }}
          />
          <mesh geometry={box} material={shellMat} scale={0.985} />
        </group>
      ))}
    </>
  )
}

export function Sandbox() {
  const { reducedMotion } = useSettings()
  const [blocks, setBlocks] = useState<Block[]>([])
  const [history, setHistory] = useState<Block[][]>([])
  const [kind, setKind] = useState<Kind>('planks')
  const [erase, setErase] = useState(false)
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null)

  const commit = (next: Block[]) => {
    setHistory((h) => [...h.slice(-50), blocks])
    setBlocks(next)
  }
  const occupied = useMemo(() => new Set(blocks.map(key)), [blocks])
  const place = (b: Omit<Block, 'kind'>) => {
    if (b.x < 0 || b.z < 0 || b.x >= SIZE || b.z >= SIZE || b.y < 0 || b.y > 12 || occupied.has(key(b))) return
    sfx.block()
    commit([...blocks, { ...b, kind }])
  }
  const remove = (b: Block) => {
    sfx.tap()
    commit(blocks.filter((o) => key(o) !== key(b)))
  }
  const tapGround = (x: number, z: number) => {
    if (erase) return
    // drop onto the top of that column
    let y = 0
    while (occupied.has(`${x},${y},${z}`)) y++
    place({ x, y, z })
  }
  const tapBlock = (b: Block, n: THREE.Vector3) => (erase ? remove(b) : place({ x: b.x + n.x, y: b.y + n.y, z: b.z + n.z }))
  const turn = (dir: number) => {
    const c = controls.current
    if (!c) return
    sfx.tap()
    c.setAzimuthalAngle(c.getAzimuthalAngle() + (dir * Math.PI) / 4)
  }
  const back = () => {
    if (blocks.length) log({ type: 'sandbox', blocks: blocks.length })
    go({ name: 'home' })
  }

  return (
    <main className="sandbox">
      <header className="player-top">
        <button className="icon-btn" onClick={back} aria-label="Home">
          <ArrowLeft aria-hidden />
        </button>
        <div className="sandbox-count" aria-live="polite">
          <span className="tabular-nums">{blocks.length}</span>
          <span className="scene-unit">{blocks.length === 1 ? 'block' : 'blocks'}</span>
        </div>
        <button className="icon-btn" onClick={() => history.length && (sfx.tap(), setBlocks(history[history.length - 1]), setHistory((h) => h.slice(0, -1)))} aria-label="Undo" disabled={!history.length}>
          <Undo2 aria-hidden />
        </button>
      </header>
      <section className="stage sandbox-stage" aria-label="Block world. Tap the ground or a block to build.">
        <Canvas shadows="percentage" dpr={[1, 2]} camera={{ position: [9, 10, 11], fov: 40 }}>
          <hemisphereLight args={['#fff6e0', '#9bb88a', 1.1]} />
          <directionalLight position={[6, 12, 8]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} />
          <World blocks={blocks} onTapGround={tapGround} onTapBlock={tapBlock} />
          <OrbitControls ref={controls} enablePan={false} enableZoom minDistance={8} maxDistance={24} maxPolarAngle={Math.PI / 2.15} enableDamping={!reducedMotion} target={[0, 1, 0]} />
        </Canvas>
      </section>
      <nav className="sandbox-tools" aria-label="Building tools">
        <button className="dock-btn" onClick={() => turn(-1)} aria-label="Turn left">
          <RotateCcw aria-hidden />
        </button>
        <div className="palette" role="radiogroup" aria-label="Block">
          {KINDS.map((k) => (
            <button
              key={k.id}
              role="radio"
              aria-checked={!erase && kind === k.id}
              aria-label={k.label}
              className="swatch"
              style={{ background: k.swatch }}
              onClick={() => (sfx.tap(), setKind(k.id), setErase(false))}
            >
              {!erase && kind === k.id && <Plus aria-hidden strokeWidth={3} />}
            </button>
          ))}
          <button role="radio" aria-checked={erase} aria-label="Take blocks away" className="swatch eraser" onClick={() => (sfx.tap(), setErase((e) => !e))}>
            <Eraser aria-hidden />
          </button>
        </div>
        <button className="dock-btn" onClick={() => turn(1)} aria-label="Turn right">
          <RotateCw aria-hidden />
        </button>
      </nav>
      <HoldButton ms={1200} onDone={() => blocks.length && commit([])} label="Hold to clear all blocks" className="sandbox-clear">
        Hold to clear
      </HoldButton>
    </main>
  )
}
