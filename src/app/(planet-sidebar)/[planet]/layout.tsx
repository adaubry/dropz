import { UniversalSidebar } from "@/components/universal-sidebar";
import { buildPlanetSidebar } from "@/lib/sidebar-builder";

export default async function PlanetLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ planet: string }>;
}) {
  const { planet } = await params;
  const sidebarData = await buildPlanetSidebar(planet);

  return (
    <>
      <UniversalSidebar
        parentLink={sidebarData.parentLink}
        currentItems={sidebarData.currentItems}
      />
      {children}
    </>
  );
}
