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
  isRoot: boolean = false
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
      // For root level dropped folders, don't include the folder name in path
      // This makes drag-drop behave like "mv folder/* currentDir/"
      const subPath = isRoot ? basePath : (basePath ? `${basePath}/${entry.name}` : entry.name);
      const subFiles = await readDirectory(subEntry, subPath, false);
      files.push(...subFiles);
    }
  }

  return files;
}

// Get all files from dropped items (handles both files and directories)
async function getAllFiles(
  dataTransferItems: DataTransferItemList
): Promise<FileWithPath[]> {
  const allFiles: FileWithPath[] = [];

  for (let i = 0; i < dataTransferItems.length; i++) {
    const item = dataTransferItems[i];
    if (item.kind === "file") {
      const entry = item.webkitGetAsEntry?.() || item.getAsEntry?.();
      if (entry) {
        // Pass isRoot=true so dropped folders' contents go into current dir
        // This makes it behave like "mv folder/* ." instead of "mv folder ."
        const files = await readDirectory(entry, "", true);
        allFiles.push(...files);
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

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
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
          alert("No markdown files found. Please drop .md or .mdx files or folders containing them.");
          setUploading(false);
          return;
        }

        // Extract all unique folder paths that need to be created
        const folderPaths = new Set<string>();
        filesWithPaths.forEach(({ relativePath }) => {
          if (relativePath) {
            // Split the relativePath to get all folder levels
            const parts = relativePath.split("/").filter(Boolean);
            // Add each cumulative path
            for (let i = 0; i < parts.length; i++) {
              const folderPath = parts.slice(0, i + 1).join("/");
              folderPaths.add(folderPath);
            }
          }
        });

        // Sort folder paths by depth (shallowest first) to create parents before children
        const sortedFolderPaths = Array.from(folderPaths).sort(
          (a, b) => a.split("/").length - b.split("/").length
        );

        console.log(`[DEBUG] Creating ${sortedFolderPaths.length} folders and ${filesWithPaths.length} files`);
        console.log(`[DEBUG] Folders:`, sortedFolderPaths);

        setUploadProgress(`Creating folder structure...`);

        // Create all folder nodes first
        for (const folderPath of sortedFolderPaths) {
          const pathParts = folderPath.split("/");
          const folderSlug = pathParts[pathParts.length - 1];
          const folderNamespace = [...currentPath, ...pathParts.slice(0, -1)]
            .filter(Boolean)
            .join("/");

          console.log(`[DEBUG] Creating folder: ${folderSlug} in namespace: "${folderNamespace}"`);

          const response = await fetch("/api/nodes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              slug: folderSlug,
              title: folderSlug.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
              namespace: folderNamespace,
              type: "folder",
              content: "",
            }),
          });

          if (!response.ok) {
            const data = await response.json();
            // Ignore duplicate folder errors
            if (!data.error?.includes("duplicate")) {
              console.warn(`Failed to create folder ${folderSlug}:`, data.error);
            }
          }
        }

        setUploadProgress(`Uploading ${filesWithPaths.length} file(s)...`);

        // Process each file
        for (let i = 0; i < filesWithPaths.length; i++) {
          const { file, relativePath } = filesWithPaths[i];
          setUploadProgress(`Uploading ${i + 1}/${filesWithPaths.length}: ${file.name}`);

          const content = await file.text();

          // Extract filename without extension for slug
          const slug = file.name.replace(/\.mdx?$/i, "");

          // Combine current path with relative path from dropped folder structure
          const fullPath = relativePath
            ? [...currentPath, relativePath].filter(Boolean)
            : currentPath;
          const namespace = fullPath.join("/");

          console.log(`[DEBUG] Uploading file: ${file.name}`);
          console.log(`[DEBUG] - slug: ${slug}`);
          console.log(`[DEBUG] - currentPath: ${JSON.stringify(currentPath)}`);
          console.log(`[DEBUG] - relativePath: ${relativePath}`);
          console.log(`[DEBUG] - fullPath: ${JSON.stringify(fullPath)}`);
          console.log(`[DEBUG] - namespace: "${namespace}"`);

          // Create the node via API
          const response = await fetch("/api/nodes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              slug,
              title: slug.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
              namespace,
              type: "file",
              content,
            }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || `Failed to upload ${file.name}`);
          }
        }

        // Refresh the page to show new files
        alert(`Successfully uploaded ${sortedFolderPaths.length} folder(s) and ${filesWithPaths.length} file(s)!`);
        router.refresh();
      } catch (err: any) {
        console.error("Upload error:", err);
        alert(`Upload failed: ${err.message}`);
      } finally {
        setUploading(false);
        setUploadProgress("");
      }
    },
    [isActive, currentPath, router]
  );

  if (!isActive) {
    return null;
  }

  return (
    <>
      {isDragging && (
        <div
          onDrop={handleFileDrop}
          className="fixed inset-0 z-50 bg-blue-500 bg-opacity-10 border-4 border-dashed border-blue-500 flex items-center justify-center"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-2xl max-w-md">
            <div className="text-center">
              <svg
                className="mx-auto h-16 w-16 text-blue-500 mb-4"
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
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Drop Files or Folders Here
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                Upload .md or .mdx files
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Upload to: <span className="font-mono text-blue-600 dark:text-blue-400">/{currentPath.join("/") || "root"}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {uploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 pointer-events-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-xl max-w-md">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
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
