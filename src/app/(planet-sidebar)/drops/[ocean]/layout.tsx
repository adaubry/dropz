import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOcean } from "@/lib/queries";
import { UniversalSidebar } from "@/components/universal-sidebar";
import { buildOceanSidebar } from "@/lib/sidebar-builder";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ocean: string }>;
}): Promise<Metadata> {
  const { ocean: oceanParam } = await params;
  const urlDecoded = decodeURIComponent(oceanParam);
  const ocean = await getOcean(urlDecoded);

  if (!ocean) {
    return notFound();
  }

  const examples = ocean.seas
    .slice(0, 2)
    .map((s) => s.name)
    .join(", ")
    .toLowerCase();

  return {
    title: `${ocean.name}`,
    openGraph: {
      title: `${ocean.name}`,
      description: `Choose from our selection of ${ocean.name.toLowerCase()}, including ${examples + (ocean.seas.length > 1 ? "," : "")} and more. In stock and ready to ship.`,
    },
  };
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ ocean: string }>;
}) {
  const { ocean } = await params;
  const sidebarData = await buildOceanSidebar("", ocean);

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
