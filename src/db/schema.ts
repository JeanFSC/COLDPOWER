import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "customer"]);
export const appRoleEnum = pgEnum("app_role", [
  "SUPERADMIN",
  "GERENCIA",
  "OPERACIONES_VENTAS",
  "JEFATURA",
  "ADMIN",
  "VENTAS",
  "ALMACEN",
  "COMPRAS",
  "REPORTES",
]);
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "INACTIVE", "SUSPENDED"]);
export const publicationStatusEnum = pgEnum("publication_status", [
  "draft",
  "review",
  "published",
  "hidden",
  "archived",
]);
export const availabilityStatusEnum = pgEnum("availability_status", [
  "unknown",
  "in_stock",
  "low_stock",
  "out_of_stock",
  "on_request",
]);
export const duplicateDecisionEnum = pgEnum("duplicate_decision", [
  "pending",
  "different",
  "confirmed",
  "keep_both",
]);
export const locationTypeEnum = pgEnum("location_type", ["STORE", "WAREHOUSE", "STORE_WAREHOUSE"]);
export const inventoryMovementTypeEnum = pgEnum("inventory_movement_type", [
  "OPENING_BALANCE",
  "PURCHASE_RECEIPT",
  "SALE",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "RETURN_IN",
  "RETURN_OUT",
  "RESERVATION",
  "RESERVATION_RELEASE",
]);
export const transferStatusEnum = pgEnum("transfer_status", [
  "DRAFT",
  "REQUESTED",
  "IN_TRANSIT",
  "RECEIVED",
  "CANCELLED",
]);
export const reservationStatusEnum = pgEnum("reservation_status", [
  "ACTIVE",
  "RELEASED",
  "CONSUMED",
  "CANCELLED",
  "EXPIRED",
]);
export const mediaKindEnum = pgEnum("media_kind", ["IMAGE"]);
export const mediaStatusEnum = pgEnum("media_status", ["ACTIVE", "ARCHIVED"]);
export const cmsPageStatusEnum = pgEnum("cms_page_status", [
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
]);
export const cmsContentTypeEnum = pgEnum("cms_content_type", [
  "PAGE",
  "BANNER",
  "LANDING",
  "BLOCK",
]);
export const cmsBlockTypeEnum = pgEnum("cms_block_type", [
  "hero",
  "banner",
  "text",
  "contact",
  "links",
  "promo",
]);
export const cmsBlockStatusEnum = pgEnum("cms_block_status", [
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
]);
export const priceTypeEnum = pgEnum("price_type", [
  "COST",
  "RETAIL",
  "WHOLESALE",
  "MINIMUM",
  "SPECIAL",
]);
export const integrationConnectionStatusEnum = pgEnum("integration_connection_status", [
  "CONNECTED",
  "TESTING",
  "DISCONNECTED",
  "NOT_CONFIGURED",
]);
export const discountRuleStatusEnum = pgEnum("discount_rule_status", ["ACTIVE", "INACTIVE"]);
export const quoteStatusEnum = pgEnum("quote_status", [
  "borrador",
  "enviada",
  "evaluacion",
  "requiere_info",
  "cotizada",
  "aprobada",
  "convertida",
  "cerrada",
  "nuevo",
  "contactado",
  "cerrado",
]);
export const quoteTaxModeEnum = pgEnum("quote_tax_mode", ["INCLUDED", "EXCLUDED", "UNCONFIGURED"]);
export const quoteVersionStatusEnum = pgEnum("quote_version_status", [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "SUPERSEDED",
]);
export const quoteDiscountApprovalStatusEnum = pgEnum("quote_discount_approval_status", [
  "NOT_REQUIRED",
  "PENDING",
  "APPROVED",
  "REJECTED",
]);
export type QuoteStatus = (typeof quoteStatusEnum.enumValues)[number];

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({ slugUnique: uniqueIndex("categories_slug_unique").on(table.slug) }),
);
export const families = pgTable(
  "families",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    categoryNameUnique: uniqueIndex("families_category_name_unique").on(
      table.categoryId,
      table.name,
    ),
    slugUnique: uniqueIndex("families_slug_unique").on(table.slug),
    categoryIndex: index("families_category_id_idx").on(table.categoryId),
  }),
);
export const brands = pgTable(
  "brands",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex("brands_slug_unique").on(table.slug),
    nameUnique: uniqueIndex("brands_name_unique").on(table.name),
  }),
);

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    sku: text("sku").notNull(),
    slug: text("slug").notNull(),
    originalName: text("original_name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    commercialName: text("commercial_name"),
    featured: boolean("featured").notNull().default(false),
    productType: text("product_type").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "restrict" }),
    brandId: text("brand_id").references(() => brands.id, { onDelete: "set null" }),
    editorialCategoryId: text("editorial_category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    editorialFamilyId: text("editorial_family_id").references(() => families.id, {
      onDelete: "set null",
    }),
    editorialBrandId: text("editorial_brand_id").references(() => brands.id, {
      onDelete: "set null",
    }),
    compatibilityBrands: text("compatibility_brands").array(),
    modelCode: text("model_code"),
    application: text("application"),
    voltage: text("voltage"),
    power: text("power"),
    frequency: text("frequency"),
    rpm: text("rpm"),
    amperage: text("amperage"),
    capacitance: text("capacitance"),
    refrigerant: text("refrigerant"),
    horsepower: text("horsepower"),
    temperature: text("temperature"),
    dimensions: text("dimensions"),
    length: text("length"),
    connectionSize: text("connection_size"),
    unitOfMeasure: text("unit_of_measure"),
    status: text("status").notNull(),
    publicationStatus: publicationStatusEnum("publication_status").notNull().default("review"),
    availabilityStatus: availabilityStatusEnum("availability_status").notNull().default("unknown"),
    editorialDescription: text("editorial_description"),
    publicationChangedAt: timestamp("publication_changed_at", { withTimezone: true }),
    publicationChangedBy: text("publication_changed_by"),
    publicationNote: text("publication_note"),
    taxType: text("tax_type"),
    originalReferenceCode: text("original_reference_code"),
    barcode: text("barcode"),
    originalWeight: text("original_weight"),
    requiresReview: boolean("requires_review"),
    reviewReason: text("review_reason"),
    possibleDuplicate: boolean("possible_duplicate"),
    duplicateGroup: text("duplicate_group"),
    duplicateDecision: duplicateDecisionEnum("duplicate_decision").notNull().default("pending"),
    canonicalProductId: text("canonical_product_id"),
    normalizationConfidence: text("normalization_confidence"),
    normalizationMethod: text("normalization_method"),
    sourcePage: integer("source_page"),
    sourceRow: integer("source_row"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    skuUnique: uniqueIndex("products_sku_unique").on(table.sku),
    slugUnique: uniqueIndex("products_slug_unique").on(table.slug),
    categoryIndex: index("products_category_id_idx").on(table.categoryId),
    familyIndex: index("products_family_id_idx").on(table.familyId),
    brandIndex: index("products_brand_id_idx").on(table.brandId),
    statusIndex: index("products_status_idx").on(table.status),
    publicationStatusIndex: index("products_publication_status_idx").on(table.publicationStatus),
    duplicateGroupIndex: index("products_duplicate_group_idx").on(table.duplicateGroup),
    featuredIndex: index("products_featured_idx").on(table.featured),
    sourceIndex: index("products_source_page_row_idx").on(table.sourcePage, table.sourceRow),
    editorialTaxonomyIndex: index("products_editorial_taxonomy_idx").on(
      table.editorialCategoryId,
      table.editorialFamilyId,
      table.editorialBrandId,
    ),
    reviewConfidenceIndex: index("products_review_confidence_idx").on(
      table.requiresReview,
      table.normalizationConfidence,
    ),
  }),
);

