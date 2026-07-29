import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const cosmeticCategoryEnum = pgEnum("cosmetic_category", [
  "head",
  "neck",
  "tail",
  "glasses"
]);

export const cosmeticStatusEnum = pgEnum("cosmetic_status", [
  "draft",
  "testing",
  "published",
  "retired"
]);

export const anchorSlotEnum = pgEnum("anchor_slot", ["eyes", "head", "neck", "tail"]);

export const poseIdEnum = pgEnum("pose_id", [
  "logo",
  "playing",
  "reading",
  "sleeping",
  "sitting",
  "walking"
]);

export const assetViewEnum = pgEnum("asset_view", ["front", "threeQuarter"]);

export const cosmeticAssetPurposeEnum = pgEnum("cosmetic_asset_purpose", [
  "preview",
  "render"
]);

export const cosmetics = pgTable(
  "cosmetics",
  {
    id: varchar("id", { length: 80 }).primaryKey(),
    label: text("label").notNull(),
    description: text("description").notNull().default(""),
    category: cosmeticCategoryEnum("category").notNull(),
    anchorSlot: anchorSlotEnum("anchor_slot").notNull(),
    status: cosmeticStatusEnum("status").notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("cosmetics_status_idx").on(table.status),
    index("cosmetics_category_idx").on(table.category)
  ]
);

export const cosmeticAssets = pgTable(
  "cosmetic_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cosmeticId: varchar("cosmetic_id", { length: 80 })
      .notNull()
      .references(() => cosmetics.id, { onDelete: "cascade" }),
    purpose: cosmeticAssetPurposeEnum("purpose").notNull(),
    assetView: assetViewEnum("asset_view"),
    poseId: poseIdEnum("pose_id"),
    storageKey: text("storage_key").notNull(),
    publicUrl: text("public_url").notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    checksum: text("checksum"),
    accessible: boolean("accessible").notNull().default(true),
    updatedByEmail: text("updated_by_email"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("cosmetic_assets_cosmetic_id_idx").on(table.cosmeticId),
    uniqueIndex("cosmetic_assets_variant_idx").on(
      table.cosmeticId,
      table.purpose,
      table.assetView,
      table.poseId
    )
  ]
);

export const featureFlags = pgTable("feature_flags", {
  id: varchar("id", { length: 80 }).primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  description: text("description").notNull().default(""),
  updatedByEmail: text("updated_by_email"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const donationSettings = pgTable("donation_settings", {
  id: varchar("id", { length: 80 }).primaryKey(),
  title: text("title").notNull(),
  actionLabel: text("action_label").notNull(),
  currencyCode: varchar("currency_code", { length: 3 }).notNull().default("USD"),
  goalAmount: integer("goal_amount").notNull(),
  currentAmount: integer("current_amount").notNull(),
  currentAmountCents: integer("current_amount_cents").notNull().default(0),
  rewards: jsonb("rewards")
    .$type<
      {
        label: string;
        amount: number;
        highlight?: boolean;
        cosmeticId?: string;
      }[]
    >()
    .notNull()
    .default([]),
  updatedByEmail: text("updated_by_email"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const donationPayments = pgTable(
  "donation_payments",
  {
    checkoutSessionId: varchar("checkout_session_id", { length: 255 }).primaryKey(),
    paymentIntentId: varchar("payment_intent_id", { length: 255 }),
    stripeEventId: varchar("stripe_event_id", { length: 255 }),
    amountCents: integer("amount_cents").notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("donation_payments_payment_intent_idx").on(table.paymentIntentId),
    uniqueIndex("donation_payments_stripe_event_idx").on(table.stripeEventId),
    index("donation_payments_received_at_idx").on(table.receivedAt)
  ]
);

export const cosmeticPosePlacements = pgTable(
  "cosmetic_pose_placements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cosmeticId: varchar("cosmetic_id", { length: 80 })
      .notNull()
      .references(() => cosmetics.id, { onDelete: "cascade" }),
    poseId: poseIdEnum("pose_id").notNull(),
    x: doublePrecision("x").notNull(),
    y: doublePrecision("y").notNull(),
    width: doublePrecision("width").notNull(),
    height: doublePrecision("height"),
    rotation: doublePrecision("rotation").notNull().default(0),
    zIndex: integer("z_index").notNull().default(0),
    assetView: assetViewEnum("asset_view").notNull().default("front"),
    flipX: boolean("flip_x").notNull().default(false),
    visible: boolean("visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("cosmetic_pose_placements_cosmetic_pose_idx").on(table.cosmeticId, table.poseId),
    index("cosmetic_pose_placements_pose_id_idx").on(table.poseId)
  ]
);

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorEmail: text("actor_email").notNull(),
    action: varchar("action", { length: 120 }).notNull(),
    targetType: varchar("target_type", { length: 80 }).notNull(),
    targetId: text("target_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("admin_audit_logs_actor_email_idx").on(table.actorEmail),
    index("admin_audit_logs_target_idx").on(table.targetType, table.targetId),
    index("admin_audit_logs_created_at_idx").on(table.createdAt)
  ]
);

export type Cosmetic = typeof cosmetics.$inferSelect;
export type NewCosmetic = typeof cosmetics.$inferInsert;
export type CosmeticAsset = typeof cosmeticAssets.$inferSelect;
export type NewCosmeticAsset = typeof cosmeticAssets.$inferInsert;
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;
export type DonationSettings = typeof donationSettings.$inferSelect;
export type NewDonationSettings = typeof donationSettings.$inferInsert;
export type DonationPayment = typeof donationPayments.$inferSelect;
export type NewDonationPayment = typeof donationPayments.$inferInsert;
export type CosmeticPosePlacement = typeof cosmeticPosePlacements.$inferSelect;
export type NewCosmeticPosePlacement = typeof cosmeticPosePlacements.$inferInsert;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLogs.$inferInsert;
