"use client";

import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function RefreshButton() {
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
    toast.success("Page refreshed! Latest content loaded.");
  };

  return (
    <button
      onClick={handleRefresh}
      className="flex items-center gap-1 hover:bg-accent2 hover:underline"
      title="Refresh content from database"
    >
      <RefreshCw className="h-3 w-3" />
      <span>Refresh</span>
    </button>
  );
}
