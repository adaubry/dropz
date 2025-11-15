// Rhai script for export-logseq-notes
// This script processes each page before export
// Required by the export-logseq-notes tool

// For now, this is a pass-through script
// It receives each page and can modify it before export
// Future enhancements: custom processing, filtering, transformation

fn process_page(page) {
    // Pass through unmodified
    // The page object contains: title, slug, body, etc.
    page
}
