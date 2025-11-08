export default function Loading() {
  return (
    <div className="p-6">
      <div className="mb-8 h-10 w-64 animate-pulse rounded-lg bg-gray-200" />
      <div className="space-y-8">
        <div className="h-96 w-full animate-pulse rounded-lg bg-gray-200" />
        <div className="space-y-4">
          <div className="h-6 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="h-6 w-2/3 animate-pulse rounded bg-gray-200" />
          <div className="h-6 w-1/2 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
