import { ProductLink } from "@/components/ui/product-card";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Metadata } from "next";

import { getDropDetails, getDropsForRiver } from "@/lib/queries";

export const revalidate = 0;

export async function generateMetadata(props: {
  params: Promise<{ drop: string; ocean: string; river: string }>;
}): Promise<Metadata> {
  const { drop: dropParam } = await props.params;
  const urlDecodedDrop = decodeURIComponent(dropParam);

  const drop = await getDropDetails(urlDecodedDrop);

  if (!drop) {
    return notFound();
  }

  return {
    openGraph: { title: drop.name, description: drop.description },
  };
}

export default async function Page(props: {
  params: Promise<{
    drop: string;
    river: string;
    ocean: string;
  }>;
}) {
  const { drop, river, ocean } = await props.params;
  const urlDecodedDrop = decodeURIComponent(drop);
  const urlDecodedRiver = decodeURIComponent(river);
  const [dropData, relatedUnshifted] = await Promise.all([
    getDropDetails(urlDecodedDrop),
    getDropsForRiver(urlDecodedRiver),
  ]);

  if (!dropData) {
    return notFound();
  }
  const currentDropIndex = relatedUnshifted.findIndex(
    (p) => p.slug === dropData.slug,
  );
  const related = [
    ...relatedUnshifted.slice(currentDropIndex + 1),
    ...relatedUnshifted.slice(0, currentDropIndex),
  ];

  return (
    <div className="container p-4 max-w-4xl mx-auto">
      {/* Breadcrumb navigation */}
      <nav className="text-sm mb-4 text-gray-600">
        <span>🌍 Planet</span>
        {" / "}
        <a href={`/drops/${ocean}`} className="hover:underline">
          {ocean}
        </a>
        {" / "}
        <span>{river}</span>
        {" / "}
        <span className="font-semibold">{drop}</span>
      </nav>

      {/* Main content */}
      <article>
        <h1 className="text-3xl font-bold mb-4">{dropData.name}</h1>

        {dropData.image_url && (
          <Image
            loading="eager"
            decoding="sync"
            src={dropData.image_url}
            alt={`Cover image for ${dropData.name}`}
            width={800}
            height={400}
            quality={80}
            className="w-full h-64 object-cover rounded-lg mb-6"
          />
        )}

        {/* Test div for content rendering - markdown renderer goes here */}
        <div className="prose prose-lg max-w-none mb-8">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <p className="text-sm font-mono text-gray-700">
              📄 Content Placeholder (Markdown Renderer Will Go Here)
            </p>
          </div>
          <p className="text-gray-700">{dropData.description}</p>
        </div>
      </article>

      {/* Related content */}
      {related.length > 0 && (
        <aside className="mt-12">
          <h2 className="text-xl font-bold mb-4">💧 Related Drops</h2>
          <div className="grid grid-cols-2 gap-4">
            {related.map((relatedDrop) => (
              <ProductLink
                key={relatedDrop.name}
                loading="lazy"
                ocean_slug={ocean}
                river_slug={river}
                drop={relatedDrop}
                imageUrl={relatedDrop.image_url}
              />
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
