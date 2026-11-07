"use client";
import { useEffect, useRef, useState } from "react";

/** Session history for committed workspace and exploration changes. */
export function useUndoRedo<T>(value: T, restore: (value: T) => void, enabled: boolean) {
  const entries = useRef<string[]>([]);
  const cursor = useRef(-1);
  const restoring = useRef<string | null>(null);
  const restoreRef = useRef(restore);
  restoreRef.current = restore;
  const [position, setPosition] = useState({ index: -1, length: 0 });
  const serialized = JSON.stringify(value);
  useEffect(() => {
    if (!enabled) return;
    if (restoring.current === serialized) {
      restoring.current = null;
      return;
    }
    if (entries.current[cursor.current] === serialized) return;
    entries.current = entries.current.slice(0, cursor.current + 1);
    entries.current.push(serialized);
    if (entries.current.length > 100) entries.current.shift();
    cursor.current = entries.current.length - 1;
    setPosition({ index: cursor.current, length: entries.current.length });
  }, [serialized, enabled]);
  function move(delta: number) {
    const next = cursor.current + delta;
    if (next < 0 || next >= entries.current.length) return;
    cursor.current = next;
    restoring.current = entries.current[next];
    restoreRef.current(JSON.parse(entries.current[next]));
    setPosition({ index: next, length: entries.current.length });
  }
  const moveRef = useRef(move);
  moveRef.current = move;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "z" || (key === "y" && event.ctrlKey)) {
        event.preventDefault();
        moveRef.current(key === "y" || event.shiftKey ? 1 : -1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { undo: () => move(-1), redo: () => move(1), canUndo: position.index > 0, canRedo: position.index < position.length - 1 };
}
