import { pgTable, foreignKey, unique, serial, integer, text, jsonb, boolean, timestamp, varchar, index, numeric } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const nodes = pgTable("nodes", {
	id: serial().primaryKey().notNull(),
	planetId: integer("planet_id").notNull(),
	slug: text().notNull(),
	title: text().notNull(),
	namespace: text().default('').notNull(),
	depth: integer().notNull(),
	filePath: text("file_path").notNull(),
	type: text().notNull(),
	nodeType: text("node_type"),
	content: text(),
	parsedHtml: text("parsed_html"),
	metadata: jsonb(),
	order: integer().default(0),
	isIndex: boolean("is_index").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	fileModifiedAt: timestamp("file_modified_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.planetId],
			foreignColumns: [planets.id],
			name: "nodes_planet_id_planets_id_fk"
		}).onDelete("cascade"),
	unique("unique_slug_per_namespace").on(table.planetId, table.slug, table.namespace),
]);

export const planets = pgTable("planets", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("planets_slug_unique").on(table.slug),
]);

export const oceans = pgTable("oceans", {
	slug: text().primaryKey().notNull(),
	name: text().notNull(),
	planetId: integer("planet_id").notNull(),
	imageUrl: text("image_url"),
}, (table) => [
	foreignKey({
			columns: [table.planetId],
			foreignColumns: [planets.id],
			name: "oceans_planet_id_planets_id_fk"
		}).onDelete("cascade"),
]);

export const seas = pgTable("seas", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	oceanSlug: text("ocean_slug").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.oceanSlug],
			foreignColumns: [oceans.slug],
			name: "seas_ocean_slug_oceans_slug_fk"
		}).onDelete("cascade"),
]);

export const nodeLinks = pgTable("node_links", {
	id: serial().primaryKey().notNull(),
	fromNodeId: integer("from_node_id").notNull(),
	toNodeId: integer("to_node_id").notNull(),
	linkType: text("link_type").default('reference'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.fromNodeId],
			foreignColumns: [nodes.id],
			name: "node_links_from_node_id_nodes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.toNodeId],
			foreignColumns: [nodes.id],
			name: "node_links_to_node_id_nodes_id_fk"
		}).onDelete("cascade"),
	unique("unique_link").on(table.fromNodeId, table.toNodeId, table.linkType),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: varchar({ length: 100 }).notNull(),
	passwordHash: text("password_hash").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_username_unique").on(table.username),
]);

export const rivers = pgTable("rivers", {
	slug: text().primaryKey().notNull(),
	name: text().notNull(),
	seaId: integer("sea_id").notNull(),
	imageUrl: text("image_url"),
}, (table) => [
	foreignKey({
			columns: [table.seaId],
			foreignColumns: [seas.id],
			name: "rivers_sea_id_seas_id_fk"
		}).onDelete("cascade"),
]);

export const drops = pgTable("drops", {
	slug: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text().notNull(),
	price: numeric().notNull(),
	riverSlug: text("river_slug").notNull(),
	imageUrl: text("image_url"),
}, (table) => [
	index("name_search_index").using("gin", sql`to_tsvector('english'::regconfig, name)`),
	foreignKey({
			columns: [table.riverSlug],
			foreignColumns: [rivers.slug],
			name: "drops_river_slug_rivers_slug_fk"
		}).onDelete("cascade"),
]);
