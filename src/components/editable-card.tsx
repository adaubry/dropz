"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Link } from "@/components/ui/link";
import { Pencil, Check, X, Trash2 } from "lucide-react";

interface EditableCardProps {
  node: {
    id: number;
    slug: string;
    title: string;
    metadata?: {
      cover?: string;
      summary?: string;
      [key: string]: any;
    };
    type: string;
  };
  href: string;
  imageCount: number;
  isEditing: boolean;
}

export function EditableCard({
  node,
  href,
  imageCount,
  isEditing,
}: EditableCardProps) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: node.title,
    summary: node.metadata?.summary || "",
    cover: node.metadata?.cover || "",
  });
  const router = useRouter();

  const cover = formData.cover || node.metadata?.cover || "/placeholder.svg";
  const summary = formData.summary || node.metadata?.summary || "Explore this content...";
  const icon = node.type === "folder" ? "📁" : "💧";

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/nodes/${node.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          metadata: {
            ...node.metadata,
            summary: formData.summary,
            cover: formData.cover,
          },
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

  const handleDelete = async () => {
    if (!confirm(`Delete "${node.title}"? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/nodes/${node.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete");
      }

      router.refresh();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      title: node.title,
      summary: node.metadata?.summary || "",
      cover: node.metadata?.cover || "",
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="block border overflow-hidden bg-white dark:bg-gray-800 p-4">
        <div className="space-y-3">
          {/* Cover URL */}
          <div>
            <label className="block text-xs font-medium mb-1">Cover URL</label>
            <input
              type="text"
              value={formData.cover}
              onChange={(e) =>
                setFormData({ ...formData, cover: e.target.value })
              }
              className="w-full px-2 py-1 text-sm border rounded"
              placeholder="https://..."
            />
          </div>

          {/* Cover Preview */}
          {formData.cover && formData.cover !== "/placeholder.svg" && (
            <div className="aspect-video relative bg-gray-100 dark:bg-gray-700">
              <Image
                src={formData.cover}
                alt="Cover preview"
                width={400}
                height={225}
                quality={75}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-2 py-1 text-sm border rounded font-semibold"
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-medium mb-1">Summary</label>
            <textarea
              value={formData.summary}
              onChange={(e) =>
                setFormData({ ...formData, summary: e.target.value })
              }
              className="w-full px-2 py-1 text-sm border rounded resize-none"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
              Save
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 ml-auto"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <Link
        prefetch={true}
        href={href}
        className="block border overflow-hidden hover:shadow-lg transition-shadow bg-white dark:bg-gray-800"
      >
        {cover && cover !== "/default-water.svg" && (
          <div className="aspect-video relative bg-gray-100 dark:bg-gray-700">
            <Image
              loading={imageCount < 15 ? "eager" : "lazy"}
              decoding="sync"
              src={cover}
              alt={node.title}
              width={400}
              height={225}
              quality={75}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>
        )}

        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 group-hover:text-blue-600 flex items-center gap-2">
            <span>{icon}</span>
            <span>{node.title}</span>
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {summary}
          </p>
        </div>
      </Link>

      {/* Edit button (only visible in edit mode) */}
      {isEditing && (
        <button
          onClick={(e) => {
            e.preventDefault();
            setEditing(true);
          }}
          className="absolute top-2 right-2 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          title="Edit this card"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
