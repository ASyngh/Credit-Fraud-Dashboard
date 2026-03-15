import { pgTable, text, serial, real, boolean, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const riskLevelEnum = pgEnum("risk_level", ["low", "medium", "high", "critical"]);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  transactionId: text("transaction_id").notNull().unique(),
  amount: real("amount").notNull(),
  merchantCategory: text("merchant_category").notNull(),
  merchantName: text("merchant_name").notNull(),
  cardLast4: text("card_last4").notNull(),
  location: text("location").notNull(),
  hour: integer("hour").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  distanceFromHome: real("distance_from_home").notNull(),
  cardPresent: boolean("card_present").notNull().default(true),
  onlineTransaction: boolean("online_transaction").notNull().default(false),
  numTransactionsLast24h: integer("num_transactions_last_24h").notNull().default(1),
  avgTransactionAmount: real("avg_transaction_amount").notNull(),
  fraudProbability: real("fraud_probability").notNull(),
  isFraud: boolean("is_fraud").notNull().default(false),
  riskLevel: riskLevelEnum("risk_level").notNull().default("low"),
  riskFactors: text("risk_factors").array().notNull().default([]),
  confidence: real("confidence").notNull().default(0.9),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
