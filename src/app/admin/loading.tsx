export default function AdminLoading() {
  return (
    <div className="space-y-4 p-6" aria-busy="true" aria-live="polite">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-lg border border-[#e3ebf2] bg-[#eef2f6]"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-lg border border-[#e3ebf2] bg-[#eef2f6]" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-48 animate-pulse rounded-lg border border-[#e3ebf2] bg-[#eef2f6]" />
        <div className="h-48 animate-pulse rounded-lg border border-[#e3ebf2] bg-[#eef2f6]" />
      </div>
    </div>
  );
}
