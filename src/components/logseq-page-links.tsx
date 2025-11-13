/**
 * Logseq-style Page Links Component
 *
 * Displays pages as a simple list of links (like Logseq)
 * instead of fancy water cards.
 *
 * Used for pages inside "pages/" and "journals/" folders.
 */

import { Link } from "@/components/ui/link";
import type { Node } from "@/db/schema";

interface LogseqPageLinksProps {
  pages: Node[];
  planetSlug: string;
  currentPath: string[];
}

export function LogseqPageLinks({
  pages,
  planetSlug,
  currentPath,
}: LogseqPageLinksProps) {
  if (pages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          No pages yet. Upload a Logseq graph to get started!
        </p>
      </div>
    );
  }

  // Group pages by type
  const folders = pages.filter((p) => p.type === "folder");
  const files = pages.filter((p) => p.type === "file");

  return (
    <div className="space-y-6">
      {/* Folders first */}
      {folders.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Folders
          </h2>
          <div className="space-y-1">
            {folders.map((folder) => (
              <Link
                key={folder.id}
                href={`/${planetSlug}/${[...currentPath, folder.slug].join("/")}`}
                className="group flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
              >
                <span className="text-2xl">📁</span>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {folder.page_name || folder.title}
                  </h3>
                  {folder.metadata?.summary && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                      {folder.metadata.summary as string}
                    </p>
                  )}
                </div>
                <span className="text-gray-400 group-hover:text-blue-500">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pages/Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Pages
          </h2>
          <div className="space-y-1">
            {files.map((file) => {
              const isJournal = file.is_journal;
              const icon = isJournal ? "📅" : "📄";

              return (
                <Link
                  key={file.id}
                  href={`/${planetSlug}/${[...currentPath, file.slug].join("/")}`}
                  className="group flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="text-xl">{icon}</span>
                  <div className="flex-1">
                    <h3 className="text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {file.page_name || file.title}
                    </h3>
                    {isJournal && file.journal_date && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(file.journal_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span className="text-gray-300 dark:text-gray-600 group-hover:text-blue-400 dark:group-hover:text-blue-500">
                    →
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