export const productRelations = pgTable(
  "product_relations",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    relatedProductId: text("related_product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    relationType: text("relation_type").notNull().default("related"),
    validated: boolean("validated").notNull().default(false),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pairUnique: uniqueIndex("product_relations_pair_unique").on(
      table.productId,
      table.relatedProductId,
      table.relationType,
    ),
  }),
);
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name"),
    phone: text("phone"),
    role: userRoleEnum("role").notNull().default("customer"),
    roleCode: appRoleEnum("role_code"),
    status: userStatusEnum("status").notNull().default("ACTIVE"),
    lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }),
    lastRoleChangedAt: timestamp("last_role_changed_at", { withTimezone: true }),
    clerkSyncStatus: text("clerk_sync_status").notNull().default("SYNCED"),
    clerkSyncError: text("clerk_sync_error"),
    clerkSyncedAt: timestamp("clerk_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIndex: index("users_status_idx").on(table.status),
    roleIndex: index("users_role_idx").on(table.roleCode, table.role),
  }),
);
export const clerkWebhookEvents = pgTable(
  "clerk_webhook_events",
  {
    id: text("id").primaryKey(),
    eventType: text("event_type").notNull(),
    status: text("status").notNull().default("PENDING"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    error: text("error"),
  },
  (table) => ({
    statusIndex: index("clerk_webhook_events_status_idx").on(table.status),
    receivedIndex: index("clerk_webhook_events_received_idx").on(table.receivedAt),
  }),
);
export const companySettings = pgTable(
  "company_settings",
  {
    id: text("id").primaryKey(),
    legalName: text("legal_name"),
    commercialName: text("commercial_name"),
    tradeName: text("trade_name"),
    ruc: text("ruc"),
    country: text("country"),
    department: text("department"),
    province: text("province"),
    district: text("district"),
    address: text("address"),
    phones: text("phones").array(),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    email: text("email"),
    salesEmail: text("sales_email"),
    hours: text("hours"),
    businessHours: text("business_hours"),
    facebook: text("facebook"),
    instagram: text("instagram"),
    tiktok: text("tiktok"),
    website: text("website"),
    socials: jsonb("socials").$type<Record<string, string>>(),
    locations: jsonb("locations").$type<Array<{ name: string; address?: string }>>(),
    paymentMethods: text("payment_methods").array(),
    guaranteeTerms: text("guarantee_terms"),
    coverage: text("coverage"),
    legalLinks: jsonb("legal_links").$type<Record<string, string>>(),
    logoMediaId: text("logo_media_id"),
    faviconMediaId: text("favicon_media_id"),
    primaryColor: text("primary_color"),
    secondaryColor: text("secondary_color"),
    version: integer("version").notNull().default(1),
    validationStatus: text("validation_status").notNull().default("VALID"),
    updatedBy: text("updated_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    validationIndex: index("company_settings_validation_idx").on(table.validationStatus),
  }),
);

export const documentSeries = pgTable(
  "document_series",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    label: text("label").notNull(),
    documentType: text("document_type").notNull(),
    prefix: text("prefix").notNull(),
    nextNumber: integer("next_number").notNull().default(1),
    padding: integer("padding").notNull().default(6),
    active: boolean("active").notNull().default(true),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeUnique: uniqueIndex("document_series_code_unique").on(table.code),
    activeIndex: index("document_series_active_idx").on(table.active),
  }),
);

