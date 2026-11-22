import { createRoot } from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import { useBlockModel, type BlockModelName } from '@/scenes/voxel/blockmodels'
const q = new URLSearchParams(location.search)
const ALL: BlockModelName[] = ['cogwheel', 'large_cogwheel', 'shaft', 'gearbox', 'hand_crank', 'encased_fan', 'millstone', 'mechanical_press', 'cooking_pot', 'stove', 'cutting_board', 'chair', 'table', 'stool', 'desk', 'sofa', 'lamp', 'fridge', 'oak_stairs', 'crafting_table', 'furnace', 'oak_door']
const NAMES = q.get('only') ? (q.get('only')!.split(',') as BlockModelName[]) : ALL
const COLS = Math.min(6, NAMES.length)
function M({ name, x, y }: { name: BlockModelName; x: number; y: number }) {
  const m = useBlockModel(name)
  return m ? <mesh geometry={m.geometry} material={m.materials} position={[x, y, 0]} rotation={[0.35, Number(q.get('rot') ?? 0.6), 0]} /> : null
}
createRoot(document.getElementById('r')!).render(
  <Canvas orthographic camera={{ position: [0, 0, 20], zoom: Number(q.get('zoom') ?? 70) }}>
    <hemisphereLight args={['#fff', '#8a8', 1.6]} />
    <directionalLight position={[4, 8, 6]} intensity={1.5} />
    {NAMES.map((n, i) => <M key={n} name={n} x={((i % COLS) - (COLS - 1) / 2) * 2.4} y={2.6 - Math.floor(i / COLS) * 2.6} />)}
  </Canvas>,
)
