import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, m, useDragControls, useReducedMotion, type PanInfo } from 'motion/react';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { CloseIcon } from './icons';
import { IconButton } from './IconButton';
import {
  overlayTransition,
  reducedTransition,
  sheetEnterTransition,
  sheetExitTransition,
} from './motion';

const DISMISS_OFFSET_PX = 96;
const DISMISS_VELOCITY_PX_S = 500;
const OFFSCREEN_Y = '100%';

export type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Accessible name of the icon-only close button. */
  closeLabel: string;
  children: ReactNode;
};

function shouldDismiss(info: PanInfo): boolean {
  return info.offset.y > DISMISS_OFFSET_PX || info.velocity.y > DISMISS_VELOCITY_PX_S;
}

/**
 * Bottom sheet on Radix Dialog. Escape and scrim tap close it; Radix returns focus
 * to the opener. The handle drags the sheet down to dismiss; the body still scrolls.
 */
export function Sheet({ open, onOpenChange, title, description, closeLabel, children }: SheetProps) {
  const reduce = useReducedMotion();
  const dragControls = useDragControls();
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const close = () => onOpenChange(false);

  // Radix restores focus only to a Dialog.Trigger; this sheet is opened by an external control,
  // so remember the focused element before the dialog moves focus into itself.
  useLayoutEffect(() => {
    if (open && document.activeElement instanceof HTMLElement) {
      returnFocusRef.current = document.activeElement;
    }
  }, [open]);

  const enter = reduce ? reducedTransition : sheetEnterTransition;
  const exit = reduce ? reducedTransition : sheetExitTransition;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal forceMount>
        <AnimatePresence>
          {open ? (
            <>
              <DialogPrimitive.Overlay asChild forceMount>
                <m.div
                  className="fixed inset-0 z-40 bg-scrim"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: overlayTransition }}
                  exit={{ opacity: 0, transition: reducedTransition }}
                />
              </DialogPrimitive.Overlay>
              <DialogPrimitive.Content
                asChild
                forceMount
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  returnFocusRef.current?.focus();
                }}
              >
                <m.div
                  className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-sheet bg-surface pb-[env(safe-area-inset-bottom)] text-ink outline-none lg:inset-x-auto lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:w-[min(32rem,calc(100vw-4rem))] lg:max-h-[80dvh] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-sheet lg:shadow-[0_24px_64px_rgb(31_43_42/0.22)]"
                  initial={reduce ? { opacity: 0 } : { y: OFFSCREEN_Y }}
                  animate={reduce ? { opacity: 1, transition: enter } : { y: 0, transition: enter }}
                  exit={reduce ? { opacity: 0, transition: exit } : { y: OFFSCREEN_Y, transition: exit }}
                  drag={reduce ? false : 'y'}
                  dragListener={false}
                  dragControls={dragControls}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.3 }}
                  onDragEnd={(_, info) => {
                    if (shouldDismiss(info)) close();
                  }}
                >
                  <div
                    data-drag-handle
                    onPointerDown={(event) => dragControls.start(event)}
                    className="flex h-11 w-full shrink-0 touch-none cursor-grab items-center justify-center"
                  >
                    <span aria-hidden="true" className="h-1 w-9 rounded-full bg-line" />
                  </div>
                  <div className="flex shrink-0 items-start gap-2 px-5 pb-2">
                    <DialogPrimitive.Title className="m-0 min-w-0 flex-1 pt-2 text-section text-ink">
                      {title}
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Close asChild>
                      <IconButton label={closeLabel} icon={<CloseIcon className="size-6" />} tone="subtle" />
                    </DialogPrimitive.Close>
                  </div>
                  <DialogPrimitive.Description
                    className={description ? 'm-0 px-5 pb-3 text-label text-muted' : 'sr-only'}
                  >
                    {description ?? title}
                  </DialogPrimitive.Description>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
                </m.div>
              </DialogPrimitive.Content>
            </>
          ) : null}
        </AnimatePresence>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
