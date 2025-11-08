import { UniversalSidebar } from "@/components/universal-sidebar";
import { buildDropSidebar } from "@/lib/sidebar-builder";

export default async function DropLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ ocean: string; river: string; drop: string }>;
}) {
  const { ocean, river, drop } = await params;
  const sidebarData = await buildDropSidebar("", ocean, river, drop);

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
