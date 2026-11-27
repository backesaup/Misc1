// The little brick world behind the intro and the home screen: his car on a road, a few
// brick trees, warm sun. Step 2 replaces this with the full brick engine.

import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { baseplate, brick, BRICK, COLORS, plastic, PLATE } from './bricks'

export interface GarageScene {
  setPlate(text: string): void
  flashHeadlights(times?: number): void
  rev(): void
  /** 'intro' looks at the car's face; 'hub' slowly circles it. */
  setMode(mode: 'intro' | 'hub'): void
  dispose(): void
}

function plateTexture(text: string): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#ffd400'
  g.fillRect(0, 0, 256, 64)
  g.strokeStyle = '#111'
  g.lineWidth = 6
  g.strokeRect(3, 3, 250, 58)
  g.fillStyle = '#111'
  g.font = 'bold 40px system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text.toUpperCase().slice(0, 8), 128, 35)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

function buildCar() {
  const car = new THREE.Group()
  const body = new THREE.Group() // bounces on its springs; wheels stay put
  car.add(body)
  const add = (m: THREE.Mesh) => {
    m.castShadow = true
    body.add(m)
    return m
  }
  // Chassis 4 studs wide (x: -2..2) and 8 long (z: -4..4). Front faces +z.
  add(brick(4, 8, PLATE, COLORS.darkGrey, -2, 0.6, -4))
  add(brick(4, 8, BRICK, COLORS.red, -2, 1.0, -4, { smooth: true }))
  add(brick(4, 3, PLATE, COLORS.red, -2, 2.2, 1)) // bonnet
  add(brick(4, 1, BRICK, COLORS.glass, -2, 2.2, 0, { transparent: true, smooth: true })) // windscreen
  add(brick(1, 3, BRICK, COLORS.red, -2, 2.2, -3, { smooth: true }))
  add(brick(1, 3, BRICK, COLORS.red, 1, 2.2, -3, { smooth: true }))
  add(brick(2, 1, BRICK, COLORS.red, -1, 2.2, -4, { smooth: true }))
  add(brick(4, 4, PLATE, COLORS.white, -2, 3.4, -3)) // roof
  add(brick(4, 1, PLATE, COLORS.black, -2, 2.2, -4)) // spoiler base
  add(brick(1, 1, BRICK, COLORS.black, -2, 2.6, -4, { smooth: true }))
  add(brick(1, 1, BRICK, COLORS.black, 1, 2.6, -4, { smooth: true }))
  add(brick(4, 1, PLATE, COLORS.yellow, -2, 3.8, -4.2)) // wing

  // Grille and bumper on the nose.
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.08), plastic(COLORS.black))
  grille.position.set(0, 1.75, 4.02)
  body.add(grille)
  const bumper = add(new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.35, 0.4), plastic(COLORS.grey)))
  bumper.position.set(0, 1.05, 4.1)

  // Number plate.
  const plateMat = new THREE.MeshStandardMaterial({ roughness: 0.4, map: plateTexture('') })
  const plate = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 0.06), plateMat)
  plate.position.set(0, 1.3, 4.32)
  body.add(plate)

  // Headlights: round 1×1 tiles that glow, with a soft beam when they flash.
  const lightMat = new THREE.MeshStandardMaterial({ color: '#fffbe8', emissive: '#ffe9a8', emissiveIntensity: 0.3, roughness: 0.2 })
  const beamMat = new THREE.MeshBasicMaterial({
    color: '#fff3c4',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
  const beamGeo = new THREE.ConeGeometry(1.1, 4.5, 24, 1, true).rotateX(-Math.PI / 2).translate(0, 0, 2.25)
  for (const x of [-1.35, 1.35]) {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 20).rotateX(Math.PI / 2), lightMat)
    lamp.position.set(x, 1.75, 4.03)
    body.add(lamp)
    const beam = new THREE.Mesh(beamGeo, beamMat)
    beam.position.set(x, 1.75, 4.1)
    beam.rotation.x = 0.18
    body.add(beam)
  }

  // Wheels.
  const tyre = new THREE.CylinderGeometry(0.85, 0.85, 0.8, 28).rotateZ(Math.PI / 2)
  const hub = new THREE.CylinderGeometry(0.42, 0.42, 0.84, 16).rotateZ(Math.PI / 2)
  const tyreMat = new THREE.MeshStandardMaterial({ color: '#202022', roughness: 0.7 })
  for (const x of [-2.15, 2.15])
    for (const z of [-2.5, 2.5]) {
      const w = new THREE.Mesh(tyre, tyreMat)
      w.position.set(x, 0.85, z)
      w.castShadow = true
      const h = new THREE.Mesh(hub, plastic(COLORS.grey))
      h.position.copy(w.position)
      car.add(w, h)
    }

  return { car, body, plateMat, lightMat, beamMat }
}

