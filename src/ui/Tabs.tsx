import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';

export type TabItem = {
  value: string;
  label: string;
  panel: ReactNode;
};

export type TabsProps = {
  items: readonly TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  /** Accessible name of the tab list, e.g. "Vistas de la imagen". */
  label: string;
};

const TRIGGER_CLASSES = [
  'relative flex min-h-11 flex-1 items-center justify-center px-1 text-header text-muted outline-offset-2',
  'data-[state=active]:font-semibold data-[state=active]:text-ink',
  "after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-10 after:-translate-x-1/2 after:bg-accent after:content-['']",
  'after:hidden data-[state=active]:after:block',
].join(' ');

/** Viewer tabs (Imagen / Salida del modelo / Mis observaciones). Active tab = weight + ink + underline. */
export function Tabs({ items, value, onValueChange, label }: TabsProps) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange} className="flex flex-col">
      <TabsPrimitive.List aria-label={label} className="flex w-full">
        {items.map((item) => (
          <TabsPrimitive.Trigger key={item.value} value={item.value} className={TRIGGER_CLASSES}>
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content key={item.value} value={item.value} className="pt-3 outline-offset-2">
          {item.panel}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
