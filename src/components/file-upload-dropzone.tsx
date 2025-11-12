"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface FileUploadDropzoneProps {
  workspaceSlug: string;
  currentPath: string[];
  isActive: boolean;
}

interface FileWithPath {
  file: File;
  relativePath: string;
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
    if (/\.mdx?$/i.test(file.name)) {
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
      // Build path including this directory's name
      const subPath = basePath ? `${basePath}/${subEntry.name}` : subEntry.name;
      const subFiles = await readDirectory(subEntry, subPath);
      files.push(...subFiles);
    }
  }

  return files;
}

// Get all files from dropped items (handles both files and directories)
async function getAllFiles(
  dataTransferItems: DataTransferItemList,
): Promise<FileWithPath[]> {
  const allFiles: FileWithPath[] = [];

  for (let i = 0; i < dataTransferItems.length; i++) {
    const item = dataTransferItems[i];
    if (item.kind === "file") {
      const entry = item.webkitGetAsEntry?.() || item.getAsEntry?.();
      if (entry) {
        // For dropped folders, skip the top-level folder name itself
        // Example: dropping "docs" folder with "guides/setup.md" inside
        // should create nodes at currentPath/guides/setup.md, not currentPath/docs/guides/setup.md
        if (entry.isDirectory) {
          const reader = entry.createReader();
          const entries: any[] = await new Promise((resolve, reject) => {
            reader.readEntries(resolve, reject);
          });
          for (const subEntry of entries) {
            const files = await readDirectory(subEntry, subEntry.name);
            allFiles.push(...files);
          }
        } else {
          // Single file dropped - no folder structure
          const files = await readDirectory(entry, "");
          allFiles.push(...files);
        }
      }
    }
  }

  return allFiles;
}

