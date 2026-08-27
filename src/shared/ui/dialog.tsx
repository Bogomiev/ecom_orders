"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  type MouseEvent,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";

type DialogProps = {
  ariaLabel?: string;
  ariaLabelledBy?: string;
  children: ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
  onClose: () => void;
};

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

const openDialogs: symbol[] = [];

export function Dialog({
  ariaLabel,
  ariaLabelledBy,
  children,
  className = "",
  closeOnBackdrop = true,
  onClose
}: DialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const dialogIdRef = useRef(Symbol("dialog"));
  const handleClose = useEffectEvent(onClose);

  useEffect(() => {
    const dialogId = dialogIdRef.current;
    openDialogs.push(dialogId);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const autofocusElement = contentRef.current?.querySelector<HTMLElement>(
      "[autofocus]"
    );
    const firstFocusableElement = contentRef.current?.querySelector<HTMLElement>(
      FOCUSABLE_SELECTOR
    );
    (autofocusElement ?? firstFocusableElement)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (openDialogs.at(-1) !== dialogId) return;

      if (event.key === "Escape") {
        event.stopPropagation();
        handleClose();
        return;
      }

      if (event.key !== "Tab" || contentRef.current === null) return;
      const focusable = Array.from(
        contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      const dialogIndex = openDialogs.lastIndexOf(dialogId);
      if (dialogIndex !== -1) openDialogs.splice(dialogIndex, 1);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      previouslyFocused?.focus();
    };
  }, []);

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (closeOnBackdrop && event.target === event.currentTarget) onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[1px]"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={contentRef}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-modal="true"
        className={className}
        role="dialog"
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
