export default async function PlanetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-grow font-mono">
      {children}
    </div>
  );
}
