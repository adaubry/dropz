"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { parseLogseqFileName, parsePageProperties } from "@/lib/logseq/parser";

interface LogseqGraphUploadProps {
  workspaceSlug: string;
  isActive: boolean;
}

interface FileWithPath {
  file: File;
  relativePath: string; // Full path including pages/ or journals/
}

// Recursively read all files from a directory entry
async function readDirectory(
  entry: any,
  basePath: string = "",
): Promise<FileWithPath[]> {
  const files: FileWithPath[] = [];

  if (entry.isFile) {
    const file: File = await new Promise((resolve, reject) => {
      entry.file(resolve, reject);
    });

    // Only process markdown files
    if (/\.md$/i.test(file.name)) {
      files.push({
        file,
        relativePath: basePath,
      });
    }
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    const entries: any[] = await new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });

    for (const subEntry of entries) {
      const subPath = basePath ? `${basePath}/${subEntry.name}` : subEntry.name;
      const subFiles = await readDirectory(subEntry, subPath);
      files.push(...subFiles);
    }
  }

  return files;
}

// Get all files from dropped folder
async function getAllFiles(
  dataTransferItems: DataTransferItemList,
): Promise<FileWithPath[]> {
  const allFiles: FileWithPath[] = [];

  for (let i = 0; i < dataTransferItems.length; i++) {
    const item = dataTransferItems[i];
    if (item.kind === "file") {
      const entry = item.webkitGetAsEntry?.() || item.getAsEntry?.();
      if (entry && entry.isDirectory) {
        // When a Logseq graph folder is dropped, start reading from the root
        const files = await readDirectory(entry, entry.name);
        allFiles.push(...files);
      }
    }
  }

  return allFiles;
}

/**
 * Detect if the dropped files are a Logseq graph
 * A Logseq graph must have a pages/ or journals/ folder
 */
function isLogseqGraph(files: FileWithPath[]): boolean {
  return files.some(({ relativePath }) => {
    const normalized = relativePath.replace(/\\/g, "/");
    return normalized.startsWith("pages/") || normalized.startsWith("journals/");
  });
}

