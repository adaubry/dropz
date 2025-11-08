-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
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
	CONSTRAINT "unique_slug_per_namespace" UNIQUE("planet_id","slug","namespace")
);
--> statement-breakpoint
CREATE TABLE "planets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "planets_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "oceans" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"planet_id" integer NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "seas" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"ocean_slug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "node_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_node_id" integer NOT NULL,
	"to_node_id" integer NOT NULL,
	"link_type" text DEFAULT 'reference',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_link" UNIQUE("from_node_id","to_node_id","link_type")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(100) NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "rivers" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sea_id" integer NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "drops" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price" numeric NOT NULL,
	"river_slug" text NOT NULL,
	"image_url" text
);
--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_planet_id_planets_id_fk" FOREIGN KEY ("planet_id") REFERENCES "public"."planets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oceans" ADD CONSTRAINT "oceans_planet_id_planets_id_fk" FOREIGN KEY ("planet_id") REFERENCES "public"."planets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seas" ADD CONSTRAINT "seas_ocean_slug_oceans_slug_fk" FOREIGN KEY ("ocean_slug") REFERENCES "public"."oceans"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_links" ADD CONSTRAINT "node_links_from_node_id_nodes_id_fk" FOREIGN KEY ("from_node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_links" ADD CONSTRAINT "node_links_to_node_id_nodes_id_fk" FOREIGN KEY ("to_node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rivers" ADD CONSTRAINT "rivers_sea_id_seas_id_fk" FOREIGN KEY ("sea_id") REFERENCES "public"."seas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drops" ADD CONSTRAINT "drops_river_slug_rivers_slug_fk" FOREIGN KEY ("river_slug") REFERENCES "public"."rivers"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "name_search_index" ON "drops" USING gin (to_tsvector('english'::regconfig, name) tsvector_ops);
*/