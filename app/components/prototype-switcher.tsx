// PROTOTYPE — throwaway floating variant switcher (?variant=). Hidden in prod.
import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";

const STORAGE_KEY = "prototype-variant";

/** Reads ?variant=, falling back to the last one picked this tab so it survives navigation. */
export function useVariant<K extends string>(keys: readonly K[]): K {
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get("variant") as K | null;
  useEffect(() => {
    if (fromUrl && keys.includes(fromUrl)) {
      sessionStorage.setItem(STORAGE_KEY, fromUrl);
      return;
    }
    const stored = sessionStorage.getItem(STORAGE_KEY) as K | null;
    if (stored && keys.includes(stored)) {
      const next = new URLSearchParams(params);
      next.set("variant", stored);
      setParams(next, { replace: true, preventScrollReset: true });
    }
  }, [fromUrl]);
  return fromUrl && keys.includes(fromUrl) ? fromUrl : keys[0];
}

export function PrototypeSwitcher<K extends string>({
  variants,
  current,
  onSimulate,
}: {
  variants: Record<K, string>;
  current: K;
  onSimulate?: () => void;
}) {
  const [params, setParams] = useSearchParams();
  const keys = Object.keys(variants) as K[];

  function go(delta: number) {
    const i = keys.indexOf(current);
    const nextKey = keys[(i + delta + keys.length) % keys.length];
    const next = new URLSearchParams(params);
    next.set("variant", nextKey);
    sessionStorage.setItem(STORAGE_KEY, nextKey);
    setParams(next, { replace: true, preventScrollReset: true });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-900 px-2 py-1.5 text-sm text-white shadow-2xl ring-2 ring-fuchsia-500">
      <button
        onClick={() => go(-1)}
        className="rounded-full p-1 hover:bg-white/15"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-64 text-center font-medium">
        {current} ({variants[current]})
      </span>
      <button onClick={() => go(1)} className="rounded-full p-1 hover:bg-white/15">
        <ChevronRight className="size-4" />
      </button>
      {onSimulate && (
        <button
          onClick={onSimulate}
          className="ml-1 flex items-center gap-1 rounded-full bg-fuchsia-600 px-3 py-1 text-xs font-semibold hover:bg-fuchsia-500"
        >
          <Zap className="size-3" /> Simulate incoming
        </button>
      )}
    </div>
  );
}
