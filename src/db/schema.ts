import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// UNIFIED NODES SYSTEM - Namespace-based Hierarchy
// Supports arbitrary depth: Planet → [Any Levels] → Drop
// ============================================

/**
 * Planets: Top-level workspaces/sites (Level 0)
 * Examples: "Documentation Site", "Course Materials", "Knowledge Base"
 */
export const planets = pgTable("planets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export type Planet = typeof planets.$inferSelect;
export type NewPlanet = typeof planets.$inferInsert;

/**
 * Unified Nodes Table: Stores all content hierarchy levels + files
 * Namespace-based storage allows arbitrary depth without parent_id chains
 *
 * Key Innovation: Flat storage with namespace paths
 * Examples:
 * - /intro.md → namespace: "", depth: 0, slug: "intro"
 * - /guides/setup.md → namespace: "guides", depth: 1, slug: "setup"
 * - /courses/cs101/w1/d1/lecture.md → namespace: "courses/cs101/w1/d1", depth: 4, slug: "lecture"
 * - /a/b/c/d/e/f/g/deep.md → namespace: "a/b/c/d/e/f/g", depth: 7, slug: "deep"
 *
 * Query Performance: O(1) lookups via indexed (planet_id, namespace, slug)
 * No recursive CTEs needed! No parent_id joins! No depth limitations!
 */
export const nodes = pgTable(
  "nodes",
  {
    id: serial("id").primaryKey(),

    // Ownership
    planet_id: integer("planet_id")
      .notNull()
      .references(() => planets.id, { onDelete: "cascade" }),

    // Identity
    slug: text("slug").notNull(),
    title: text("title").notNull(),

    // Hierarchy (Logseq-style flat storage)
    namespace: text("namespace").notNull().default(""), // "ocean/sea/river"
    depth: integer("depth").notNull(), // 0=ocean, 1=sea, 2=river, 3=drop
    file_path: text("file_path").notNull(), // original filesystem path

    // Type discrimination
    type: text("type").notNull(), // 'folder' | 'file'
    node_type: text("node_type"), // 'ocean' | 'sea' | 'river' | 'drop'

    // Content (for drops/files only)
    content: text("content"), // raw markdown
    parsed_html: text("parsed_html"), // cached rendered HTML

    // Metadata from frontmatter or auto-generated
    metadata: jsonb("metadata").$type<{
      cover?: string;
      summary?: string;
      tags?: string[];
      date?: string;
      author?: string;
      sidebar_position?: number;
      [key: string]: any;
    }>(),

    // Display
    order: integer("order").default(0),
    is_index: boolean("is_index").default(false), // is this folder's index page?

    // Timestamps
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    file_modified_at: timestamp("file_modified_at"),
  },
  (table) => ({
    // Core indexes
    planetIdIdx: index("nodes_planet_id_idx").on(table.planet_id),
    namespaceIdx: index("nodes_namespace_idx").on(table.namespace),
    depthIdx: index("nodes_depth_idx").on(table.depth),
    typeIdx: index("nodes_type_idx").on(table.type),
    slugIdx: index("nodes_slug_idx").on(table.slug),
    filePathIdx: index("nodes_file_path_idx").on(table.file_path),

    // Composite indexes for common queries
    planetNamespaceIdx: index("nodes_planet_namespace_idx").on(
      table.planet_id,
      table.namespace
    ),
    namespaceTypeIdx: index("nodes_namespace_type_idx").on(
      table.namespace,
      table.type
    ),

    // Full-text search on content
    contentSearchIdx: index("nodes_content_search_idx").using(
      "gin",
      sql`to_tsvector('english', COALESCE(${table.content}, ''))`
    ),

    // Search on title
    titleSearchIdx: index("nodes_title_search_idx").using(
      "gin",
      sql`to_tsvector('english', ${table.title})`
    ),

    // Unique constraint: slug must be unique within namespace per planet
    uniqueSlugPerNamespace: unique("unique_slug_per_namespace").on(
      table.planet_id,
      table.namespace,
      table.slug
    ),
  })
);

export type Node = typeof nodes.$inferSelect;
export type NewNode = typeof nodes.$inferInsert;

/**
 * Node Links: Bidirectional connections between nodes
 * For "related content", "see also", backlinks, etc.
 */
export const nodeLinks = pgTable(
  "node_links",
  {
    id: serial("id").primaryKey(),
    from_node_id: integer("from_node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    to_node_id: integer("to_node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    link_type: text("link_type").default("reference"), // 'reference' | 'related' | 'parent' | 'embed'
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    fromNodeIdx: index("node_links_from_idx").on(table.from_node_id),
    toNodeIdx: index("node_links_to_idx").on(table.to_node_id),
    uniqueLink: unique("unique_link").on(
      table.from_node_id,
      table.to_node_id,
      table.link_type
    ),
  })
);

export type NodeLink = typeof nodeLinks.$inferSelect;
export type NewNodeLink = typeof nodeLinks.$inferInsert;

// ============================================
// USERS
// ============================================

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ============================================
// RELATIONS
// ============================================

/**
 * Planet Relations
 * A planet contains many nodes (folders and files)
 */
export const planetsRelations = relations(planets, ({ many }) => ({
  nodes: many(nodes),
}));

/**
 * Node Relations
 * Each node belongs to a planet and can have bidirectional links to other nodes
 */
export const nodesRelations = relations(nodes, ({ one, many }) => ({
  planet: one(planets, {
    fields: [nodes.planet_id],
    references: [planets.id],
  }),
  linksFrom: many(nodeLinks, { relationName: "from" }),
  linksTo: many(nodeLinks, { relationName: "to" }),
}));

/**
 * Node Links Relations
 * Bidirectional connections between nodes for "related content", "see also", backlinks, etc.
 */
export const nodeLinksRelations = relations(nodeLinks, ({ one }) => ({
  fromNode: one(nodes, {
    fields: [nodeLinks.from_node_id],
    references: [nodes.id],
    relationName: "from",
  }),
  toNode: one(nodes, {
    fields: [nodeLinks.to_node_id],
    references: [nodes.id],
    relationName: "to",
  }),
}));
