export default function Loading() {
  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <div className="h-10 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700 mb-8" />
      <div className="space-y-6">
        <div>
          <div className="h-5 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700 mb-2" />
          <div className="h-10 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div>
          <div className="h-5 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700 mb-2" />
          <div className="h-10 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div>
          <div className="h-5 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700 mb-2" />
          <div className="h-32 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="flex gap-4">
          <div className="h-10 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-10 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    </div>
  );
}
