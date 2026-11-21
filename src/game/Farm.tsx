import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { ArrowLeft, Minus, Plus, ShoppingCart, RotateCcw, Hand, Play } from 'lucide-react'
import bed from '@content/puzzles/bed.json'
import { puzzleLine, commonLine, numberLine } from '@/lesson/lines'
import { narrator } from '@/lib/narrator'
import { sfx } from '@/lib/sfx'
import { go } from '@/lib/router'
import { readJSON, writeJSON } from '@/lib/storage'
import { useSettings } from '@/lib/settings'
import { log } from '@/lib/activity'
import { blockTexture } from '@/scenes/voxel/textures'
import { HtmlRoot, SceneHtml } from '@/scenes/SceneHtml'

// Game section, milestone 1 (grey-box): the robot's bed. The idea is the mechanic:
// part 1 he fills a 3 × 4 outline block by block; part 2 he must dial how many blocks
// to take for a 5 × 3 bed BEFORE building. The world gives the feedback (a gap, or a pile).

type Phase = 'start' | 'part1' | 'done1' | 'dial' | 'building' | 'few' | 'many' | 'done2' | 'free'
type Mood = 'idle' | 'happy' | 'sad' | 'talk'
interface Save { bedDone: boolean; floorTool: boolean }

const P1 = bed.part1
const P2 = bed.part2
const O1 = new THREE.Vector3(-4, 0, -3.6) // where bed 1 is built
const O2 = new THREE.Vector3(-4, 0, 0.6) // where bed 2 is built
const say = (k: keyof typeof bed.lines, delay = 0) => narrator.say(puzzleLine(bed, k), { delay }).done

function cellPos(o: THREE.Vector3, i: number, w: number) {
  return new THREE.Vector3(o.x + (i % w) + 0.5, 0.5, o.z + Math.floor(i / w) + 0.5)
}

function Robot({ mood, pos }: { mood: Mood; pos: [number, number, number] }) {
  const g = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!g.current || !head.current) return
    g.current.position.y = mood === 'happy' ? Math.abs(Math.sin(t * 7)) * 0.7 : Math.sin(t * 2) * 0.05
    g.current.rotation.y = mood === 'happy' ? t * 4 : -0.5 + Math.sin(t * 0.8) * 0.15
    head.current.rotation.z = mood === 'sad' ? 0.35 : mood === 'talk' ? Math.sin(t * 9) * 0.06 : 0
    head.current.position.y = mood === 'sad' ? 1.45 : 1.6
  })
  return (
    <group position={pos}>
      <group ref={g}>
        <mesh position={[0, 0.65, 0]} castShadow>
          <boxGeometry args={[0.9, 0.9, 0.7]} />
          <meshStandardMaterial color="#5fa3d9" roughness={0.5} />
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

/** A block that drops into place with a little bounce. */
function Block({ pos, tex, color, onTap }: { pos: THREE.Vector3; tex: THREE.Texture; color?: string; onTap?: (e: ThreeEvent<MouseEvent>) => void }) {
  const g = useRef<THREE.Group>(null)
  const born = useRef<number | null>(null)
  useFrame(({ clock }) => {
    if (!g.current) return
    born.current ??= clock.elapsedTime
    const t = Math.min(1, (clock.elapsedTime - born.current) / 0.35)
    const bounce = t < 1 ? (1 - t) * (1 - t) * 2.5 : 0
    g.current.position.set(pos.x, pos.y + bounce, pos.z)
  })
  return (
    <group ref={g} position={pos}>
      <mesh scale={0.88} castShadow onClick={onTap}>
        <boxGeometry />
        <meshStandardMaterial key={color ?? 'tex'} map={color ? null : tex} color={color ?? '#ffffff'} roughness={0.85} />
      </mesh>
      <mesh scale={0.985}>
        <boxGeometry />
        <meshBasicMaterial color="#2b2a33" side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

/** Pulls the camera back on tall, narrow screens so the whole puzzle stays in view. */
function FitCamera() {
  const { camera, size } = useThree()
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height)
    const dist = aspect < 1 ? 15.5 / Math.max(0.55, aspect) ** 0.85 : 15.5
    const dir = new THREE.Vector3(0.05, 1, 0.95).normalize()
    camera.position.copy(dir.multiplyScalar(dist)).add(new THREE.Vector3(-0.6, 0, -0.4))
    camera.lookAt(-0.6, 0, -0.4)
  }, [camera, size])
  return null
}

