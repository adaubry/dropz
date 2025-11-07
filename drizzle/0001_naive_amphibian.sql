CREATE TABLE "node_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_node_id" integer NOT NULL,
	"to_node_id" integer NOT NULL,
	"link_type" text DEFAULT 'reference',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_link" UNIQUE("from_node_id","to_node_id","link_type")
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"planet_id" integer NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"namespace" text DEFAULT '' NOT NULL,
	"depth" integer NOT NULL,
	"file_path" text NOT NULL,
	"type" text NOT NULL,
	"node_type" text,
	"content" text,
	"parsed_html" text,
	"metadata" jsonb,
	"order" integer DEFAULT 0,
	"is_index" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"file_modified_at" timestamp,
	CONSTRAINT "unique_slug_per_namespace" UNIQUE("planet_id","namespace","slug")
);
--> statement-breakpoint
ALTER TABLE "planets" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "planets" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "planets" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "node_links" ADD CONSTRAINT "node_links_from_node_id_nodes_id_fk" FOREIGN KEY ("from_node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_links" ADD CONSTRAINT "node_links_to_node_id_nodes_id_fk" FOREIGN KEY ("to_node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_planet_id_planets_id_fk" FOREIGN KEY ("planet_id") REFERENCES "public"."planets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "node_links_from_idx" ON "node_links" USING btree ("from_node_id");--> statement-breakpoint
CREATE INDEX "node_links_to_idx" ON "node_links" USING btree ("to_node_id");--> statement-breakpoint
CREATE INDEX "nodes_planet_id_idx" ON "nodes" USING btree ("planet_id");--> statement-breakpoint
CREATE INDEX "nodes_namespace_idx" ON "nodes" USING btree ("namespace");--> statement-breakpoint
CREATE INDEX "nodes_depth_idx" ON "nodes" USING btree ("depth");--> statement-breakpoint
CREATE INDEX "nodes_type_idx" ON "nodes" USING btree ("type");--> statement-breakpoint
CREATE INDEX "nodes_slug_idx" ON "nodes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "nodes_file_path_idx" ON "nodes" USING btree ("file_path");--> statement-breakpoint
CREATE INDEX "nodes_planet_namespace_idx" ON "nodes" USING btree ("planet_id","namespace");--> statement-breakpoint
CREATE INDEX "nodes_namespace_type_idx" ON "nodes" USING btree ("namespace","type");--> statement-breakpoint
CREATE INDEX "nodes_content_search_idx" ON "nodes" USING gin (to_tsvector('english', COALESCE("content", '')));--> statement-breakpoint
CREATE INDEX "nodes_title_search_idx" ON "nodes" USING gin (to_tsvector('english', "title"));--> statement-breakpoint
ALTER TABLE "planets" ADD CONSTRAINT "planets_slug_unique" UNIQUE("slug");