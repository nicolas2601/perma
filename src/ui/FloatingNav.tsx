import type { ReactNode } from 'react';
import { cx } from './cx';

export type NavItem = {
  id: string;
  label: string;
  icon: ReactNode;
};

export type FloatingNavProps = {
  items: readonly NavItem[];
  currentId: string;
  onNavigate: (id: string) => void;
  /** Accessible name of the navigation landmark. */
  label: string;
};

/** Floating glass navigation: Escritorio, Examinar, Revisión, Guía. */
export function FloatingNav({ items, currentId, onNavigate, label }: FloatingNavProps) {
  return (
    <nav
      aria-label={label}
      className="rounded-nav border border-solid border-soft-line bg-surface/90 p-1.5 backdrop-blur-md"
    >
      <ul className="m-0 flex list-none items-stretch gap-px p-0">
        {items.map((item) => {
          const current = item.id === currentId;
          return (
            <li key={item.id} className="flex flex-1">
              <button
                type="button"
                aria-current={current ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
                className={cx(
                  'flex min-h-12 w-full flex-col items-center justify-center gap-px rounded-tile border border-solid p-1 text-header outline-offset-2 transition-[background-color,color] duration-(--motion-press) ease-out',
                  current
                    ? 'border-surface bg-subtle text-ink'
                    : 'border-transparent text-muted enabled:fine-hover:text-ink',
                )}
              >
                <span aria-hidden="true" className="flex size-5 items-center justify-center">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