function buildWorld(): THREE.Group {
  const world = new THREE.Group()
  const W = 40
  // Grass with no studs under the road.
  const grass = baseplate(W, W, COLORS.green, (x) => x >= 16 && x < 24)
  world.add(grass)
  const road = new THREE.Mesh(new THREE.BoxGeometry(8, PLATE, W).translate(0, PLATE / 2 + 0.001, 0), plastic(COLORS.darkGrey))
  road.receiveShadow = true
  world.add(road)
  for (let z = -W / 2 + 1; z < W / 2; z += 4) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 2), plastic(COLORS.white))
    dash.position.set(0, PLATE + 0.03, z)
    world.add(dash)
  }
  const tree = (x: number, z: number, s = 1) => {
    const t = new THREE.Group()
    t.add(brick(1, 1, BRICK * 2, COLORS.brown, -0.5, 0, -0.5, { smooth: true }))
    t.add(brick(3, 3, BRICK, COLORS.darkGreen, -1.5, BRICK * 2, -1.5))
    t.add(brick(2, 2, BRICK, COLORS.darkGreen, -1, BRICK * 3, -1))
    t.position.set(x, PLATE, z)
    t.scale.setScalar(s)
    world.add(t)
  }
  tree(-8, -4)
  tree(-11, 6, 1.2)
  tree(9, 2, 1.1)
  tree(12, -8)
  tree(-14, -12, 1.3)
  // A little brick traffic light by the road.
  const tl = new THREE.Group()
  tl.add(brick(1, 1, BRICK * 3, COLORS.darkGrey, -0.5, 0, -0.5, { smooth: true }))
  tl.add(brick(1, 1, BRICK * 2, COLORS.black, -0.5, BRICK * 3, -0.5, { smooth: true }))
  ;['#ff3b30', '#ffcc00', '#34c759'].forEach((c, i) => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshStandardMaterial({ color: c, emissive: i === 2 ? c : '#000', emissiveIntensity: 1.2 }))
    l.position.set(0, BRICK * 5 - 0.4 - i * 0.7, 0.5)
    tl.add(l)
  })
  tl.position.set(5.5, PLATE, -3)
  world.add(tl)
  // Some loose bricks scattered about: a hint of what's coming.
  world.add(brick(2, 1, BRICK, COLORS.yellow, 6, PLATE, -3))
  world.add(brick(2, 2, BRICK, COLORS.blue, 7, PLATE, -6))
  world.add(brick(1, 2, BRICK, COLORS.orange, 6.5, PLATE + BRICK, -6))
  return world
}

