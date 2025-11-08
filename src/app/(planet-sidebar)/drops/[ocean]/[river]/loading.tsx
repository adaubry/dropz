export default function Loading() {
  return (
    <div className="p-6">
      <div className="mb-8 h-10 w-64 animate-pulse rounded-lg bg-gray-200" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-4 rounded-lg border p-4">
            <div className="h-64 w-full animate-pulse rounded-lg bg-gray-200" />
            <div className="h-6 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
