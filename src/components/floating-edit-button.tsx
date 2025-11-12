"use client";

import { useState, useRef, ReactNode } from "react";
import { Pencil } from "lucide-react";

interface FloatingEditButtonProps {
  onEdit: () => void;
  children: ReactNode;
  isEditing: boolean;
  className?: string;
}

/**
 * Floating Edit Button Component
 *
 * Wraps editable content and shows a floating edit button on hover.
 * The button appears near the top-right of the hovered element.
 *
 * Usage:
 * <FloatingEditButton onEdit={() => handleEdit()} isEditing={isEditingMode}>
 *   <div>Your editable content</div>
 * </FloatingEditButton>
 */
export function FloatingEditButton({
  onEdit,
  children,
  isEditing,
  className = "",
}: FloatingEditButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Don't show button if not in editing mode
  if (!isEditing) {
    return <>{children}</>;
  }

  return (
    <div
      ref={containerRef}
      className={`group relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}

      {/* Floating Edit Button */}
      {isHovered && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          className="absolute right-2 top-2 z-50 flex transform cursor-pointer items-center gap-2 rounded-lg border border-blue-500 bg-blue-600 px-3 py-2 text-sm font-medium text-white opacity-0 shadow-lg transition-all duration-200 ease-out animate-in fade-in slide-in-from-top-2 hover:scale-105 hover:bg-blue-700 group-hover:opacity-100"
          aria-label="Edit this content"
        >
          <Pencil className="h-4 w-4" />
          <span>Edit</span>
        </button>
      )}

      {/* Hover overlay for visual feedback */}
      {isHovered && (
        <div className="pointer-events-none absolute inset-0 rounded-lg border border-dashed border-blue-500 bg-blue-50 opacity-10 transition-opacity duration-200 dark:bg-blue-950" />
      )}
    </div>
  );
}

/**
 * Inline Floating Edit Button (for smaller elements like titles, paragraphs)
 *
 * Shows a smaller, icon-only button that appears on hover
 */
export function InlineFloatingEditButton({
  onEdit,
  children,
  isEditing,
  className = "",
}: FloatingEditButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  if (!isEditing) {
    return <>{children}</>;
  }

  return (
    <span
      className={`group relative inline-block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}

      {/* Compact Inline Edit Button */}
      {isHovered && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          className="absolute -right-8 top-0 z-50 transform cursor-pointer rounded-md bg-blue-600 p-1.5 text-white opacity-0 shadow-md transition-all duration-150 hover:scale-110 hover:bg-blue-700 group-hover:opacity-100"
          aria-label="Edit"
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
