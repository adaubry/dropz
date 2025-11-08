import Image from "next/image";
import { Link } from "@/components/ui/link";
import { notFound } from "next/navigation";
import { getOcean, getOceanDropCount } from "@/lib/queries";
import { UniversalSidebar } from "@/components/universal-sidebar";
import { buildOceanSidebar } from "@/lib/sidebar-builder";
import { db } from "@/db";
import { oceans } from "@/db/schema";

export const revalidate = 0;

// export async function generateStaticParams() {
//   return await db.select({ ocean: oceans.slug }).from(oceans);
// }

export default async function Page(props: {
  params: Promise<{
    ocean: string;
  }>;
}) {
  const { ocean } = await props.params;
  const urlDecoded = decodeURIComponent(ocean);
  const oceanData = await getOcean(urlDecoded);
  if (!oceanData) {
    return notFound();
  }

  const countRes = await getOceanDropCount(urlDecoded);
  const sidebarData = await buildOceanSidebar("", urlDecoded);

  const finalCount = countRes[0]?.count;

  let imageCount = 0;

  return (
    <>
      <UniversalSidebar
        parentLink={sidebarData.parentLink}
        currentItems={sidebarData.currentItems}
      />
      <main
        className="min-h-[calc(100vh-113px)] flex-1 overflow-y-auto p-4 pt-0 md:pl-64"
        id="main-content"
      >
        <div className="container p-4">
      {finalCount && (
        <h1 className="mb-2 border-b-2 text-sm font-bold">
          {finalCount} {finalCount === 1 ? "Drop" : "Drops"}
        </h1>
      )}
      <div className="space-y-4">
        {oceanData.seas.map((sea, index) => (
          <div key={index}>
            <h2 className="mb-2 border-b-2 text-lg font-semibold">
              {sea.name}
            </h2>
            <div className="flex flex-row flex-wrap gap-2">
              {sea.rivers.map(
                (river, riverIndex) => (
                  <Link
                    prefetch={true}
                    key={riverIndex}
                    className="group flex h-full w-full flex-row gap-2 border px-4 py-2 hover:bg-gray-100 sm:w-[200px]"
                    href={`/drops/${ocean}/${river.slug}`}
                  >
                    <div className="py-2">
                      <Image
                        loading={imageCount++ < 15 ? "eager" : "lazy"}
                        decoding="sync"
                        src={river.image_url ?? "/placeholder.svg"}
                        alt={`A small picture of ${river.name}`}
                        width={48}
                        height={48}
                        quality={65}
                        className="h-12 w-12 flex-shrink-0 object-cover"
                      />
                    </div>
                    <div className="flex h-16 flex-grow flex-col items-start py-2">
                      <div className="text-sm font-medium text-gray-700 group-hover:underline">
                        {river.name}
                      </div>
                    </div>
                  </Link>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
      </div>
      </main>
    </>
  );
}
