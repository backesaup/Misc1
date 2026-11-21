import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react'
import { ShaderChunk } from 'three'

// ShaderGradient includes a chunk newer three.js removed. It only matters for
// cube-UV environment maps, which we never use (lightType "3d"), so an empty
// chunk is safe.
const chunks = ShaderChunk as unknown as Record<string, string>
chunks.cube_uv_reflection_fragment ??= ''

// Slow daylight gradient behind the home screen (ShaderGradient).
// lightType "3d" keeps it offline: the "env" light type fetches HDR files.
export default function HomeBackdrop({ still }: { still: boolean }) {
  return (
    <div className="home-backdrop" aria-hidden>
      <ShaderGradientCanvas pixelDensity={1} fov={45} pointerEvents="none" lazyLoad={false} style={{ position: 'absolute', inset: 0 }}>
        <ShaderGradient
          control="props"
          type="waterPlane"
          animate={still ? 'off' : 'on'}
          uSpeed={0.08}
          uStrength={1.6}
          uDensity={1.1}
          uFrequency={4}
          uAmplitude={0}
          color1="#f7d488"
          color2="#a9d6ec"
          color3="#f3ead8"
          lightType="3d"
          brightness={1.25}
          reflection={0.1}
          cAzimuthAngle={180}
          cPolarAngle={80}
          cDistance={2.8}
          cameraZoom={9}
          positionX={0}
          positionY={0}
          positionZ={0}
          rotationX={50}
          rotationY={0}
          rotationZ={-60}
          grain="off"
        />
      </ShaderGradientCanvas>
    </div>
  )
}
