// Rhai script for export-logseq-notes
// This script processes and selects pages for export

// Main function called by export-logseq-notes
// Returns an array of pages to export
fn main(pages) {
    let selected = [];

    // Process all pages - select everything for Dropz
    for page in pages {
        // Include all pages (no filtering)
        // The page object will be processed by the template
        selected.push(page);
    }

    selected
}
