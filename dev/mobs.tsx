import { createRoot } from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import { useMob, type MobName } from '@/scenes/voxel/mobs'
const ONLY = new URLSearchParams(location.search).get('only')
const ALL: MobName[] = ['chicken', 'sheep', 'pig', 'cow', 'iron_golem', 'wolf', 'bee', 'rabbit', 'fox', 'villager', 'llama', 'parrot', 'cod', 'frog', 'tadpole', 'turtle', 'goat', 'panda', 'chick']
const NAMES = ONLY ? (ONLY.split(',') as MobName[]) : ALL
const ROT = Number(new URLSearchParams(location.search).get('rot') ?? 0.6)
function M({ name, x, y }: { name: MobName; x: number; y: number }) {
  const m = useMob(name)
  return m ? <mesh geometry={m.geometry} material={m.material} position={[x, y, 0]} rotation={[0, ROT, 0]} /> : null
}
createRoot(document.getElementById('r')!).render(
  <Canvas orthographic camera={{ position: [0, 3, 20], zoom: Number(new URLSearchParams(location.search).get('zoom') ?? 55) }}>
    <hemisphereLight args={['#fff', '#8a8', 1.6]} />
    <directionalLight position={[4, 8, 6]} intensity={1.5} />
    {NAMES.map((n, i) => <M key={n} name={n} x={NAMES.length < 5 ? (i - (NAMES.length - 1) / 2) * 3 : (i % 5) * 4 - 8} y={NAMES.length < 5 ? -1 : 2.5 - Math.floor(i / 5) * 4} />)}
  </Canvas>,
)
