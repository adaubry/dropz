"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Link } from "@/components/ui/link";

const MAX_BREADCRUMBS = 3;
const HISTORY_KEY = "dropz_navigation_history";

interface BreadcrumbItem {
  path: string;
  label: string;
}

/**
 * Validates if a path exists by calling the validation API
 */
async function validatePath(path: string): Promise<boolean> {
  try {
    const response = await fetch("/api/validate-path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.valid === true;
  } catch (error) {
    console.error("Error validating path:", error);
    return false;
  }
}

export function HistoryBreadcrumbs() {
  const pathname = usePathname();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    async function updateBreadcrumbs() {
      // Get current history from localStorage
      const storedHistory = localStorage.getItem(HISTORY_KEY);
      let history: BreadcrumbItem[] = storedHistory
        ? JSON.parse(storedHistory)
        : [];

      // Extract label from pathname (last segment or "Home")
      const segments = pathname.split("/").filter(Boolean);
      const label = segments[segments.length - 1] || "Home";

      // Create new breadcrumb item
      const newItem: BreadcrumbItem = {
        path: pathname,
        label: decodeURIComponent(label),
      };

      // Remove duplicate if current path is already in history
      history = history.filter((item) => item.path !== pathname);

      // Add new item to the end
      history.push(newItem);

      // Keep only last MAX_BREADCRUMBS items
      if (history.length > MAX_BREADCRUMBS) {
        history = history.slice(-MAX_BREADCRUMBS);
      }

      // Validate all paths in parallel
      const validationResults = await Promise.all(
        history.map((item) => validatePath(item.path))
      );

      // Filter out invalid paths
      const validHistory = history.filter((_, index) => validationResults[index]);

      // Save cleaned history to localStorage
      localStorage.setItem(HISTORY_KEY, JSON.stringify(validHistory));

      // Update state with valid breadcrumbs only
      setBreadcrumbs(validHistory);
    }

    updateBreadcrumbs();
  }, [pathname]);

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav className="mb-6 text-sm text-gray-600 dark:text-gray-400">
      {/* Always show ".." link to home */}
      <Link
        prefetch={true}
        href="/"
        className="hover:text-blue-600 hover:underline"
      >
        ..
      </Link>

      {breadcrumbs.map((crumb, index) => (
        <span key={index}>
          <span> / </span>
          <Link
            prefetch={true}
            href={crumb.path}
            className="hover:text-blue-600 hover:underline"
          >
            {crumb.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}
