import { useSkinSprites } from '@/scenes/voxel/skins'

/** Steve's face (cut from his Minecraft skin), shown on lesson scenes while he is talking. */
export function SteveAvatar({ talking }: { talking: boolean }) {
  const { face } = useSkinSprites('steve')
  return (
    <div className="steve-avatar" data-talking={talking || undefined} aria-hidden>
      <img src={face} alt="" width={8} height={8} />
      <span className="steve-name">Steve</span>
    </div>
  )
}
