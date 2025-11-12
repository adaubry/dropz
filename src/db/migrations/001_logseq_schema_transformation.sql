-- Migration: Transform schema from folder/file paradigm to Logseq page paradigm
-- Author: Claude
-- Date: 2025-11-12
-- Description: Drop all existing data and transform schema for full Logseq compatibility

-- ============================================
-- STEP 1: Clear existing data (fresh start)
-- ============================================

TRUNCATE TABLE node_backups CASCADE;
TRUNCATE TABLE editing_sessions CASCADE;
TRUNCATE TABLE node_links CASCADE;
TRUNCATE TABLE nodes CASCADE;
-- Keep planets and users

-- ============================================
-- STEP 2: Add new columns for Logseq support
-- ============================================

-- Add page_name for full Logseq page names (with slashes)
-- Example: "guides/setup/intro" instead of slug="intro" + namespace="guides/setup"
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS page_name TEXT;

-- Add is_journal to distinguish journal pages from regular pages
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS is_journal BOOLEAN DEFAULT FALSE;

-- Add journal_date for journal pages
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS journal_date DATE;

-- Add source_folder to track if came from journals/ or pages/
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS source_folder TEXT; -- 'journals' | 'pages'

-- ============================================
-- STEP 3: Modify type field to support Logseq
-- ============================================

-- Change type semantics: was 'folder'|'file', now 'page'
-- All nodes are now pages (no folders in Logseq)
-- Keep the column for now but change its meaning
-- type will be 'page' for all nodes
-- is_journal will distinguish journal pages

-- ============================================
-- STEP 4: Update indexes for Logseq queries
-- ============================================

-- Index for page_name lookups (primary lookup method)
CREATE INDEX IF NOT EXISTS nodes_page_name_idx ON nodes(page_name) WHERE page_name IS NOT NULL;

-- Index for journal date queries
CREATE INDEX IF NOT EXISTS nodes_journal_date_idx ON nodes(journal_date) WHERE journal_date IS NOT NULL;

-- Index for journal pages
CREATE INDEX IF NOT EXISTS nodes_is_journal_idx ON nodes(is_journal);

-- Index for source folder (journals vs pages)
CREATE INDEX IF NOT EXISTS nodes_source_folder_idx ON nodes(source_folder) WHERE source_folder IS NOT NULL;

-- Composite index for planet + page_name (primary lookup)
CREATE INDEX IF NOT EXISTS nodes_planet_page_name_idx ON nodes(planet_id, page_name);

-- ============================================
-- STEP 5: Update node_links for block references
-- ============================================

-- Extend link_type to support block references and embeds
-- link_type can now be: 'page_ref' | 'block_ref' | 'page_embed' | 'block_embed'

-- Add block_id for block-level references (UUID format)
ALTER TABLE node_links ADD COLUMN IF NOT EXISTS source_block_id TEXT;
ALTER TABLE node_links ADD COLUMN IF NOT EXISTS target_block_id TEXT;

-- Index for block reference lookups
CREATE INDEX IF NOT EXISTS node_links_source_block_idx ON node_links(source_block_id) WHERE source_block_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS node_links_target_block_idx ON node_links(target_block_id) WHERE target_block_id IS NOT NULL;

-- ============================================
-- STEP 6: Comments for documentation
-- ============================================

COMMENT ON COLUMN nodes.page_name IS 'Full Logseq page name with namespace: "guides/setup/intro"';
COMMENT ON COLUMN nodes.is_journal IS 'True if this is a journal (daily note) page';
COMMENT ON COLUMN nodes.journal_date IS 'Date for journal pages (YYYY-MM-DD)';
COMMENT ON COLUMN nodes.source_folder IS 'Source folder from Logseq graph: "journals" or "pages"';
COMMENT ON COLUMN nodes.type IS 'Always "page" in Logseq mode (kept for compatibility)';
COMMENT ON COLUMN nodes.namespace IS 'Parent namespace path: "guides/setup" for page "guides/setup/intro"';
COMMENT ON COLUMN nodes.slug IS 'Last segment of page name: "intro" for "guides/setup/intro"';

COMMENT ON COLUMN node_links.source_block_id IS 'UUID of source block if reference is block-level';
COMMENT ON COLUMN node_links.target_block_id IS 'UUID of target block for block references';
COMMENT ON COLUMN node_links.link_type IS 'Type: page_ref, block_ref, page_embed, block_embed';

-- ============================================
-- STEP 7: Update constraints
-- ============================================

-- Page names should be unique per planet
CREATE UNIQUE INDEX IF NOT EXISTS nodes_planet_page_name_unique
ON nodes(planet_id, page_name)
WHERE page_name IS NOT NULL;

-- Journal dates should be unique per planet
CREATE UNIQUE INDEX IF NOT EXISTS nodes_planet_journal_date_unique
ON nodes(planet_id, journal_date)
WHERE is_journal = TRUE AND journal_date IS NOT NULL;
