export default function Loading() {
  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <div className="h-12 w-96 animate-pulse rounded bg-gray-200 dark:bg-gray-700 mb-4" />
        <div className="h-6 w-full max-w-2xl animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-4 rounded-lg border p-6">
            <div className="h-8 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
