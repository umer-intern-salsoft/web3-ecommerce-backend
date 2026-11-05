-- Convert existing ETH-denominated prices using the ETH/USD spot rate
-- captured when this migration was prepared: 1 ETH = 2292.84 USD.
ALTER TABLE "Product" RENAME COLUMN "priceEth" TO "priceUsd";

UPDATE "Product"
SET "priceUsd" = ROUND(("priceUsd" * 2292.84)::numeric, 2)::double precision;

ALTER TABLE "Order"
ADD COLUMN "totalUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "ethUsdRate" DOUBLE PRECISION NOT NULL DEFAULT 2292.84;

UPDATE "Order"
SET "totalUsd" = ROUND(("totalEth" * 2292.84)::numeric, 2)::double precision;

ALTER TABLE "Order"
ALTER COLUMN "totalUsd" DROP DEFAULT,
ALTER COLUMN "ethUsdRate" DROP DEFAULT;
