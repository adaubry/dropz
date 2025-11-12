export default function Loading() {
  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <div className="mb-8">
        <div className="h-10 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700 mb-4" />
        <div className="flex items-center gap-4 mb-6">
          <div className="h-20 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </div>
      <div className="space-y-6">
        <div className="h-32 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-12 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}
