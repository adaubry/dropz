export default function Loading() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <div className="h-10 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700 mb-4" />
        <div className="h-6 w-full max-w-xl animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
            style={{ width: `${Math.random() * 30 + 70}%` }}
          />
        ))}
      </div>
    </div>
  );
}
