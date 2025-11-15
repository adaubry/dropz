/**
 * Types for Rust Export Service
 */

export interface ExportOptions {
  planetSlug?: string;
  template?: string;
  includeTags?: string[];
  excludeTags?: string[];
}

export interface PageMetadata {
  created?: string;
  updated?: string;
  tags?: string[];
  page_refs?: string[];
  block_refs?: string[];
}

export interface ExportedPage {
  pageName: string;
  namespace: string;
  slug: string;
  html: string;
  originalMarkdown?: string;
  metadata: PageMetadata;
}

export interface ExportResult {
  pages: ExportedPage[];
  stats: {
    total: number;
    duration: number;
  };
}

export interface ExportError {
  code: 'RUST_TOOL_NOT_FOUND' | 'EXPORT_FAILED' | 'INVALID_GRAPH' | 'UNKNOWN';
  message: string;
  details?: string;
}