export const integrationConnections = pgTable(
  "integration_connections",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    lastCheckedStatus: integrationConnectionStatusEnum("last_checked_status")
      .notNull()
      .default("NOT_CONFIGURED"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    lastCheckedMessage: text("last_checked_message"),
    lastCheckedBy: text("last_checked_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({ keyUnique: uniqueIndex("integration_connections_key_unique").on(table.key) }),
);
export const companySettingsHistory = pgTable(
  "company_settings_history",
  {
    id: text("id").primaryKey(),
    settingsId: text("settings_id").notNull(),
    version: integer("version").notNull(),
    actorId: text("actor_id"),
    actorRole: text("actor_role"),
    before: jsonb("before").$type<Record<string, unknown> | null>(),
    after: jsonb("after").$type<Record<string, unknown>>().notNull(),
    validationStatus: text("validation_status").notNull().default("VALID"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    settingsVersionUnique: uniqueIndex("company_settings_history_version_unique").on(
      table.settingsId,
      table.version,
    ),
    settingsCreatedIndex: index("company_settings_history_created_idx").on(
      table.settingsId,
      table.createdAt,
    ),
  }),
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: text("id").primaryKey(),
    storageKey: text("storage_key").notNull().unique(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width"),
    height: integer("height"),
    altText: text("alt_text"),
    contentHash: text("content_hash"),
    publicUrl: text("public_url"),
    kind: mediaKindEnum("kind").notNull().default("IMAGE"),
    status: mediaStatusEnum("status").notNull().default("ACTIVE"),
    uploadedBy: text("uploaded_by"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIndex: index("media_assets_status_idx").on(table.status),
    createdIndex: index("media_assets_created_at_idx").on(table.createdAt),
    hashIndex: index("media_assets_hash_idx").on(table.contentHash),
  }),
);
export const mediaAssetUsages = pgTable(
  "media_asset_usages",
  {
    id: text("id").primaryKey(),
    assetId: text("asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    slot: text("slot").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    usageUnique: uniqueIndex("media_asset_usages_unique").on(
      table.assetId,
      table.entityType,
      table.entityId,
      table.slot,
    ),
    entityIndex: index("media_asset_usages_entity_idx").on(table.entityType, table.entityId),
    entitySlotIndex: index("media_usages_entity_slot_idx").on(
      table.entityType,
      table.entityId,
      table.slot,
      table.sortOrder,
    ),
  }),
);
export const cmsPages = pgTable(
  "cms_pages",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    contentType: cmsContentTypeEnum("content_type").notNull().default("PAGE"),
    status: cmsPageStatusEnum("status").notNull().default("DRAFT"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIndex: index("cms_pages_status_idx").on(table.status),
    scheduleIndex: index("cms_pages_schedule_idx").on(table.status, table.scheduledAt),
  }),
);
export const cmsBlocks = pgTable(
  "cms_blocks",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id")
      .notNull()
      .references(() => cmsPages.id, { onDelete: "cascade" }),
    blockKey: text("block_key").notNull(),
    type: cmsBlockTypeEnum("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    sortOrder: integer("sort_order").notNull(),
    status: cmsBlockStatusEnum("status").notNull().default("DRAFT"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pageKeyUnique: uniqueIndex("cms_blocks_page_key_unique").on(table.pageId, table.blockKey),
    pageOrderUnique: uniqueIndex("cms_blocks_page_order_unique").on(table.pageId, table.sortOrder),
    pageIndex: index("cms_blocks_page_idx").on(table.pageId, table.status),
  }),
);
export const cmsSections = pgTable(
  "cms_sections",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id")
      .notNull()
      .references(() => cmsPages.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    title: text("title"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: cmsBlockStatusEnum("status").notNull().default("DRAFT"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pageKeyUnique: uniqueIndex("cms_sections_page_key_unique").on(table.pageId, table.key),
    pageOrderIndex: index("cms_sections_page_order_idx").on(table.pageId, table.sortOrder),
  }),
);
export const cmsPageRevisions = pgTable(
  "cms_page_revisions",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id")
      .notNull()
      .references(() => cmsPages.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    title: text("title").notNull(),
    payload: jsonb("payload").$type<{ blocks: Array<Record<string, unknown>> }>().notNull(),
    status: cmsPageStatusEnum("status").notNull(),
    summary: text("summary").notNull(),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pageVersionUnique: uniqueIndex("cms_page_revisions_page_version_unique").on(
      table.pageId,
      table.version,
    ),
    pageCreatedIndex: index("cms_page_revisions_page_created_idx").on(
      table.pageId,
      table.createdAt,
    ),
  }),
);
export const cmsEntries = pgTable(
  "cms_entries",
  {
    id: text("id").primaryKey(),
    sectionId: text("section_id")
      .notNull()
      .references(() => cmsSections.id, { onDelete: "cascade" }),
    entryKey: text("entry_key").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: cmsBlockStatusEnum("status").notNull().default("DRAFT"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedBy: text("published_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sectionKeyUnique: uniqueIndex("cms_entries_section_key_unique").on(
      table.sectionId,
      table.entryKey,
    ),
    statusIndex: index("cms_entries_status_idx").on(table.status),
  }),
);
export const cmsRevisions = pgTable(
  "cms_revisions",
  {
    id: text("id").primaryKey(),
    entryId: text("entry_id")
      .notNull()
      .references(() => cmsEntries.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: cmsBlockStatusEnum("status").notNull(),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    entryVersionUnique: uniqueIndex("cms_revisions_entry_version_unique").on(
      table.entryId,
      table.version,
    ),
    entryIndex: index("cms_revisions_entry_idx").on(table.entryId, table.createdAt),
  }),
);

