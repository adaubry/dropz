-- Migration: Remove deprecated content field from nodes table
-- Date: 2025-11-15
-- Description: Remove the deprecated 'content' field and 'content_search_idx' index
--              as we now use only 'parsed_html' from the Rust export tool.

-- Drop the full-text search index on content
DROP INDEX IF EXISTS nodes_content_search_idx;

-- Drop the content column from nodes table
ALTER TABLE nodes DROP COLUMN IF EXISTS content;

-- Migration complete
-- All Logseq pages now use parsed_html exclusively
