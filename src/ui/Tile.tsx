import type { ReactNode } from 'react';
import { Card } from './Card';
import { IconBlob } from './IconBlob';
import type { Tint } from './tints';

export type TileProps = {
  tint: Tint;
  icon: ReactNode;
  title: string;
  body: string;
};

/** Tinted bento tile: IconBlob, heading and one line of body. Tint marks the section, not a status. */
export function Tile({ tint, icon, title, body }: TileProps) {
  return (
    <Card variant="soft" tint={tint}>
      <IconBlob tint={tint} tone="surface">
        {icon}
      </IconBlob>
      <h3 className="m-0 text-body-medium text-ink">{title}</h3>
      <p className="m-0 text-label text-muted">{body}</p>
    </Card>
  );
}
