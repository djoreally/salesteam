"use client";

import { useState } from "react";

export function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-slate-950 px-4 py-3">
      <code className="min-w-0 flex-1 overflow-x-auto font-mono text-sm leading-6 break-words whitespace-pre-wrap text-slate-100">{text}</code>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </div>
  );
}
