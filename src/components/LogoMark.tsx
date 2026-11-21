import { LiquidMetal } from '@paper-design/shaders-react'

// The app mark: a block silhouette rendered as liquid metal (Paper's liquid logo shader).
export default function LogoMark({ still, size = 88 }: { still: boolean; size?: number }) {
  return (
    <LiquidMetal
      image={`${import.meta.env.BASE_URL}logo-mark.svg`}
      colorBack="#00000000"
      colorTint="#ffffff"
      repetition={4}
      softness={0.1}
      shiftRed={0.25}
      shiftBlue={0.25}
      distortion={0.08}
      contour={0.45}
      angle={70}
      shape="none"
      speed={still ? 0 : 0.6}
      scale={0.9}
      fit="contain"
      style={{ width: size, height: size }}
    />
  )
}
