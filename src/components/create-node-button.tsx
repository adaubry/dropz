"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreateNodeButtonProps {
  workspaceSlug: string;
  currentPath: string[];
  isActive: boolean;
}

export function CreateNodeButton({
  workspaceSlug,
  currentPath,
  isActive,
}: CreateNodeButtonProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    type: "file" as "file" | "folder",
    content: "",
  });
  const router = useRouter();

  if (!isActive) {
    return null;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const namespace = currentPath.join("/");

      // For files, create .md content with frontmatter
      let content = formData.content;
      if (formData.type === "file" && !content) {
        // Auto-generate .md content with path and slug
        const filePath = namespace
          ? `${namespace}/${formData.slug}.md`
          : `${formData.slug}.md`;

        content = `---
title: ${formData.title}
---

# ${formData.title}

Content goes here...
`;
      }

      const response = await fetch("/api/nodes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: formData.slug,
          title: formData.title,
          namespace,
          type: formData.type,
          content: formData.type === "file" ? content : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create");
      }

      // Reset form
      setFormData({
        slug: "",
        title: "",
        type: "file",
        content: "",
      });
      setShowForm(false);
      router.refresh();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <Button
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-6 z-40 shadow-lg"
        size="lg"
      >
        <Plus className="w-4 h-4 mr-2" />
        New
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Create New</h2>
          <button
            onClick={() => setShowForm(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as "file" | "folder" })
              }
              className="w-full px-3 py-2 border rounded-md"
              required
            >
              <option value="file">File (Markdown)</option>
              <option value="folder">Folder</option>
            </select>
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium mb-2">Slug</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md"
              placeholder="my-page"
              pattern="[a-z0-9-]+"
              title="Only lowercase letters, numbers, and hyphens"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              URL-friendly identifier (lowercase, hyphens only)
              {formData.type === "file" && " - Will create as .md file"}
            </p>
            {currentPath.length > 0 && (
              <p className="text-xs text-gray-600 mt-1">
                Path: /{currentPath.join("/")}/{formData.slug}
                {formData.type === "file" ? ".md" : ""}
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md"
              placeholder="My Page Title"
              required
            />
          </div>

          {/* Content (only for files) */}
          {formData.type === "file" && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Initial Content (Optional)
              </label>
              <textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md font-mono text-sm resize-none"
                rows={10}
                placeholder="Leave empty to auto-generate .md template"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to create a basic markdown template with frontmatter
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
