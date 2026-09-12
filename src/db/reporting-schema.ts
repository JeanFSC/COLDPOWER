import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "@/db/schema";

export const reportScheduleFrequencyEnum = pgEnum("report_schedule_frequency", [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
]);
export const reportScheduleStatusEnum = pgEnum("report_schedule_status", [
  "ACTIVE",
  "PAUSED",
  "CANCELLED",
]);
export const reportScheduleRunStatusEnum = pgEnum("report_schedule_run_status", [
  "PENDING",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "SKIPPED",
]);

export const reportSchedules = pgTable(
  "report_schedules",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    reportKey: text("report_key").notNull().default("operations-summary"),
    frequency: reportScheduleFrequencyEnum("frequency").notNull(),
    filters: jsonb("filters").$type<Record<string, string | undefined>>().notNull().default({}),
    recipientRoles: text("recipient_roles").array().notNull().default([]),
    recipientUserIds: text("recipient_user_ids").array().notNull().default([]),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    status: reportScheduleStatusEnum("status").notNull().default("ACTIVE"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIndex: index("report_schedules_owner_idx").on(table.createdBy, table.status),
    nextRunIndex: index("report_schedules_next_run_idx").on(table.status, table.nextRunAt),
    idempotencyUnique: uniqueIndex("report_schedules_idempotency_unique").on(table.idempotencyKey),
  }),
);

export const reportScheduleRuns = pgTable(
  "report_schedule_runs",
  {
    id: text("id").primaryKey(),
    scheduleId: text("schedule_id")
      .notNull()
      .references(() => reportSchedules.id, { onDelete: "cascade" }),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    status: reportScheduleRunStatusEnum("status").notNull().default("PENDING"),
    filterSnapshot: jsonb("filter_snapshot")
      .$type<Record<string, string | undefined>>()
      .notNull()
      .default({}),
    notificationCount: integer("notification_count").notNull().default(0),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    scheduleDateUnique: uniqueIndex("report_schedule_runs_schedule_date_unique").on(
      table.scheduleId,
      table.scheduledFor,
    ),
    scheduleIndex: index("report_schedule_runs_schedule_idx").on(table.scheduleId, table.createdAt),
    statusIndex: index("report_schedule_runs_status_idx").on(table.status, table.scheduledFor),
  }),
);
