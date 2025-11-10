/**
 * Folder Index Content Component
 *
 * Displays the content of a folder's index page (page.md) if it exists.
 * This allows folders to have introductory/overview content displayed
 * before showing the list of child items.
 *
 * Usage: <FolderIndexContent planetId={id} namespace="guides" />
 */

import { getFolderIndexPage } from "@/lib/queries";
import Image from "next/image";

interface FolderIndexContentProps {
  planetId: number;
  namespace: string;
}

export async function FolderIndexContent({
  planetId,
  namespace,
}: FolderIndexContentProps) {
  // Try to find a page.md file in this folder
  const indexPage = await getFolderIndexPage(planetId, namespace);

  // If no index page exists, don't render anything
  if (!indexPage || !indexPage.content) {
    return null;
  }

  return (
    <div className="mb-8 prose prose-lg dark:prose-invert max-w-none">
      {/* Cover image if available */}
      {indexPage.metadata?.cover && (
        <Image
          src={indexPage.metadata.cover as string}
          alt={indexPage.title}
          width={800}
          height={400}
          quality={80}
          className="w-full h-64 object-cover rounded-lg mb-6"
          loading="eager"
          decoding="sync"
        />
      )}

      {/* Rendered content */}
      {indexPage.parsed_html ? (
        <div dangerouslySetInnerHTML={{ __html: indexPage.parsed_html }} />
      ) : (
        <div className="whitespace-pre-wrap">{indexPage.content}</div>
      )}

      {/* Optional divider to separate from child items */}
      <hr className="my-8 border-gray-300 dark:border-gray-700" />
    </div>
  );
}
