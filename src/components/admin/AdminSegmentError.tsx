"use client";

import { useEffect } from "react";

type AdminSegmentErrorProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
  title: string;
  description: string;
};

export function AdminSegmentError({
  error,
  unstable_retry,
  title,
  description,
}: AdminSegmentErrorProps) {
  useEffect(() => {
    console.error("ColdPower admin segment error", error.digest ?? "without-digest");
  }, [error]);

  return (
    <div
      role="alert"
      className="flex min-h-64 items-center justify-center rounded-xl border border-[#f3caca] bg-[#fff8f8] p-6 text-center"
    >
      <div className="max-w-md">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#ed4b4b]">
          {title}
        </p>
        <p className="mt-2 text-sm font-semibold text-[#304b66]">{description}</p>
        <button
          type="button"
          onClick={unstable_retry}
          className="mt-4 rounded-lg bg-[#2277ee] px-4 py-2 text-[11px] font-extrabold text-white transition hover:bg-[#1764d2]"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
