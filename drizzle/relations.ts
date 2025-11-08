import { relations } from "drizzle-orm/relations";
import { planets, nodes, oceans, seas, nodeLinks, rivers, drops } from "./schema";

export const nodesRelations = relations(nodes, ({one, many}) => ({
	planet: one(planets, {
		fields: [nodes.planetId],
		references: [planets.id]
	}),
	nodeLinks_fromNodeId: many(nodeLinks, {
		relationName: "nodeLinks_fromNodeId_nodes_id"
	}),
	nodeLinks_toNodeId: many(nodeLinks, {
		relationName: "nodeLinks_toNodeId_nodes_id"
	}),
}));

export const planetsRelations = relations(planets, ({many}) => ({
	nodes: many(nodes),
	oceans: many(oceans),
}));

export const oceansRelations = relations(oceans, ({one, many}) => ({
	planet: one(planets, {
		fields: [oceans.planetId],
		references: [planets.id]
	}),
	seas: many(seas),
}));

export const seasRelations = relations(seas, ({one, many}) => ({
	ocean: one(oceans, {
		fields: [seas.oceanSlug],
		references: [oceans.slug]
	}),
	rivers: many(rivers),
}));

export const nodeLinksRelations = relations(nodeLinks, ({one}) => ({
	node_fromNodeId: one(nodes, {
		fields: [nodeLinks.fromNodeId],
		references: [nodes.id],
		relationName: "nodeLinks_fromNodeId_nodes_id"
	}),
	node_toNodeId: one(nodes, {
		fields: [nodeLinks.toNodeId],
		references: [nodes.id],
		relationName: "nodeLinks_toNodeId_nodes_id"
	}),
}));

export const riversRelations = relations(rivers, ({one, many}) => ({
	sea: one(seas, {
		fields: [rivers.seaId],
		references: [seas.id]
	}),
	drops: many(drops),
}));

export const dropsRelations = relations(drops, ({one}) => ({
	river: one(rivers, {
		fields: [drops.riverSlug],
		references: [rivers.slug]
	}),
}));