export function LogseqGraphUpload({
  workspaceSlug,
  isActive,
}: LogseqGraphUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const router = useRouter();
  const dragCounter = useRef(0);

  useEffect(() => {
    if (!isActive) return;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current++;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [isActive]);

  const handleFileDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounter.current = 0;
      setIsDragging(false);

      if (!isActive) {
        alert("Please enable editing mode first!");
        return;
      }

      setUploading(true);
      setUploadProgress("Reading files...");

      try {
        // Get all files from dropped folder
        const filesWithPaths = await getAllFiles(e.dataTransfer.items);

        if (filesWithPaths.length === 0) {
          alert("No markdown files found. Please drop a Logseq graph folder.");
          setUploading(false);
          return;
        }

        // Check if this is a Logseq graph
        if (!isLogseqGraph(filesWithPaths)) {
          alert(
            "This doesn't appear to be a Logseq graph. Make sure your folder contains 'pages/' and/or 'journals/' directories.",
          );
          setUploading(false);
          return;
        }

        console.log(`[Logseq Import] Found ${filesWithPaths.length} markdown files`);

        // Filter for pages/ and journals/ files only
        const logseqFiles = filesWithPaths.filter(({ relativePath }) => {
          const normalized = relativePath.replace(/\\/g, "/");
          // Extract the folder structure after the root folder name
          // E.g., "my-graph/pages/intro.md" → "pages/intro.md"
          const parts = normalized.split("/");
          if (parts.length < 2) return false;
          // Find the pages/ or journals/ folder
          const relevantPath = parts.slice(1).join("/");
          return (
            relevantPath.startsWith("pages/") || relevantPath.startsWith("journals/")
          );
        });

        console.log(`[Logseq Import] Processing ${logseqFiles.length} Logseq files`);

        setUploadProgress(`Processing ${logseqFiles.length} pages...`);

        let pagesCreated = 0;
        let pagesFailed = 0;
        const errors: string[] = [];

        // Process each file
        for (let i = 0; i < logseqFiles.length; i++) {
          const { file, relativePath } = logseqFiles[i];

          setUploadProgress(
            `Processing ${i + 1}/${logseqFiles.length}: ${file.name}`,
          );

          try {
            // Extract relevant path (after root folder name)
            const parts = relativePath.replace(/\\/g, "/").split("/");
            const relevantPath = parts.slice(1).join("/");

            // Parse the Logseq file name
            const parsed = parseLogseqFileName(relevantPath);

            if (!parsed) {
              console.warn(`[Logseq Import] Skipping invalid file: ${file.name}`);
              pagesFailed++;
              errors.push(`Invalid Logseq file format: ${file.name}`);
              continue;
            }

            console.log(`[Logseq Import] Parsing: ${file.name}`, {
              pageName: parsed.pageName,
              namespace: parsed.namespace,
              depth: parsed.depth,
              isJournal: parsed.isJournal,
            });

            // Read file content
            const content = await file.text();

            // Parse properties from content
            const properties = parsePageProperties(content);

            // Extract title from properties or use page name
            const title = properties.title || parsed.slug.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());

            // Create the page via API
            const response = await fetch("/api/nodes", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                slug: parsed.slug,
                title,
                page_name: parsed.pageName,
                namespace: parsed.namespace,
                type: "file", // CRITICAL: Must be "file" to trigger markdown rendering
                is_journal: parsed.isJournal,
                journal_date: parsed.journalDate?.toISOString(),
                source_folder: parsed.sourceFolder,
                content,
                metadata: properties,
              }),
            });

            if (!response.ok) {
              const data = await response.json();
              console.error(`[Logseq Import] Failed to import ${file.name}:`, data.error);
              pagesFailed++;
              errors.push(`${file.name}: ${data.error}`);
            } else {
              console.log(`[Logseq Import] Successfully imported: ${parsed.pageName}`);
              pagesCreated++;
            }
          } catch (err: any) {
            console.error(`[Logseq Import] Exception processing ${file.name}:`, err);
            pagesFailed++;
            errors.push(`${file.name}: ${err.message}`);
          }
        }

        // Create folder nodes for Logseq structure
        console.log('[Logseq Import] Creating folder nodes...');

        // Create "pages" folder node if it doesn't exist
        try {
          await fetch("/api/nodes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slug: "pages",
              title: "Pages",
              namespace: "",
              type: "folder",
              content: "# Pages\n\nAll your Logseq pages are stored here.",
              metadata: {
                isLogseqFolder: true,
                summary: "Logseq pages folder"
              },
            }),
          });
          console.log('[Logseq Import] Created "pages" folder');
        } catch (err) {
          console.log('[Logseq Import] Pages folder might already exist');
        }

        // Create "journals" folder node if it doesn't exist
        try {
          await fetch("/api/nodes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slug: "journals",
              title: "Journals",
              namespace: "",
              type: "folder",
              content: "# Journals\n\nYour Logseq daily journals are stored here.",
              metadata: {
                isLogseqFolder: true,
                summary: "Logseq journals folder"
              },
            }),
          });
          console.log('[Logseq Import] Created "journals" folder');
        } catch (err) {
          console.log('[Logseq Import] Journals folder might already exist');
        }

        // Show result
        const message =
          pagesFailed > 0
            ? `Imported ${pagesCreated} page(s) successfully. ${pagesFailed} page(s) failed.\n\nErrors:\n${errors.slice(0, 5).join("\n")}${errors.length > 5 ? `\n... and ${errors.length - 5} more` : ""}`
            : `Successfully imported ${pagesCreated} Logseq page(s)!`;

        alert(message);
        router.refresh();
      } catch (err: any) {
        console.error("[Logseq Import] Upload error:", err);
        alert(`Import failed: ${err.message}`);
      } finally {
        setUploading(false);
        setUploadProgress("");
      }
    },
    [isActive, workspaceSlug, router],
  );

  if (!isActive) {
    return null;
  }

  return (
    <>
      {isDragging && (
        <div
          onDrop={handleFileDrop}
          className="fixed inset-0 z-50 ml-32 flex max-h-[100vh] items-center justify-center border-2 border-dashed border-purple-500 bg-purple-500 bg-opacity-10"
        >
          <div className="max-w-md rounded-lg bg-white p-8 shadow-2xl dark:bg-gray-800">
            <div className="text-center">
              <svg
                className="mx-auto mb-4 h-16 w-16 text-purple-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                Drop Logseq Graph Here
              </h3>
              <p className="mb-1 text-sm text-gray-600 dark:text-gray-300">
                Drop your entire Logseq graph folder
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Must contain <span className="font-mono text-purple-600">pages/</span> or{" "}
                <span className="font-mono text-purple-600">journals/</span> folder
              </p>
            </div>
          </div>
        </div>
      )}

      {uploading && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-w-md rounded-lg bg-white p-8 shadow-xl dark:bg-gray-800">
            <div className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
              <p className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">
                {uploadProgress || "Importing Logseq graph..."}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Please wait while we import your pages
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
