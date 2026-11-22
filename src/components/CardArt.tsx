import { memo, useMemo } from 'react'

// Isometric voxel pictures drawn as SVG: original art, no files, crisp at any size.
interface Vox { x: number; y: number; z: number; top: string; left: string; right: string; cell?: boolean }

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const ch = (s: number) => {
    const c = (n >> s) & 255
    return Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k))
  }
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`
}
const block = (x: number, y: number, z: number, base: string, cell = false): Vox => ({
  x, y, z, cell, top: shade(base, 0.18), left: shade(base, -0.08), right: shade(base, -0.3),
})

const WOOD = '#c9945c'
const STONE = '#9a9a95'
const GRASS = '#7fb05a'
const BLUE = '#3b5fb0'
const SUN = '#f2b84b'

const presets: Record<string, () => Vox[]> = {
  stack64: () => {
    const v: Vox[] = []
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) v.push(block(x, y, z, WOOD))
    return v
  },
  solarCube: () => {
    const v: Vox[] = []
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 3; x++)
        for (let z = 0; z < 3; z++) v.push({ x, y, z, top: '#2c4a94', left: '#22396f', right: '#182a52', cell: true })
    return v
  },
  made: () => {
    // a chair: four legs, a seat and a back
    const v: Vox[] = []
    for (const [x, z] of [[0, 0], [2, 0], [0, 2], [2, 2]]) v.push(block(x, 0, z, WOOD))
    for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++) v.push(block(x, 1, z, '#d9a066'))
    for (let x = 0; x < 3; x++) for (let y = 2; y < 4; y++) v.push(block(x, y, 0, WOOD))
    return v
  },
  build: () => {
    const v: Vox[] = []
    for (let x = 0; x < 4; x++) for (let z = 0; z < 2; z++) for (let y = 0; y <= x; y++) v.push(block(x, y, z, y === x ? GRASS : STONE))
    return v
  },
  disco: () => {
    // a 4 × 4 light-up floor under a blocky mirror ball
    const v: Vox[] = []
    const tiles = ['#ff6b5c', '#ffd166', '#58b368', '#4f8ff0']
    for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) v.push({ ...block(x, 0, z, tiles[(x + z) % 4]), top: tiles[(x + z) % 4] })
    for (let x = 1; x < 3; x++) for (let z = 1; z < 3; z++) for (let y = 3; y < 5; y++) v.push(block(x, y, z, '#c9d0de'))
    return v
  },
  science: () => {
    // a flower pot with a sprouting plant
    const v: Vox[] = []
    for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++) v.push(block(x, 0, z, '#c4553e'))
    for (let y = 1; y < 4; y++) v.push(block(1, y, 1, '#3f9b5a'))
    v.push(block(0, 3, 1, '#58b368'), block(2, 2, 1, '#58b368'))
    for (const [x, z] of [[0, 1], [2, 1], [1, 0], [1, 2]]) v.push(block(x, 4, z, '#ff6b5c'))
    v.push(block(1, 4, 1, '#ffd166'))
    return v
  },
  maths: () => {
    // doubling: 1, 2, 4, 8
    const v: Vox[] = []
    v.push(block(0, 0, 3, SUN))
    for (let y = 0; y < 2; y++) v.push(block(1, y, 3, SUN))
    for (let y = 0; y < 2; y++) for (let x = 2; x < 4; x++) v.push(block(x, y, 3, BLUE))
    for (let y = 0; y < 2; y++) for (let x = 2; x < 4; x++) for (let z = 1; z < 3; z++) v.push(block(x, y, z, '#5b7fd0'))
    return v
  },
}

const A = 20 // half tile width
const B = 11.5 // half tile height
const H = 23 // block height

function project(x: number, y: number, z: number) {
  return { sx: (x - z) * A, sy: (x + z) * B - y * H }
}

export const CardArt = memo(function CardArt({ art, className }: { art: string; className?: string }) {
  const { boxes, vb } = useMemo(() => {
    const vox = (presets[art] ?? presets.maths)()
    // draw back to front
    vox.sort((a, b) => a.x + a.z - (b.x + b.z) || a.y - b.y)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    const boxes = vox.map((v) => {
      const { sx, sy } = project(v.x, v.y, v.z)
      minX = Math.min(minX, sx - A); maxX = Math.max(maxX, sx + A)
      minY = Math.min(minY, sy - H - B); maxY = Math.max(maxY, sy + B)
      return { v, sx, sy }
    })
    const pad = 10
    return { boxes, vb: `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}` }
  }, [art])

  return (
    <svg viewBox={vb} className={className ?? 'vox-art'} aria-hidden>
      {boxes.map(({ v, sx, sy }, i) => {
        const top = `M${sx} ${sy - H - B} L${sx + A} ${sy - H} L${sx} ${sy - H + B} L${sx - A} ${sy - H} Z`
        const left = `M${sx - A} ${sy - H} L${sx} ${sy - H + B} L${sx} ${sy + B} L${sx - A} ${sy} Z`
        const right = `M${sx + A} ${sy - H} L${sx} ${sy - H + B} L${sx} ${sy + B} L${sx + A} ${sy} Z`
        return (
          <g key={i} strokeLinejoin="round">
            <path d={left} fill={v.left} />
            <path d={right} fill={v.right} />
            <path d={top} fill={v.top} />
            {v.cell && (
              <g stroke="rgba(214,224,240,0.55)" strokeWidth={0.9} fill="none">
                <path d={`M${sx - A / 2} ${sy - H - B / 2} L${sx + A / 2} ${sy - H + B / 2}`} />
                <path d={`M${sx - A * 0.8} ${sy - H * 0.5 - 2} L${sx - A * 0.2} ${sy - H * 0.5 + B * 0.6 - 2}`} />
                <path d={`M${sx + A * 0.8} ${sy - H * 0.5 - 2} L${sx + A * 0.2} ${sy - H * 0.5 + B * 0.6 - 2}`} />
              </g>
            )}
            <path d={`${top} ${left} ${right}`} fill="none" stroke="rgba(30,25,20,0.16)" strokeWidth={0.8} />
          </g>
        )
      })}
    </svg>
  )
})
