"use client";

import { Link } from "@/components/ui/link";
import { useState } from "react";

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

function CollapsibleSection({ item }: { item: SidebarItem }) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <li className="w-full">
      <div className="flex items-start">
        {hasChildren && (
          <div
            onClick={() => setIsOpen(!isOpen)}
            className="mr-1 cursor-pointer select-none text-xs"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsOpen(!isOpen);
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
            <CollapsibleSection key={child.id} item={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function UniversalSidebar({ parentLink, currentItems }: UniversalSidebarProps) {
  return (
    <aside className="fixed left-0 hidden w-64 min-w-64 max-w-64 overflow-y-auto border-r p-4 md:block md:h-full">
      {/* Parent link (n-1) */}
      {parentLink && (
        <div className="mb-4">
          <Link
            prefetch={true}
            href={parentLink.href}
            className="flex items-center text-xs text-gray-600 hover:text-accent1 hover:underline"
          >
            <span className="mr-1">←</span>
            <span>{parentLink.title}</span>
          </Link>
        </div>
      )}

      {/* Current navigation (n) with children (n+1) */}
      <div>
        <h2 className="border-b border-accent1 text-sm font-semibold text-accent1">
          Navigation
        </h2>
        <ul className="flex flex-col items-start justify-center">
          {currentItems.map((item) => (
            <CollapsibleSection key={item.id} item={item} />
          ))}
        </ul>
      </div>
    </aside>
  );
}
