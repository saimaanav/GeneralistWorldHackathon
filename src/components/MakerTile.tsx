import { css, tile, maker } from "@/lib/proto";

export default function MakerTile({ makerKey, size = 34, className }: { makerKey: string; size?: number; className?: string }) {
  return <span className={className} style={css(tile(makerKey, size))} aria-label={maker(makerKey).name}>{maker(makerKey).letter}</span>;
}
