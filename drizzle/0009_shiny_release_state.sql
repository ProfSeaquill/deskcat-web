UPDATE "cosmetics"
SET "status" = 'published'
WHERE "status" <> 'retired'
  AND EXISTS (
    SELECT 1
    FROM "cosmetic_assets"
    WHERE "cosmetic_assets"."cosmetic_id" = "cosmetics"."id"
      AND "cosmetic_assets"."accessible" = true
  );
