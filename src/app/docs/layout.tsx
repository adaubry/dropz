import { UniversalSidebar } from "@/components/universal-sidebar";
import { buildHomeSidebar } from "@/lib/sidebar-builder";

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use home sidebar for docs page
  const sidebarData = await buildHomeSidebar();

  return (
    <div className="flex flex-grow font-mono">
      <UniversalSidebar
        parentLink={{ title: "Home", href: "/" }}
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
