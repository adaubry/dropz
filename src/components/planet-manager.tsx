"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Globe } from "lucide-react";

interface Planet {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

interface PlanetManagerProps {
  initialPlanets: Planet[];
}

/**
 * Planet Manager Component
 *
 * Displays all user's planets and allows creating/deleting them
 *
 * Usage on profile page:
 * <PlanetManager initialPlanets={userPlanets} />
 */
export function PlanetManager({ initialPlanets }: PlanetManagerProps) {
  const router = useRouter();
  const [planets, setPlanets] = useState<Planet[]>(initialPlanets);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlanet, setNewPlanet] = useState({
    name: "",
    slug: "",
    description: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setNewPlanet({
      ...newPlanet,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    });
  };

  const handleCreatePlanet = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/planets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newPlanet),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create planet");
      }

      const { planet } = await response.json();
      setPlanets([...planets, planet]);
      setNewPlanet({ name: "", slug: "", description: "" });
      setIsCreating(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlanet = async (planetId: number, planetName: string) => {
    if (!confirm(`Are you sure you want to delete "${planetName}"? All content will be lost.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/planets?planetId=${planetId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete planet");
      }

      setPlanets(planets.filter((p) => p.id !== planetId));
      router.refresh();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Planets</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage your content workspaces
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Planet
        </button>
      </div>

      {/* Create Planet Form */}
      {isCreating && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Create New Planet</h3>
          <form onSubmit={handleCreatePlanet} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Planet Name
              </label>
              <input
                type="text"
                value={newPlanet.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Knowledge Base"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                URL Slug
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">/</span>
                <input
                  type="text"
                  value={newPlanet.slug}
                  onChange={(e) =>
                    setNewPlanet({ ...newPlanet, slug: e.target.value })
                  }
                  placeholder="my-knowledge-base"
                  pattern="[a-z0-9-]+"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Only lowercase letters, numbers, and hyphens
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description (optional)
              </label>
              <textarea
                value={newPlanet.description}
                onChange={(e) =>
                  setNewPlanet({ ...newPlanet, description: e.target.value })
                }
                placeholder="A place for all my documentation..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {loading ? "Creating..." : "Create Planet"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setError("");
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Planets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {planets.map((planet) => (
          <div
            key={planet.id}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-lg">{planet.name}</h3>
              </div>
              <button
                onClick={() => handleDeletePlanet(planet.id, planet.name)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-all"
                aria-label="Delete planet"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {planet.description || "No description"}
            </p>

            <div className="flex items-center justify-between">
              <code className="text-xs bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                /{planet.slug}
              </code>
              <a
                href={`/${planet.slug}`}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Open →
              </a>
            </div>
          </div>
        ))}
      </div>

      {planets.length === 0 && !isCreating && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            You haven't created any planets yet
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Create your first planet
          </button>
        </div>
      )}
    </div>
  );
}
