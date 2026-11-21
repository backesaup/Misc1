import { createContext, useContext, type ComponentProps, type RefObject } from 'react'
import { Html } from '@react-three/drei'

/**
 * drei <Html>, portalled into a container that outlives the canvas. Without this,
 * labels try to remove themselves from a parent React has already removed when
 * a lesson switches from a 3D scene to a diagram.
 */
export const HtmlRoot = createContext<RefObject<HTMLElement | null> | null>(null)

export function SceneHtml(props: ComponentProps<typeof Html>) {
  const root = useContext(HtmlRoot)
  return <Html {...props} portal={(root ?? undefined) as RefObject<HTMLElement> | undefined} />
}
