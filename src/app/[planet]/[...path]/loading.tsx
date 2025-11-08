export default function Loading() {
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-8">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-gray-200 mb-4" />
        <div className="h-6 w-96 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-4 rounded-lg border p-4">
            <div className="aspect-video w-full animate-pulse rounded-lg bg-gray-200" />
            <div className="h-6 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
