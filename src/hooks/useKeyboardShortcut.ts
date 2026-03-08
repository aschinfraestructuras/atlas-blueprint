import { useEffect } from "react";

/**
 * Register a global keyboard shortcut.
 * Automatically ignores events when user is typing in inputs/textareas.
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options?: { ctrl?: boolean; meta?: boolean; enabled?: boolean },
) {
  useEffect(() => {
    if (options?.enabled === false) return;

    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      // Check modifiers
      if (options?.ctrl && !e.ctrlKey && !e.metaKey) return;
      if (options?.meta && !e.metaKey) return;

      if (e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        callback();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, callback, options?.ctrl, options?.meta, options?.enabled]);
}
