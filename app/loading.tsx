export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-24">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-2xl bg-blush animate-pulse" />
        ))}
      </div>
    </div>
  );
}
