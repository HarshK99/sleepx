CREATE TABLE "sleep_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bed_time" timestamp with time zone NOT NULL,
	"wake_time" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