function GlowCell({ pos, onTap, strong }: { pos: THREE.Vector3; onTap?: () => void; strong?: boolean }) {
  const m = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (m.current) m.current.emissiveIntensity = (strong ? 0.9 : 0.45) + Math.sin(clock.elapsedTime * 4) * 0.2
  })
  return (
    <mesh position={[pos.x, 0.02, pos.z]} rotation={[-Math.PI / 2, 0, 0]} onClick={(e) => (e.stopPropagation(), onTap?.())}>
      <planeGeometry args={[0.92, 0.92]} />
      <meshStandardMaterial ref={m} color="#ffe08a" emissive="#ffc23d" emissiveIntensity={0.5} />
    </mesh>
  )
}

function Scenery() {
  const trunk = useMemo(() => blockTexture('planks', 9), [])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 14]} />
        <meshStandardMaterial color="#b9d89a" />
      </mesh>
      {[[-7, -5], [6.8, -1.5], [5.5, 4]].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          {[0.5, 1.5].map((y) => (
            <mesh key={y} position={[0, y, 0]} castShadow>
              <boxGeometry args={[0.8, 1, 0.8]} />
              <meshStandardMaterial map={trunk} color="#a9784d" />
            </mesh>
          ))}
          <mesh position={[0, 3, 0]} castShadow>
            <boxGeometry args={[2.4, 2, 2.4]} />
            <meshStandardMaterial color="#5c9e4c" roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* the barn, for the teaser */}
      <group position={[3.2, 0, -5.2]}>
        <mesh position={[0, 1.2, 0]} castShadow>
          <boxGeometry args={[4, 2.4, 2.4]} />
          <meshStandardMaterial color="#c4553e" />
        </mesh>
        <mesh position={[0, 2.75, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
          <boxGeometry args={[2.1, 2.1, 2.5]} />
          <meshStandardMaterial color="#8f3a2b" />
        </mesh>
        <mesh position={[0, 0.8, 1.21]}>
          <planeGeometry args={[1.2, 1.6]} />
          <meshStandardMaterial color="#f3ead8" />
        </mesh>
      </group>
    </group>
  )
}

