"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";

interface EditableMarkdownProps {
  node: {
    id: number;
    title: string;
    content: string | null;
  };
  isEditing: boolean;
}

export function EditableMarkdown({ node, isEditing }: EditableMarkdownProps) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState(node.content || "");
  const [title, setTitle] = useState(node.title);
  const router = useRouter();

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/nodes/${node.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update");
      }

      setEditing(false);
      router.refresh();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setContent(node.content || "");
    setTitle(node.title);
    setEditing(false);
  };

  if (!isEditing) {
    return null; // Don't show edit UI when not in editing mode
  }

  return (
    <div className="mb-4">
      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-md"
        >
          <Pencil className="w-4 h-4" />
          Edit Content
        </button>
      ) : (
        <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-lg">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Editing Mode
          </h3>

          {/* Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-md font-semibold text-lg"
            />
          </div>

          {/* Content */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Markdown Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border rounded-md font-mono text-sm resize-none"
              rows={20}
              placeholder="# Your Markdown Here&#10;&#10;Write your content..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Supports full Markdown syntax including frontmatter
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
