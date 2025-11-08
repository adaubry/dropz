import type { Metadata } from "next";
import "./globals.css";
import { SearchDropdownComponent } from "@/components/search-dropdown";
import { Suspense } from "react";
import { AuthServer } from "./auth.server";
import { Link } from "@/components/ui/link";
import { Analytics } from "@vercel/analytics/react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ImageLoadingProvider } from "@/lib/image-loading-context";
import { PageCacheProvider } from "@/components/page-cache-provider";
import { RefreshButton } from "@/components/refresh-button";
import { UniversalSidebar } from "@/components/universal-sidebar";
import { getNodeByPath, getNodeChildren, getPlanetBySlug } from "@/lib/queries-nodes";

import { buildNodesSidebar } from "@/lib/sidebar-builder-nodes";

export const metadata: Metadata = {
  title: {
    template: "%s | Dropz",
    default: "Dropz",
  },
  description: "Built on top of NextFaster",
};

export const revalidate = 86400; // One day


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} flex flex-col overflow-y-auto overflow-x-hidden antialiased`}
      >
        <ImageLoadingProvider>
        <PageCacheProvider>
        <div>
          
          <header className="fixed top-0 z-10 flex h-[90px] w-[100vw] flex-grow items-center justify-between border-b-2 border-accent2 bg-background p-2 pb-[4px] pt-2 sm:h-[70px] sm:flex-row sm:gap-4 sm:p-4 sm:pb-[4px] sm:pt-0">
            <div className="flex flex-grow flex-col">
              
              <div className="absolute right-2 top-2 flex justify-end pt-2 font-sans text-sm  sm:relative sm:right-0 sm:top-0">
                <div className="px-2">
                  <RefreshButton /></div>

                  <div className="hover:underline hover:bg-accent2"><Suspense
                  fallback={
                    <div className="flex flex-row items-center gap-1">
                      <div className="h-[20px]" />
                      <svg viewBox="0 0 10 6" className="h-[6px] w-[10px]">
                        <polygon points="0,0 5,6 10,0"></polygon>
                      </svg>
                    </div>
                  }
                >
                  <AuthServer />
                </Suspense></div>
                
              </div>
              <div className="flex w-full flex-col items-start justify-center sm:w-auto sm:flex-row sm:items-center sm:gap-2">
                <Link
                  prefetch={true}
                  href="/"
                  className="text-4xl font-bold text-accent1"
                >
                  Dropz
                </Link>
                <div className="items flex w-full flex-row items-center justify-between gap-4">
                  <div className="mx-0 flex-grow sm:mx-auto sm:flex-grow-0">
                    <SearchDropdownComponent />
                  </div>
                  <div className="flex flex-row justify-between space-x-4">

                  </div>
                </div>
              </div>
              
            </div>
          </header>
          
          <div className="pt-[85px] sm:pt-[70px]">
            {children}</div>
        </div>

        <Analytics scriptSrc="/insights/events.js" endpoint="/hfi/events" />
        <SpeedInsights />
        </PageCacheProvider>
        </ImageLoadingProvider>
      </body>
    </html>
  );
}