export const productPrices = pgTable(
  "product_prices",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    priceType: priceTypeEnum("price_type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    wholesaleMinQty: integer("wholesale_min_qty"),
    minimumAllowed: numeric("minimum_allowed", { precision: 12, scale: 2 }),
    currency: varchar("currency", { length: 3 }).notNull().default("PEN"),
    status: text("status").notNull().default("ACTIVE"),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    idempotencyKey: text("idempotency_key"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productTypeActiveIndex: index("product_prices_product_type_active_idx").on(
      table.productId,
      table.priceType,
      table.active,
    ),
    validWindowIndex: index("product_prices_valid_window_idx").on(
      table.validFrom,
      table.validUntil,
    ),
    idempotencyUnique: uniqueIndex("product_prices_idempotency_unique").on(table.idempotencyKey),
  }),
);
export const priceHistory = pgTable(
  "price_history",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    priceId: text("price_id").references(() => productPrices.id, { onDelete: "set null" }),
    priceType: priceTypeEnum("price_type").notNull(),
    previousAmount: numeric("previous_amount", { precision: 12, scale: 2 }),
    newAmount: numeric("new_amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    reason: text("reason"),
    changedBy: text("changed_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productCreatedIndex: index("price_history_product_created_idx").on(
      table.productId,
      table.createdAt,
    ),
    actorTypeIndex: index("price_history_actor_type_idx").on(
      table.changedBy,
      table.priceType,
      table.createdAt,
    ),
  }),
);
export const discountRules = pgTable(
  "discount_rules",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    maxPercentage: numeric("max_percentage", { precision: 5, scale: 2 }).notNull(),
    approvalAbovePercentage: numeric("approval_above_percentage", {
      precision: 5,
      scale: 2,
    }).notNull(),
    status: discountRuleStatusEnum("status").notNull().default("ACTIVE"),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIndex: index("discount_rules_status_idx").on(table.status),
    validityIndex: index("discount_rules_validity_idx").on(table.validFrom, table.validUntil),
    nameUnique: uniqueIndex("discount_rules_name_unique").on(table.name),
  }),
);

