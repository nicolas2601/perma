type TileProps = {
  label: string;
  value: string;
};

/** Small label/value card used for status readouts (e.g. "Estado de revisión"). */
export function Tile({ label, value }: TileProps) {
  return (
    <div className="flex min-h-15 flex-col justify-between rounded-tile bg-subtle p-3">
      <span className="text-header text-muted">{label}</span>
      <span className="text-body-medium text-ink">{value}</span>
    </div>
  );
}
