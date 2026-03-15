import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db/schema";
import { desc, eq, count } from "drizzle-orm";
import { predictFraudML, type ModelType, type TransactionFeatures } from "../lib/mlModels.js";
import { v4 as uuidv4 } from "uuid";

const router: IRouter = Router();

const MERCHANT_NAMES: Record<string, string[]> = {
  retail: ["Amazon", "Walmart", "Target", "Best Buy", "Costco"],
  food: ["McDonald's", "Starbucks", "Chipotle", "DoorDash", "Uber Eats"],
  travel: ["Delta Airlines", "Marriott Hotels", "Expedia", "United Airlines", "Airbnb"],
  online: ["Netflix", "Steam", "eBay", "Etsy", "Shopify Store"],
  gas: ["Shell", "BP", "Chevron", "ExxonMobil", "Sunoco"],
  entertainment: ["AMC Theaters", "Spotify", "Apple iTunes", "Xbox", "PlayStation"],
  other: ["CVS Pharmacy", "Home Depot", "Lowe's", "PetSmart", "AutoZone"],
};
const LOCATIONS = ["New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX", "Phoenix, AZ", "Miami, FL", "Seattle, WA", "Denver, CO"];

router.post("/predict", async (req, res) => {
  const body = req.body;
  const modelType: ModelType = body.model === "logistic_regression" ? "logistic_regression" : "random_forest";

  const features: TransactionFeatures = {
    amount: Number(body.amount) || 0,
    time: body.time !== undefined ? Number(body.time) : Math.random() * 172792,
    v1: body.v1 !== undefined ? Number(body.v1) : undefined,
    v2: body.v2 !== undefined ? Number(body.v2) : undefined,
    v3: body.v3 !== undefined ? Number(body.v3) : undefined,
    v4: body.v4 !== undefined ? Number(body.v4) : undefined,
    v5: body.v5 !== undefined ? Number(body.v5) : undefined,
    v6: body.v6 !== undefined ? Number(body.v6) : undefined,
    v7: body.v7 !== undefined ? Number(body.v7) : undefined,
    v8: body.v8 !== undefined ? Number(body.v8) : undefined,
    v9: body.v9 !== undefined ? Number(body.v9) : undefined,
    v10: body.v10 !== undefined ? Number(body.v10) : undefined,
    v11: body.v11 !== undefined ? Number(body.v11) : undefined,
    v12: body.v12 !== undefined ? Number(body.v12) : undefined,
    v13: body.v13 !== undefined ? Number(body.v13) : undefined,
    v14: body.v14 !== undefined ? Number(body.v14) : undefined,
    v15: body.v15 !== undefined ? Number(body.v15) : undefined,
    v16: body.v16 !== undefined ? Number(body.v16) : undefined,
    v17: body.v17 !== undefined ? Number(body.v17) : undefined,
    v18: body.v18 !== undefined ? Number(body.v18) : undefined,
    v19: body.v19 !== undefined ? Number(body.v19) : undefined,
    v20: body.v20 !== undefined ? Number(body.v20) : undefined,
    v21: body.v21 !== undefined ? Number(body.v21) : undefined,
    v22: body.v22 !== undefined ? Number(body.v22) : undefined,
    v23: body.v23 !== undefined ? Number(body.v23) : undefined,
    v24: body.v24 !== undefined ? Number(body.v24) : undefined,
    v25: body.v25 !== undefined ? Number(body.v25) : undefined,
    v26: body.v26 !== undefined ? Number(body.v26) : undefined,
    v27: body.v27 !== undefined ? Number(body.v27) : undefined,
    v28: body.v28 !== undefined ? Number(body.v28) : undefined,
    merchantCategory: body.merchantCategory,
    hour: body.hour !== undefined ? Number(body.hour) : undefined,
    dayOfWeek: body.dayOfWeek !== undefined ? Number(body.dayOfWeek) : undefined,
    distanceFromHome: body.distanceFromHome !== undefined ? Number(body.distanceFromHome) : undefined,
    cardPresent: body.cardPresent,
    onlineTransaction: body.onlineTransaction,
    numTransactionsLast24h: body.numTransactionsLast24h !== undefined ? Number(body.numTransactionsLast24h) : undefined,
    avgTransactionAmount: body.avgTransactionAmount !== undefined ? Number(body.avgTransactionAmount) : undefined,
  };

  const txId = uuidv4();
  const prediction = predictFraudML(features, modelType, txId);

  const category = body.merchantCategory || "retail";
  const names = MERCHANT_NAMES[category] || MERCHANT_NAMES.retail;
  const merchantName = names[Math.floor(Math.random() * names.length)];
  const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];

  try {
    await db.insert(transactionsTable).values({
      transactionId: txId,
      amount: features.amount,
      merchantCategory: category,
      merchantName,
      cardLast4: String(Math.floor(1000 + Math.random() * 9000)),
      location,
      hour: features.hour ?? 12,
      dayOfWeek: features.dayOfWeek ?? 1,
      distanceFromHome: features.distanceFromHome ?? 0,
      cardPresent: features.cardPresent ?? true,
      onlineTransaction: features.onlineTransaction ?? false,
      numTransactionsLast24h: features.numTransactionsLast24h ?? 1,
      avgTransactionAmount: features.avgTransactionAmount ?? features.amount,
      fraudProbability: prediction.fraudProbability,
      isFraud: prediction.isFraud,
      riskLevel: prediction.riskLevel,
      riskFactors: prediction.riskFactors,
      confidence: prediction.confidence,
    });
  } catch (e) {
    // Don't fail the request if DB write fails
  }

  res.json(prediction);
});