export function Farm() {
  const { reducedMotion } = useSettings()
  const [save, setSave] = useState<Save>(() => readJSON<Save>('game', { bedDone: false, floorTool: false }))
  const [phase, setPhase] = useState<Phase>(save.bedDone ? 'free' : 'start')
  const [mood, setMood] = useState<Mood>('idle')
  const [placed1, setPlaced1] = useState<Set<number>>(new Set())
  const [dial, setDial] = useState(10)
  const [taken, setTaken] = useState(0)
  const [built, setBuilt] = useState(0)
  const [showHand, setShowHand] = useState(false)
  const firstRowSaid = useRef(false)
  const lastAction = useRef(Date.now())
  const hintLevel = useRef(0)
  const htmlRoot = useRef<HTMLDivElement>(null)
  const tex = useMemo(() => blockTexture('planks', 3), [])

  const persist = (s: Save) => {
    setSave(s)
    writeJSON('game', s)
  }
  const acted = () => {
    lastAction.current = Date.now()
    hintLevel.current = 0
    setShowHand(false)
  }
  const talk = useCallback(async (k: keyof typeof bed.lines, after: Mood = 'idle', delay = 0) => {
    setMood('talk')
    const r = await say(k, delay)
    setMood(after)
    return r
  }, [])

  // Hint ladder: ~20 s restate the goal, ~40 s point at the key thing, ~60 s do the first step with him.
  useEffect(() => {
    if (phase !== 'part1' && phase !== 'dial') return
    const id = window.setInterval(() => {
      const idle = (Date.now() - lastAction.current) / 1000
      const level = idle > 60 ? 3 : idle > 40 ? 2 : idle > 20 ? 1 : 0
      if (level <= hintLevel.current) return
      hintLevel.current = level
      void talk(level === 1 ? 'hint1' : level === 2 ? 'hint2' : 'hint3')
      setShowHand(true)
      if (level === 3 && phase === 'part1' && placed1.size === 0) setPlaced1(new Set([0]))
    }, 1000)
    return () => window.clearInterval(id)
  }, [phase, placed1.size, talk])

  const begin = async () => {
    narrator.unlock()
    sfx.tap()
    log({ type: 'start', lesson: 'game-bed' })
    setPhase('part1')
    acted()
    setShowHand(true)
    lastAction.current = Date.now() + 8000 // give the hook time before hints start
    setMood('sad')
    await talk('hook', 'idle')
  }

  const tapCell1 = (i: number) => {
    if (phase !== 'part1') return
    acted()
    sfx.block()
    const next = new Set(placed1)
    next.add(i)
    setPlaced1(next)
    const row0 = Array.from({ length: P1.w }, (_, k) => k).every((k) => next.has(k))
    if (row0 && !firstRowSaid.current) {
      firstRowSaid.current = true
      void talk('firstRow')
    }
    if (next.size === P1.w * P1.h) {
      setPhase('done1')
      sfx.correct()
      setMood('happy')
      void (async () => {
        await talk('done1', 'happy', 400)
        await talk('intro2', 'idle', 300)
        setPhase('dial')
        acted()
      })()
    }
  }
  const pickUp1 = (i: number) => {
    if (phase !== 'part1') return
    acted()
    sfx.tap()
    const next = new Set(placed1)
    next.delete(i)
    setPlaced1(next)
  }

  const changeDial = (d: number) => {
    acted()
    const n = Math.max(1, Math.min(30, dial + d))
    setDial(n)
    sfx.tap()
    narrator.say(numberLine(n))
  }

  const take = () => {
    acted()
    sfx.tap()
    setTaken(dial)
    setBuilt(0)
    setPhase('building')
    const need = P2.w * P2.h
    const toPlace = Math.min(dial, need)
    let k = 0
    const step = reducedMotion ? 0 : 140
    const id = window.setInterval(() => {
      k++
      setBuilt(k)
      sfx.block()
      if (k >= toPlace) {
        window.clearInterval(id)
        window.setTimeout(async () => {
          if (dial === need) {
            setPhase('done2')
            sfx.correct()
            setMood('happy')
            log({ type: 'right', step: 'game-bed/dial', tries: 1, retry: false })
            await talk('done2', 'happy', 200)
            persist({ bedDone: true, floorTool: true })
            await talk('unlock', 'happy', 200)
            await talk('teaser', 'idle', 600)
            setPhase('free')
          } else {
            const few = dial < need
            log({ type: 'wrong', step: 'game-bed/dial', choice: String(dial), retry: false })
            setPhase(few ? 'few' : 'many')
            setMood('sad')
            await talk(few ? 'tooFew' : 'tooMany', 'idle', 300)
            setTaken(0)
            setBuilt(0)
            setPhase('dial')
            acted()
          }
        }, 500)
      }
    }, step || 1)
  }

  const resetPuzzle = () => {
    sfx.tap()
    narrator.stop()
    persist({ bedDone: false, floorTool: false })
    setPlaced1(new Set())
    setTaken(0)
    setBuilt(0)
    setDial(10)
    firstRowSaid.current = false
    setMood('idle')
    setPhase('start')
  }

  const need2 = P2.w * P2.h
  const bed1Done = phase !== 'start' && phase !== 'part1'
  const bed2Done = phase === 'done2' || phase === 'free'
  const extras = Math.max(0, taken - need2)

  return (
    <main className="farm">
      <header className="player-top">
        <button className="icon-btn" onClick={() => (narrator.stop(), go({ name: 'home' }))} aria-label="Home">
          <ArrowLeft aria-hidden />
        </button>
        <span className="farm-title" aria-hidden>
          {save.floorTool && 'Floor tool unlocked'}
        </span>
        <button className="icon-btn" onClick={resetPuzzle} aria-label="Start this puzzle again">
          <RotateCcw aria-hidden />
        </button>
      </header>
      <section className="stage farm-stage" aria-label="The farm">
        <Canvas shadows="percentage" dpr={[1, 2]} camera={{ position: [0, 11, 11], fov: 42 }}>
          <FitCamera />
          <hemisphereLight args={['#fff6e0', '#9bb88a', 1.15]} />
          <directionalLight position={[6, 12, 8]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} />
          <HtmlRoot.Provider value={htmlRoot}>
            <Scenery />
            <Robot mood={mood} pos={[2.6, 0, -1.2]} />
            {/* bed 1: 3 × 4 */}
            {Array.from({ length: P1.w * P1.h }, (_, i) => {
              const p = cellPos(O1, i, P1.w)
              if (placed1.has(i) || bed1Done)
                return <Block key={i} pos={p} tex={tex} color={bed1Done ? (i < P1.w ? '#f6efe1' : '#d2483c') : undefined} onTap={() => pickUp1(i)} />
              return <GlowCell key={i} pos={p} onTap={() => tapCell1(i)} strong={i === 0} />
            })}
            {showHand && phase === 'part1' && (
              <SceneHtml position={cellPos(O1, [...Array(P1.w * P1.h).keys()].find((i) => !placed1.has(i)) ?? 0, P1.w).toArray()} center zIndexRange={[10, 0]}>
                <div className="hand-demo" aria-hidden>
                  <Hand />
                </div>
              </SceneHtml>
            )}
            {/* bed 2: 5 × 3, only after bed 1 */}
            {bed1Done &&
              Array.from({ length: need2 }, (_, i) => {
                const p = cellPos(O2, i, P2.w)
                if (bed2Done) return <Block key={i} pos={p} tex={tex} color={i < P2.w ? '#f6efe1' : '#3b6fd1'} />
                if (i < built) return <Block key={i} pos={p} tex={tex} />
                return <GlowCell key={i} pos={p} strong={phase === 'few'} />
              })}
            {/* spare blocks: a visible pile */}
            {Array.from({ length: phase === 'many' ? extras : 0 }, (_, i) => (
              <Block key={`x${i}`} pos={new THREE.Vector3(O2.x + P2.w + 0.8 + (i % 2), 0.5 + Math.floor(i / 4), O2.z + 1.5 + (Math.floor(i / 2) % 2))} tex={tex} />
            ))}
          </HtmlRoot.Provider>
          <OrbitControls enablePan={false} minDistance={8} maxDistance={20} maxPolarAngle={Math.PI / 2.3} target={[-0.6, 0, -0.4]} enableDamping={!reducedMotion} />
        </Canvas>
        <div className="stage-html" ref={htmlRoot} />
        {phase === 'start' && (
          <div className="farm-start">
            <button className="play-big" onClick={() => void begin()} aria-label="Play">
              <Play aria-hidden fill="currentColor" />
            </button>
          </div>
        )}
      </section>
      {(phase === 'dial' || phase === 'building' || phase === 'few' || phase === 'many') && (
        <nav className="dial" aria-label="How many blocks to take">
          <button className="dial-btn" onClick={() => changeDial(-1)} disabled={phase !== 'dial'} aria-label="One fewer">
            <Minus aria-hidden strokeWidth={3} />
          </button>
          <output className="dial-num tabular-nums" aria-live="polite">
            {dial}
            <span className="scene-unit">blocks</span>
          </output>
          <button className="dial-btn" onClick={() => changeDial(1)} disabled={phase !== 'dial'} aria-label="One more">
            <Plus aria-hidden strokeWidth={3} />
          </button>
          <button className="dial-take" onClick={take} disabled={phase !== 'dial'} aria-label={`Take ${dial} blocks`}>
            <ShoppingCart aria-hidden />
          </button>
        </nav>
      )}
      {phase === 'free' && (
        <p className="farm-note" onClick={() => narrator.say(commonLine('game-more'))}>
          More of the farm is on the way.
        </p>
      )}
    </main>
  )
}
