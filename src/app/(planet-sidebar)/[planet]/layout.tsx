export default async function PlanetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Don't render sidebar here - parent layout handles it
  return <>{children}</>;
}

