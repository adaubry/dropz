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
      className={`relative group ${className}`}
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
          className="absolute top-2 right-2 z-50
                     flex items-center gap-2
                     px-3 py-2
                     bg-blue-600 hover:bg-blue-700
                     text-white text-sm font-medium
                     rounded-lg shadow-lg
                     transition-all duration-200 ease-out
                     transform hover:scale-105
                     border border-blue-500
                     opacity-0 group-hover:opacity-100
                     animate-in fade-in slide-in-from-top-2
                     cursor-pointer"
          aria-label="Edit this content"
        >
          <Pencil className="w-4 h-4" />
          <span>Edit</span>
        </button>
      )}

      {/* Hover overlay for visual feedback */}
      {isHovered && (
        <div className="absolute inset-0 pointer-events-none
                        border-2 border-blue-500 border-dashed
                        rounded-lg
                        bg-blue-50 dark:bg-blue-950
                        opacity-10
                        transition-opacity duration-200"
        />
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
      className={`relative inline-block group ${className}`}
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
          className="absolute -right-8 top-0 z-50
                     p-1.5
                     bg-blue-600 hover:bg-blue-700
                     text-white
                     rounded-md shadow-md
                     transition-all duration-150
                     transform hover:scale-110
                     opacity-0 group-hover:opacity-100
                     cursor-pointer"
          aria-label="Edit"
        >
          <Pencil className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
