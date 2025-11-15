# Logseq Export Templates

This directory contains Handlebars templates used by the `export-logseq-notes` Rust tool to generate HTML from Logseq graphs.

## Templates

### `dropz.tmpl`

Custom template for Dropz that outputs just the content HTML (no document wrapper).

**Variables available:**
- `{{title}}` - Page title
- `{{{body}}}` - Rendered HTML content (triple braces = unescaped)
- `{{tags}}` - Comma-separated list of tags
- `{{created_time}}` - ISO timestamp (if available)
- `{{edited_time}}` - ISO timestamp (if available)

**Helpers:**
- `{{date_format time "%Y-%m-%d"}}` - Format timestamp

## Usage

The Rust tool is invoked with:

```bash
export-logseq-notes --config export-config.toml
```

Where the config references this template:

```toml
template = "dropz"
```

## See Also

- [RUST_EXPORT_INTEGRATION_DESIGN.md](../RUST_EXPORT_INTEGRATION_DESIGN.md) - Full integration design
- [export-logseq-notes](https://github.com/dimfeld/export-logseq-notes) - Rust tool repository