export function createGarageScene(canvas: HTMLCanvasElement, opts: { reducedMotion: boolean; showFps?: boolean }): GarageScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#8fd3ff')
  scene.fog = new THREE.Fog('#8fd3ff', 30, 60)
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()

  scene.add(new THREE.HemisphereLight('#fff6e0', '#4a7a3a', 0.9))
  const sun = new THREE.DirectionalLight('#fff1d6', 2.2)
  sun.position.set(8, 14, 6)
  sun.castShadow = true // only the car casts shadows (budget from the brief)
  sun.shadow.mapSize.set(1024, 1024)
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 40 })
  sun.shadow.bias = -0.0005
  scene.add(sun)

  scene.add(buildWorld())
  const { car, body, plateMat, lightMat, beamMat } = buildCar()
  car.position.set(-2, PLATE, 0)
  scene.add(car)
  sun.target = car

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
  let mode: 'intro' | 'hub' = 'intro'
  let flashUntil = 0
  let flashCount = 0
  let flashStart = 0
  let revStart = -10
  let orbit = 0.5
  const target = new THREE.Vector3(-2, 1.6, 0)
  const camGoal = new THREE.Vector3()

  const fpsEl = opts.showFps ? document.createElement('div') : null
  if (fpsEl) {
    fpsEl.className = 'fps'
    document.body.append(fpsEl)
  }
  let frames = 0
  let fpsT = performance.now()

  function resize() {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false)
    }
    camera.aspect = w / h
    camera.fov = w / h < 0.8 ? 55 : 40
    camera.updateProjectionMatrix()
  }

  // A tiny clock (THREE.Clock is deprecated).
  const clock = {
    last: performance.now(),
    elapsedTime: 0,
    getDelta() {
      const now = performance.now()
      const d = (now - this.last) / 1000
      this.last = now
      this.elapsedTime += d
      return d
    },
  }
  let raf = 0
  let running = true
  function frame() {
    if (!running) return
    raf = requestAnimationFrame(frame)
    const dt = Math.min(clock.getDelta(), 0.05)
    const t = clock.elapsedTime
    resize()

    // Camera.
    if (mode === 'intro') camGoal.set(-2 + 8, 6, 18)
    else {
      if (!opts.reducedMotion) orbit += dt * 0.12
      camGoal.set(-2 + Math.sin(orbit) * 19, 8, Math.cos(orbit) * 19)
    }
    camera.position.lerp(camGoal, 1 - Math.exp(-dt * 2.5))
    camera.lookAt(target)

    // Headlight flashes.
    let glow = 0.3
    let beam = 0
    if (t < flashUntil) {
      const phase = ((t - flashStart) / 0.35) % 1
      const on = phase < 0.55
      glow = on ? 4 : 0.3
      beam = on ? 0.16 : 0
    } else if (flashCount > 0) {
      glow = 1.2
      beam = 0.05 // stay on low after flashing, like real headlights
    }
    lightMat.emissiveIntensity = glow
    beamMat.opacity = beam

    // Engine rev: the body bounces and tips back on its springs, then settles to an idle shiver.
    const r = t - revStart
    let bob = 0
    let pitch = 0
    if (r >= 0 && r < 2 && !opts.reducedMotion) {
      const env = Math.exp(-r * 2.2)
      bob = Math.abs(Math.sin(r * 18)) * 0.12 * env
      pitch = -Math.sin(Math.min(r * 4, Math.PI)) * 0.05 * env
    }
    if (flashCount > 0 && !opts.reducedMotion) bob += Math.sin(t * 40) * 0.008 // idle
    body.position.y = bob
    body.rotation.x = pitch

    renderer.render(scene, camera)

    if (fpsEl) {
      frames++
      const now = performance.now()
      if (now - fpsT > 500) {
        fpsEl.textContent = `${Math.round((frames * 1000) / (now - fpsT))} fps`
        frames = 0
        fpsT = now
      }
    }
  }
  camera.position.set(-2 + 8, 6, 18)
  frame()

  const onVis = () => {
    if (document.hidden) {
      running = false
      cancelAnimationFrame(raf)
    } else if (!running) {
      running = true
      clock.getDelta()
      frame()
    }
  }
  document.addEventListener('visibilitychange', onVis)

  return {
    setPlate(text) {
      plateMat.map?.dispose()
      plateMat.map = plateTexture(text)
      plateMat.needsUpdate = true
    },
    flashHeadlights(times = 2) {
      flashStart = clock.elapsedTime
      flashUntil = flashStart + times * 0.35
      flashCount++
    },
    rev() {
      revStart = clock.elapsedTime + 0.3
    },
    setMode(m) {
      mode = m
    },
    dispose() {
      running = false
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVis)
      fpsEl?.remove()
      renderer.dispose()
    },
  }
}
