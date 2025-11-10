"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InlineFloatingEditButton } from "./floating-edit-button";
import { Pencil, Check, X } from "lucide-react";

interface EditablePlanetTitleProps {
  planet: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
  };
  isEditing: boolean;
}

export function EditablePlanetTitle({ planet, isEditing }: EditablePlanetTitleProps) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: planet.name,
    description: planet.description || "",
  });
  const router = useRouter();

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/planets/${planet.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
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
    setFormData({
      name: planet.name,
      description: planet.description || "",
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="mb-8 p-4 border border-blue-500 rounded-lg bg-white dark:bg-gray-800">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Planet Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-2xl font-bold"
              placeholder="My Planet"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
              placeholder="A brief description..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex items-center gap-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {isEditing ? (
        <InlineFloatingEditButton onEdit={() => setEditing(true)} isEditing={isEditing}>
          <h1 className="text-4xl font-bold mb-2">🌍 {planet.name}</h1>
        </InlineFloatingEditButton>
      ) : (
        <h1 className="text-4xl font-bold mb-2">🌍 {planet.name}</h1>
      )}
      {planet.description && (
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          {planet.description}
        </p>
      )}
    </div>
  );
}
