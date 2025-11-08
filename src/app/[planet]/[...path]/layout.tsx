import { UniversalSidebar } from "@/components/universal-sidebar";
import { buildNodesSidebar } from "@/lib/sidebar-builder-nodes";

export default async function CatchAllLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ planet: string; path?: string[] }>;
}) {
  const { planet, path = [] } = await params;
  const sidebarData = await buildNodesSidebar(planet, path);

  return (
    <div className="flex flex-grow font-mono">
      <UniversalSidebar
        parentLink={sidebarData.parentLink}
        currentItems={sidebarData.currentItems}
      />
      <main
        className="min-h-[calc(100vh-113px)] flex-1 overflow-y-auto p-4 pt-0 md:pl-64"
        id="main-content"
      >
        {children}
      </main>
    </div>
  );
}