export function FileUploadDropzone({
  workspaceSlug,
  currentPath,
  isActive,
}: FileUploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const router = useRouter();
  const dragCounter = useRef(0);

  // Use window-level drag events to properly detect drag over page
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
        // Get all files including from folders
        const filesWithPaths = await getAllFiles(e.dataTransfer.items);

        if (filesWithPaths.length === 0) {
          alert(
            "No markdown files found. Please drop .md or .mdx files or folders containing them.",
          );
          setUploading(false);
          return;
        }

        // Extract all unique folder paths that need to be created
        // relativePath includes the filename (e.g., "guides/setup.md")
        // We need to extract just the directory structure (e.g., "guides")
        const folderPaths = new Set<string>();
        filesWithPaths.forEach(({ relativePath }) => {
          if (relativePath) {
            // Remove the filename to get just the directory path
            const parts = relativePath.split("/").filter(Boolean);
            // Only process if there are directory parts (parts.length > 1 means there's a folder)
            if (parts.length > 1) {
              // Don't include the last part (filename)
              for (let i = 0; i < parts.length - 1; i++) {
                const folderPath = parts.slice(0, i + 1).join("/");
                folderPaths.add(folderPath);
              }
            }
          }
        });

        // Sort folder paths by depth (shallowest first) to create parents before children
        const sortedFolderPaths = Array.from(folderPaths).sort(
          (a, b) => a.split("/").length - b.split("/").length,
        );

        console.log(
          `[DEBUG] Creating ${sortedFolderPaths.length} folders and ${filesWithPaths.length} files`,
        );
        console.log(`[DEBUG] Folders:`, sortedFolderPaths);

        setUploadProgress(`Creating folder structure...`);

        // Create all folder nodes first
        for (const folderPath of sortedFolderPaths) {
          const pathParts = folderPath.split("/");
          const folderSlug = pathParts[pathParts.length - 1];
          const folderNamespace = [...currentPath, ...pathParts.slice(0, -1)]
            .filter(Boolean)
            .join("/");

          console.log(
            `[DEBUG] Creating folder: ${folderSlug} in namespace: "${folderNamespace}"`,
          );

          try {
            const response = await fetch("/api/nodes", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                slug: folderSlug,
                title: folderSlug
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (l: string) => l.toUpperCase()),
                namespace: folderNamespace,
                type: "folder",
                content: "",
              }),
            });

            const data = await response
              .json()
              .catch(() => ({ error: `HTTP ${response.status}` }));

            if (!response.ok) {
              // Check if it's a duplicate error (which we can ignore)
              const isDuplicate =
                data.error?.toLowerCase().includes("duplicate") ||
                data.error?.toLowerCase().includes("already exists");

              if (isDuplicate) {
                console.log(
                  `[DEBUG] Folder already exists (skipping): ${folderSlug}`,
                );
              } else {
                console.error(
                  `[ERROR] Failed to create folder ${folderSlug}:`,
                  {
                    status: response.status,
                    statusText: response.statusText,
                    error: data.error,
                    details: data.details,
                  },
                );
                throw new Error(
                  `Failed to create folder "${folderSlug}": ${data.error || response.statusText}`,
                );
              }
            } else {
              console.log(`[DEBUG] Successfully created folder: ${folderSlug}`);
            }
          } catch (err: any) {
            console.error(
              `[ERROR] Exception creating folder ${folderSlug}:`,
              err,
            );
            throw err;
          }
        }

        setUploadProgress(`Uploading ${filesWithPaths.length} file(s)...`);

        // Track upload results
        let filesUploaded = 0;
        let filesFailed = 0;

        // Process each file
        for (let i = 0; i < filesWithPaths.length; i++) {
          const { file, relativePath } = filesWithPaths[i];
          setUploadProgress(
            `Uploading ${i + 1}/${filesWithPaths.length}: ${file.name}`,
          );

          const content = await file.text();

          // Extract filename without extension for slug
          const slug = file.name.replace(/\.mdx?$/i, "");

          // Extract directory path from relativePath (which includes the filename)
          // Example: "guides/setup.md" -> "guides"
          const pathParts = relativePath
            ? relativePath.split("/").filter(Boolean)
            : [];
          const directoryPath =
            pathParts.length > 1 ? pathParts.slice(0, -1).join("/") : "";

          // Combine current path with directory path
          const namespace = [...currentPath, directoryPath]
            .filter(Boolean)
            .join("/");

          console.log(`[DEBUG] Uploading file: ${file.name}`);
          console.log(`[DEBUG] - slug: ${slug}`);
          console.log(`[DEBUG] - currentPath: ${JSON.stringify(currentPath)}`);
          console.log(`[DEBUG] - relativePath: ${relativePath}`);
          console.log(`[DEBUG] - directoryPath: ${directoryPath}`);
          console.log(`[DEBUG] - namespace: "${namespace}"`);

          // Create the node via API
          try {
            const response = await fetch("/api/nodes", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                slug,
                title: slug
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (l: string) => l.toUpperCase()),
                namespace,
                type: "file",
                content,
              }),
            });

            if (!response.ok) {
              const data = await response.json();
              console.error(
                `[ERROR] Failed to upload ${file.name}:`,
                data.error,
              );
              filesFailed++;
            } else {
              console.log(`[DEBUG] Successfully uploaded: ${file.name}`);
              filesUploaded++;
            }
          } catch (err: any) {
            console.error(`[ERROR] Exception uploading ${file.name}:`, err);
            filesFailed++;
          }
        }

        // Refresh the page to show new files
        const message =
          filesFailed > 0
            ? `Uploaded ${filesUploaded} file(s) successfully. ${filesFailed} file(s) failed.`
            : `Successfully uploaded ${sortedFolderPaths.length} folder(s) and ${filesUploaded} file(s)!`;
        alert(message);
        router.refresh();
      } catch (err: any) {
        console.error("Upload error:", err);
        alert(`Upload failed: ${err.message}`);
      } finally {
        setUploading(false);
        setUploadProgress("");
      }
    },
    [isActive, currentPath, router],
  );

  if (!isActive) {
    return null;
  }

  return (
    <>
      {isDragging && (
        <div
          onDrop={handleFileDrop}
          className="fixed inset-0 z-50 ml-32 flex max-h-[100vh] items-center justify-center border-2 border-dashed border-blue-500 bg-blue-500 bg-opacity-10"
        >
          <div className="max-w-md rounded-lg bg-white p-8 shadow-2xl dark:bg-gray-800">
            <div className="text-center">
              <svg
                className="mx-auto mb-4 h-16 w-16 text-blue-500"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                Drop Files or Folders Here
              </h3>
              <p className="mb-1 text-sm text-gray-600 dark:text-gray-300">
                Upload .md or .mdx files
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Upload to:{" "}
                <span className="font-mono text-blue-600 dark:text-blue-400">
                  /{currentPath.join("/") || "root"}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {uploading && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-w-md rounded-lg bg-white p-8 shadow-xl dark:bg-gray-800">
            <div className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
              <p className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">
                {uploadProgress || "Uploading..."}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Please wait while we process your files
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
