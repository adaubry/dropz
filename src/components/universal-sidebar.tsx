"use client";

import { Link } from "@/components/ui/link";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface SidebarItem {
  id: string;
  title: string;
  href: string;
  children?: SidebarItem[];
}

export interface UniversalSidebarProps {
  parentLink?: {
    title: string;
    href: string;
  };
  currentItems: SidebarItem[];
}

interface CollapsibleSectionProps {
  item: SidebarItem;
  isOpen: boolean;
  onToggle: () => void;
}

function CollapsibleSection({
  item,
  isOpen,
  onToggle,
}: CollapsibleSectionProps) {
  const hasChildren = item.children && item.children.length > 0;

  return (
    <li className="w-full">
      <div className="flex items-start">
        {hasChildren && (
          <div
            onClick={onToggle}
            className="mr-1 mt-1 cursor-pointer select-none text-xs"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle();
              }
            }}
          >
            {isOpen ? "▼" : "▶"}
          </div>
        )}
        <Link
          prefetch={true}
          href={item.href}
          className="block flex-1 py-1 text-xs text-gray-800 hover:bg-accent2 hover:underline"
        >
          {item.title}
        </Link>
      </div>
      {hasChildren && isOpen && (
        <ul className="ml-4 border-l pl-2">
          {item.children!.map((child) => (
            <li key={child.id} className="w-full">
              <Link
                prefetch={true}
                href={child.href}
                className="block py-1 text-xs text-gray-800 hover:bg-accent2 hover:underline"
              >
                {child.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function UniversalSidebar({
  parentLink,
  currentItems,
}: UniversalSidebarProps) {
  // Only one item can be expanded at a time - first item is expanded by default
  const [expandedItemId, setExpandedItemId] = useState<string | null>(
    currentItems.length > 0 ? currentItems[0].id : null,
  );

  const handleToggle = (itemId: string) => {
    setExpandedItemId((current) => (current === itemId ? null : itemId));
  };

  return (
    <aside className="fixed left-0 hidden h-[calc(100vh)] w-64 min-w-64 max-w-64 border-r md:block">
      <ScrollArea className="h-full w-full" scrollBarSide="left">
        <div className="p-4 pl-7">
          {/* Add left padding to account for scrollbar on left */}
          {/* Parent link (n-1) - just a back button */}
          {parentLink && (
            <div className="mb-2">
              <Link
                prefetch={true}
                href={parentLink.href}
                className="flex items-center text-sm font-semibold text-gray-600 hover:text-accent1 hover:underline"
              >
                <div className="pr-2">↪</div>
                {parentLink.title}
              </Link>
            </div>
          )}

          {/* Current navigation (n+1) with children (n+2) */}
          <div>
            <ul className="flex flex-col items-start justify-center">
              {currentItems.map((item) => (
                <CollapsibleSection
                  key={item.id}
                  item={item}
                  isOpen={expandedItemId === item.id}
                  onToggle={() => handleToggle(item.id)}
                />
              ))}
            </ul>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
