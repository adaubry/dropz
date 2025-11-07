CREATE TABLE "drops" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price" numeric NOT NULL,
	"river_slug" text NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "oceans" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"planet_id" integer NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "planets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rivers" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sea_id" integer NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "seas" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"ocean_slug" text NOT NULL
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
ALTER TABLE "drops" ADD CONSTRAINT "drops_river_slug_rivers_slug_fk" FOREIGN KEY ("river_slug") REFERENCES "public"."rivers"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oceans" ADD CONSTRAINT "oceans_planet_id_planets_id_fk" FOREIGN KEY ("planet_id") REFERENCES "public"."planets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rivers" ADD CONSTRAINT "rivers_sea_id_seas_id_fk" FOREIGN KEY ("sea_id") REFERENCES "public"."seas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seas" ADD CONSTRAINT "seas_ocean_slug_oceans_slug_fk" FOREIGN KEY ("ocean_slug") REFERENCES "public"."oceans"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "name_search_index" ON "drops" USING gin (to_tsvector('english', "name"));--> statement-breakpoint
CREATE INDEX CONCURRENTLY "name_trgm_index" ON "drops" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "drops_river_slug_idx" ON "drops" USING btree ("river_slug");--> statement-breakpoint
CREATE INDEX "oceans_planet_id_idx" ON "oceans" USING btree ("planet_id");--> statement-breakpoint
CREATE INDEX "rivers_sea_id_idx" ON "rivers" USING btree ("sea_id");--> statement-breakpoint
CREATE INDEX "seas_ocean_slug_idx" ON "seas" USING btree ("ocean_slug");