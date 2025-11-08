import { UniversalSidebar } from "@/components/universal-sidebar";
import { buildRiverSidebar } from "@/lib/sidebar-builder";

export default async function RiverLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ ocean: string; river: string }>;
}) {
  const { ocean, river } = await params;
  const sidebarData = await buildRiverSidebar("", ocean, river);

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