router.post("/upload", async (req, res) => {
  const body = req.body;
  const modelType: ModelType = body.model === "logistic_regression" ? "logistic_regression" : "random_forest";
  const transactions = body.transactions || [];
  const startTime = Date.now();

  const results = transactions.map((tx: Record<string, unknown>) => {
    const features: TransactionFeatures = {
      amount: Number(tx.amount) || 0,
      time: tx.time !== undefined ? Number(tx.time) : Math.random() * 172792,
      v1: tx.v1 !== undefined ? Number(tx.v1) : undefined,
      v2: tx.v2 !== undefined ? Number(tx.v2) : undefined,
      v3: tx.v3 !== undefined ? Number(tx.v3) : undefined,
      v4: tx.v4 !== undefined ? Number(tx.v4) : undefined,
      v5: tx.v5 !== undefined ? Number(tx.v5) : undefined,
      v6: tx.v6 !== undefined ? Number(tx.v6) : undefined,
      v7: tx.v7 !== undefined ? Number(tx.v7) : undefined,
      v8: tx.v8 !== undefined ? Number(tx.v8) : undefined,
      v9: tx.v9 !== undefined ? Number(tx.v9) : undefined,
      v10: tx.v10 !== undefined ? Number(tx.v10) : undefined,
      v11: tx.v11 !== undefined ? Number(tx.v11) : undefined,
      v12: tx.v12 !== undefined ? Number(tx.v12) : undefined,
      v13: tx.v13 !== undefined ? Number(tx.v13) : undefined,
      v14: tx.v14 !== undefined ? Number(tx.v14) : undefined,
      v15: tx.v15 !== undefined ? Number(tx.v15) : undefined,
      v16: tx.v16 !== undefined ? Number(tx.v16) : undefined,
      v17: tx.v17 !== undefined ? Number(tx.v17) : undefined,
      v18: tx.v18 !== undefined ? Number(tx.v18) : undefined,
      v19: tx.v19 !== undefined ? Number(tx.v19) : undefined,
      v20: tx.v20 !== undefined ? Number(tx.v20) : undefined,
      v21: tx.v21 !== undefined ? Number(tx.v21) : undefined,
      v22: tx.v22 !== undefined ? Number(tx.v22) : undefined,
      v23: tx.v23 !== undefined ? Number(tx.v23) : undefined,
      v24: tx.v24 !== undefined ? Number(tx.v24) : undefined,
      v25: tx.v25 !== undefined ? Number(tx.v25) : undefined,
      v26: tx.v26 !== undefined ? Number(tx.v26) : undefined,
      v27: tx.v27 !== undefined ? Number(tx.v27) : undefined,
      v28: tx.v28 !== undefined ? Number(tx.v28) : undefined,
    };
    return predictFraudML(features, modelType, uuidv4());
  });

  const fraudDetected = results.filter((r: { isFraud: boolean }) => r.isFraud).length;

  res.json({
    totalProcessed: results.length,
    fraudDetected,
    results,
    processingTimeMs: Date.now() - startTime,
    modelUsed: modelType,
  });
});

router.get("/", async (req, res) => {
  const limit = Number(req.query.limit) || 50;
  const offset = Number(req.query.offset) || 0;
  const fraudOnly = req.query.fraudOnly === "true";

  let rows;
  if (fraudOnly) {
    rows = await db.select().from(transactionsTable)
      .where(eq(transactionsTable.isFraud, true))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit).offset(offset);
  } else {
    rows = await db.select().from(transactionsTable)
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit).offset(offset);
  }

  const [{ value: total }] = await db.select({ value: count() }).from(transactionsTable);

  const transactions = rows.map((row) => ({
    id: row.transactionId,
    amount: row.amount,
    merchantCategory: row.merchantCategory,
    merchantName: row.merchantName,
    timestamp: row.createdAt.toISOString(),
    fraudProbability: row.fraudProbability,
    isFraud: row.isFraud,
    riskLevel: row.riskLevel,
    cardLast4: row.cardLast4,
    location: row.location,
    modelUsed: "random_forest",
  }));

  res.json({ transactions, total, page: Math.floor(offset / limit) });
});

export default router;