export const quotes = pgTable(
  "quotes",
  {
    id: text("id").primaryKey(),
    trackingCode: text("tracking_code").notNull().unique(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    customerType: text("customer_type").notNull().default("natural"),
    documentNumber: text("document_number").notNull().default(""),
    phone: text("phone").notNull(),
    email: text("email"),
    department: text("department").notNull().default(""),
    province: text("province").notNull().default(""),
    district: text("district").notNull().default(""),
    preferredContact: text("preferred_contact").notNull().default("whatsapp"),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    productSlug: text("product_slug"),
    productName: text("product_name"),
    sku: text("sku"),
    message: text("message").notNull(),
    status: quoteStatusEnum("status").notNull().default("enviada"),
    workflowStatus: text("workflow_status").notNull().default("DRAFT"),
    currentVersionNumber: integer("current_version_number").notNull().default(0),
    revision: integer("revision").notNull().default(0),
    acceptedVersionId: text("accepted_version_id"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedBy: text("accepted_by"),
    assignedSellerId: text("assigned_seller_id").references(() => users.id, {
      onDelete: "set null",
    }),
    origin: text("origin").notNull().default("WEB"),
    currency: varchar("currency", { length: 3 }),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 }),
    discountAmount: numeric("discount_amount", { precision: 14, scale: 2 }),
    taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }),
    total: numeric("total", { precision: 14, scale: 2 }),
    taxMode: quoteTaxModeEnum("tax_mode").notNull().default("UNCONFIGURED"),
    discountApprovalStatus: quoteDiscountApprovalStatusEnum("discount_approval_status")
      .notNull()
      .default("NOT_REQUIRED"),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    sentBy: text("sent_by"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    respondedBy: text("responded_by"),
    responseChannel: text("response_channel"),
    responseNote: text("response_note"),
    acceptanceNote: text("acceptance_note"),
    rejectionReasonCode: text("rejection_reason_code"),
    rejectionReason: text("rejection_reason"),
    cancellationReason: text("cancellation_reason"),
    cancelledBy: text("cancelled_by"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    clientIp: text("client_ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    createdAtIndex: index("quotes_created_at_idx").on(table.createdAt),
    workflowStatusIndex: index("quotes_workflow_status_idx").on(table.workflowStatus),
    validUntilIndex: index("quotes_valid_until_idx").on(table.validUntil),
    assignedSellerIndex: index("quotes_assigned_seller_idx").on(table.assignedSellerId),
    acceptedVersionIndex: index("quotes_accepted_version_idx").on(table.acceptedVersionId),
    originIndex: index("quotes_origin_idx").on(table.origin),
  }),
);
export const quoteItems = pgTable(
  "quote_items",
  {
    id: text("id").primaryKey(),
    quoteId: text("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    skuSnapshot: text("sku_snapshot").notNull(),
    productNameSnapshot: text("product_name_snapshot").notNull(),
    quantity: integer("quantity").notNull(),
    baseUnitPrice: numeric("base_unit_price", { precision: 14, scale: 2 }),
    discountPercentage: numeric("discount_percentage", { precision: 5, scale: 2 }),
    discountAmount: numeric("discount_amount", { precision: 14, scale: 2 }),
    finalUnitPrice: numeric("final_unit_price", { precision: 14, scale: 2 }),
    lineTotal: numeric("line_total", { precision: 14, scale: 2 }),
    currency: varchar("currency", { length: 3 }),
    priceType: text("price_type"),
    priceSourceId: text("price_source_id"),
    priceReason: text("price_reason"),
    discountStatus: quoteDiscountApprovalStatusEnum("discount_status")
      .notNull()
      .default("NOT_REQUIRED"),
    discountReason: text("discount_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    quoteProductUnique: uniqueIndex("quote_items_quote_product_unique").on(
      table.quoteId,
      table.productId,
    ),
    quoteIndex: index("quote_items_quote_id_idx").on(table.quoteId),
    productIndex: index("quote_items_product_id_idx").on(table.productId),
    currencyIndex: index("quote_items_currency_idx").on(table.currency),
  }),
);
export const quoteStatusHistory = pgTable("quote_status_history", {
  id: text("id").primaryKey(),
  quoteId: text("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  fromStatus: text("from_status"),
  toStatus: quoteStatusEnum("to_status").notNull(),
  changedBy: text("changed_by").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const quoteVersions = pgTable(
  "quote_versions",
  {
    id: text("id").primaryKey(),
    quoteId: text("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    status: quoteVersionStatusEnum("status").notNull().default("DRAFT"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    sentBy: text("sent_by"),
    currency: varchar("currency", { length: 3 }),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 }),
    discountAmount: numeric("discount_amount", { precision: 14, scale: 2 }),
    taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }),
    total: numeric("total", { precision: 14, scale: 2 }),
    taxMode: quoteTaxModeEnum("tax_mode").notNull().default("UNCONFIGURED"),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    termsSnapshot: jsonb("terms_snapshot").$type<Record<string, unknown>>().notNull().default({}),
    companySnapshot: jsonb("company_snapshot")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    customerSnapshot: jsonb("customer_snapshot")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    contentHash: text("content_hash"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedBy: text("accepted_by"),
    acceptedChannel: text("accepted_channel"),
    acceptanceNote: text("acceptance_note"),
  },
  (table) => ({
    quoteVersionUnique: uniqueIndex("quote_versions_quote_version_unique").on(
      table.quoteId,
      table.versionNumber,
    ),
    quoteIndex: index("quote_versions_quote_idx").on(table.quoteId, table.createdAt),
    statusIndex: index("quote_versions_status_idx").on(table.status),
  }),
);
export const quoteVersionItems = pgTable(
  "quote_version_items",
  {
    id: text("id").primaryKey(),
    versionId: text("version_id")
      .notNull()
      .references(() => quoteVersions.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    skuSnapshot: text("sku_snapshot").notNull(),
    productNameSnapshot: text("product_name_snapshot").notNull(),
    quantity: integer("quantity").notNull(),
    baseUnitPrice: numeric("base_unit_price", { precision: 14, scale: 2 }),
    discountPercentage: numeric("discount_percentage", { precision: 5, scale: 2 }),
    discountAmount: numeric("discount_amount", { precision: 14, scale: 2 }),
    finalUnitPrice: numeric("final_unit_price", { precision: 14, scale: 2 }),
    lineTotal: numeric("line_total", { precision: 14, scale: 2 }),
    currency: varchar("currency", { length: 3 }),
    priceType: text("price_type"),
    priceSourceId: text("price_source_id"),
    priceReason: text("price_reason"),
    discountStatus: quoteDiscountApprovalStatusEnum("discount_status")
      .notNull()
      .default("NOT_REQUIRED"),
    discountReason: text("discount_reason"),
  },
  (table) => ({
    versionProductUnique: uniqueIndex("quote_version_items_version_product_unique").on(
      table.versionId,
      table.productId,
    ),
    versionIndex: index("quote_version_items_version_idx").on(table.versionId),
    productIndex: index("quote_version_items_product_idx").on(table.productId),
  }),
);
export const quoteDiscountApprovals = pgTable(
  "quote_discount_approvals",
  {
    id: text("id").primaryKey(),
    quoteId: text("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    versionId: text("version_id").references(() => quoteVersions.id, { onDelete: "set null" }),
    quoteItemId: text("quote_item_id").references(() => quoteItems.id, { onDelete: "set null" }),
    requestedBy: text("requested_by"),
    percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("PENDING"),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    quoteIndex: index("quote_discount_approvals_quote_idx").on(table.quoteId, table.createdAt),
    statusIndex: index("quote_discount_approvals_status_idx").on(table.status),
  }),
);
export type QuoteCartItem = { productId: string; quantity: number };
export const quoteCarts = pgTable("quote_carts", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  items: jsonb("items").$type<QuoteCartItem[]>().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const locations = pgTable(
  "locations",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    type: locationTypeEnum("type").notNull(),
    active: boolean("active").notNull().default(true),
    address: text("address"),
    city: text("city"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({ codeUnique: uniqueIndex("locations_code_unique").on(table.code) }),
);
export const inventoryBalances = pgTable(
  "inventory_balances",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    onHand: integer("on_hand").notNull().default(0),
    reserved: integer("reserved").notNull().default(0),
    minimumStock: integer("minimum_stock"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productLocationUnique: uniqueIndex("inventory_balances_product_location_unique").on(
      table.productId,
      table.locationId,
    ),
    nonNegative: check(
      "inventory_balances_non_negative",
      sql.raw("on_hand >= 0 AND reserved >= 0"),
    ),
    reservedWithinStock: check(
      "inventory_balances_reserved_within_stock",
      sql.raw("reserved <= on_hand"),
    ),
  }),
);
export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    type: inventoryMovementTypeEnum("type").notNull(),
    quantity: integer("quantity").notNull(),
    previousOnHand: integer("previous_on_hand").notNull(),
    resultingOnHand: integer("resulting_on_hand").notNull(),
    previousReserved: integer("previous_reserved").notNull(),
    resultingReserved: integer("resulting_reserved").notNull(),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    reason: text("reason"),
    notes: text("notes"),
    performedBy: text("performed_by"),
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    quantityPositive: check("inventory_movements_quantity_positive", sql.raw("quantity > 0")),
    resultingNonNegative: check(
      "inventory_movements_resulting_non_negative",
      sql.raw("resulting_on_hand >= 0 AND resulting_reserved >= 0"),
    ),
    productLocationIndex: index("inventory_movements_product_location_idx").on(
      table.productId,
      table.locationId,
    ),
    idempotencyUnique: uniqueIndex("inventory_movements_idempotency_unique").on(
      table.idempotencyKey,
    ),
  }),
);
export const inventoryImportBatches = pgTable("inventory_import_batches", {
  id: text("id").primaryKey(),
  source: text("source").notNull(),
  status: text("status").notNull(),
  filename: text("filename"),
  rowsRead: integer("rows_read").notNull().default(0),
  matched: integer("matched").notNull().default(0),
  unmatched: integer("unmatched").notNull().default(0),
  ambiguous: integer("ambiguous").notNull().default(0),
  quantities: integer("quantities").notNull().default(0),
  locations: integer("locations").notNull().default(0),
  errors: jsonb("errors").$type<string[]>().notNull().default([]),
  appliedBy: text("applied_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});
export const transfers = pgTable(
  "transfers",
  {
    id: text("id").primaryKey(),
    sourceLocationId: text("source_location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    destinationLocationId: text("destination_location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    status: transferStatusEnum("status").notNull().default("DRAFT"),
    requestedBy: text("requested_by"),
    approvedBy: text("approved_by"),
    receivedBy: text("received_by"),
    notes: text("notes"),
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    receivedAt: timestamp("received_at", { withTimezone: true }),
  },
  (table) => ({
    idempotencyUnique: uniqueIndex("transfers_idempotency_unique").on(table.idempotencyKey),
  }),
);
export const transferItems = pgTable(
  "transfer_items",
  {
    id: text("id").primaryKey(),
    transferId: text("transfer_id")
      .notNull()
      .references(() => transfers.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
  },
  (table) => ({
    transferProductUnique: uniqueIndex("transfer_items_transfer_product_unique").on(
      table.transferId,
      table.productId,
    ),
    quantityPositive: check("transfer_items_quantity_positive", sql.raw("quantity > 0")),
  }),
);
export const inventoryReservations = pgTable(
  "inventory_reservations",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    status: reservationStatusEnum("status").notNull().default("ACTIVE"),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    reason: text("reason"),
    idempotencyKey: text("idempotency_key"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
  },
  (table) => ({
    quantityPositive: check("inventory_reservations_quantity_positive", sql.raw("quantity > 0")),
    idempotencyUnique: uniqueIndex("inventory_reservations_idempotency_unique").on(
      table.idempotencyKey,
    ),
  }),
);
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id"),
    actorRole: text("actor_role"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    module: text("module"),
    severity: text("severity").notNull().default("INFO"),
    origin: text("origin"),
    requestId: text("request_id"),
    correlationId: text("correlation_id"),
    before: jsonb("before").$type<Record<string, unknown> | null>(),
    after: jsonb("after").$type<Record<string, unknown> | null>(),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    createdAtIndex: index("audit_logs_created_at_idx").on(table.createdAt),
    entityIndex: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    actionIndex: index("audit_logs_action_idx").on(table.action),
    severityIndex: index("audit_logs_severity_idx").on(table.severity),
    actorIndex: index("audit_logs_actor_idx").on(table.actorId),
  }),
);
export const catalogMetricSnapshots = pgTable("catalog_metric_snapshots", {
  snapshotDate: date("snapshot_date").primaryKey(),
  totalProducts: integer("total_products").notNull(),
  publishedProducts: integer("published_products").notNull(),
  reviewProducts: integer("review_products").notNull(),
  productsRequiringReview: integer("products_requiring_review").notNull(),
  duplicateProducts: integer("duplicate_products").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
