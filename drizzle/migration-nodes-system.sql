-- ================================================================
-- DATABASE REVAMP: Migration to Unified Nodes System
-- ================================================================
-- This migration transforms the old fixed 4-level hierarchy
-- (oceans → seas → rivers → drops) into a flexible namespace-based
-- nodes system that supports arbitrary depth.
--
-- Key Benefits:
-- - Arbitrary folder depth (no 4-level limitation)
-- - O(1) lookups via indexed (planet_id, namespace, slug)
-- - No recursive queries needed
-- - Simpler schema, easier to understand
-- - Removes e-commerce vestiges (price field)
-- ================================================================

-- ================================================================
-- STEP 1: Drop old hierarchy tables
-- ================================================================
-- These tables used fixed parent-child relationships with foreign keys.
-- The new nodes table replaces all of these with namespace-based storage.

DROP TABLE IF EXISTS drops CASCADE;
DROP TABLE IF EXISTS rivers CASCADE;
DROP TABLE IF EXISTS seas CASCADE;
DROP TABLE IF EXISTS oceans CASCADE;

-- Note: planets table is kept and reused
-- Note: users table is kept (unchanged)

-- ================================================================
-- STEP 2: Create unified nodes table
-- ================================================================
-- This single table replaces oceans, seas, rivers, and drops.
-- It uses a "namespace" field to store the full path, enabling
-- arbitrary depth without parent_id chains.
--
-- Examples:
--   File: /intro.md
--     → namespace: "", slug: "intro", depth: 0
--
--   File: /guides/setup.md
--     → namespace: "guides", slug: "setup", depth: 1
--
--   File: /courses/cs101/week1/day1/lecture.md
--     → namespace: "courses/cs101/week1/day1", slug: "lecture", depth: 4
--
-- Query: O(1) via composite index on (planet_id, namespace, slug)

CREATE TABLE IF NOT EXISTS nodes (
  id SERIAL PRIMARY KEY,

  -- Ownership
  planet_id INTEGER NOT NULL REFERENCES planets(id) ON DELETE CASCADE,

  -- Identity
  slug TEXT NOT NULL,
  title TEXT NOT NULL,

  -- Hierarchy (Logseq-style flat storage)
  namespace TEXT NOT NULL DEFAULT '',  -- Full path to parent folder
  depth INTEGER NOT NULL,               -- Distance from root (0, 1, 2, ...)
  file_path TEXT NOT NULL,              -- Original filesystem path

  -- Type discrimination
  type TEXT NOT NULL,                   -- 'folder' or 'file'
  node_type TEXT,                       -- 'ocean', 'sea', 'river', 'drop' (optional)

  -- Content (for files only)
  content TEXT,                         -- Raw markdown content
  parsed_html TEXT,                     -- Cached rendered HTML

  -- Metadata from frontmatter (JSONB for flexibility)
  metadata JSONB,                       -- { cover, summary, tags, date, author, ... }

  -- Display order
  "order" INTEGER DEFAULT 0,
  is_index BOOLEAN DEFAULT FALSE,       -- Is this an index.md or README.md?

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  file_modified_at TIMESTAMP
);

-- ================================================================
-- STEP 3: Create indexes for optimal query performance
-- ================================================================

-- Core indexes for common lookups
CREATE INDEX IF NOT EXISTS nodes_planet_id_idx ON nodes(planet_id);
CREATE INDEX IF NOT EXISTS nodes_namespace_idx ON nodes(namespace);
CREATE INDEX IF NOT EXISTS nodes_depth_idx ON nodes(depth);
CREATE INDEX IF NOT EXISTS nodes_type_idx ON nodes(type);
CREATE INDEX IF NOT EXISTS nodes_slug_idx ON nodes(slug);
CREATE INDEX IF NOT EXISTS nodes_file_path_idx ON nodes(file_path);

-- Composite indexes for frequent query patterns
CREATE INDEX IF NOT EXISTS nodes_planet_namespace_idx
  ON nodes(planet_id, namespace);
CREATE INDEX IF NOT EXISTS nodes_namespace_type_idx
  ON nodes(namespace, type);

-- Full-text search on content (PostgreSQL GIN index)
CREATE INDEX IF NOT EXISTS nodes_content_search_idx
  ON nodes USING gin(to_tsvector('english', COALESCE(content, '')));

-- Full-text search on title
CREATE INDEX IF NOT EXISTS nodes_title_search_idx
  ON nodes USING gin(to_tsvector('english', title));

-- CRITICAL: Unique constraint ensures no duplicate slugs in same namespace
CREATE UNIQUE INDEX IF NOT EXISTS unique_slug_per_namespace
  ON nodes(planet_id, namespace, slug);

-- ================================================================
-- STEP 4: Create node_links table for related content
-- ================================================================
-- This table stores explicit bidirectional links between nodes.
-- Used for "related content", "see also", backlinks, etc.

CREATE TABLE IF NOT EXISTS node_links (
  id SERIAL PRIMARY KEY,
  from_node_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  to_node_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  link_type TEXT DEFAULT 'reference',  -- 'reference', 'related', 'parent', 'embed'
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for efficient link queries
CREATE INDEX IF NOT EXISTS node_links_from_idx ON node_links(from_node_id);
CREATE INDEX IF NOT EXISTS node_links_to_idx ON node_links(to_node_id);

-- Prevent duplicate links
CREATE UNIQUE INDEX IF NOT EXISTS unique_link
  ON node_links(from_node_id, to_node_id, link_type);

-- ================================================================
-- STEP 5: Update triggers for automatic timestamp management
-- ================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for nodes table
DROP TRIGGER IF EXISTS update_nodes_updated_at ON nodes;
CREATE TRIGGER update_nodes_updated_at
  BEFORE UPDATE ON nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for planets table
DROP TRIGGER IF EXISTS update_planets_updated_at ON planets;
CREATE TRIGGER update_planets_updated_at
  BEFORE UPDATE ON planets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================
-- The database now uses the unified nodes system!
--
-- Next steps:
-- 1. Run content ingestion: pnpm ingest -- --planet <name> --directory <path>
-- 2. Test queries in the new system
-- 3. Remove old code that referenced oceans/seas/rivers/drops
--
-- Benefits achieved:
-- ✅ Arbitrary depth support (no 4-level limit)
-- ✅ Simpler schema (1 table instead of 4)
-- ✅ Faster queries (O(1) lookups via indexes)
-- ✅ No e-commerce vestiges (price field removed)
-- ✅ Flexible metadata via JSONB
-- ✅ Full-text search ready
-- ================================================================
