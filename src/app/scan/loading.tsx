export default function Loading() {
  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8 h-10 w-64 animate-pulse rounded-lg bg-gray-200" />
      <div className="space-y-6">
        <div className="h-12 w-full animate-pulse rounded-lg bg-gray-200" />
        <div className="h-64 w-full animate-pulse rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}
