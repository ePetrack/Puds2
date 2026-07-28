CREATE TYPE "public"."meter_ownership" AS ENUM('utility', 'client', 'unknown');--> statement-breakpoint
ALTER TABLE "meters" ADD COLUMN "ownership" "meter_ownership" DEFAULT 'unknown' NOT NULL;--> statement-breakpoint

-- Backfill only the half of the old heuristic the data actually supports.
--
-- `/connections` used to derive ownership from `account_id`: an account meant the utility's
-- revenue meter, no account meant the client's own. The first half is strong evidence — the
-- utility bills through that meter — so those rows are recorded as `utility`. The second
-- half is not evidence at all; "no account linked" is equally consistent with a utility
-- meter nobody has attached yet. Backfilling those as `client` would promote a guess to a
-- recorded fact, which is the whole reason this column exists.
--
-- They stay `unknown`, which is true, and surfaces on `/connections` as ownership still to
-- be recorded rather than as a silent assumption.
UPDATE "meters" SET "ownership" = 'utility' WHERE "account_id" IS NOT NULL;
