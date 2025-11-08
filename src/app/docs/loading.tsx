export default function Loading() {
  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8 h-12 w-96 animate-pulse  lg bg-gray-200" />
      <div className="space-y-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-4 animate-pulse rounded bg-gray-200"
            style={{ width: `${Math.random() * 30 + 70}%` }}
          />
        ))}
      </div>
    </div>
  );
}
