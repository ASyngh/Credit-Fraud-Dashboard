import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db/schema";
import { desc, eq, count } from "drizzle-orm";
import {
  PredictFraudBody,
  PredictFraudResponse,
  UploadTransactionsBody,
  ListTransactionsQueryParams,
} from "@workspace/api-zod";
import { predictFraud } from "../lib/fraudModel.js";
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

const LOCATIONS = ["New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX", "Phoenix, AZ", "Philadelphia, PA", "San Antonio, TX", "San Diego, CA", "Dallas, TX", "Miami, FL"];

router.post("/predict", async (req, res) => {
  const body = PredictFraudBody.parse(req.body);
  const prediction = predictFraud(body);

  const merchantNames = MERCHANT_NAMES[body.merchantCategory] || MERCHANT_NAMES.other;
  const merchantName = merchantNames[Math.floor(Math.random() * merchantNames.length)];
  const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];

  await db.insert(transactionsTable).values({
    transactionId: prediction.transactionId,
    amount: body.amount,
    merchantCategory: body.merchantCategory,
    merchantName,
    cardLast4: String(Math.floor(1000 + Math.random() * 9000)),
    location,
    hour: body.hour,
    dayOfWeek: body.dayOfWeek,
    distanceFromHome: body.distanceFromHome,
    cardPresent: body.cardPresent,
    onlineTransaction: body.onlineTransaction,
    numTransactionsLast24h: body.numTransactionsLast24h,
    avgTransactionAmount: body.avgTransactionAmount,
    fraudProbability: prediction.fraudProbability,
    isFraud: prediction.isFraud,
    riskLevel: prediction.riskLevel,
    riskFactors: prediction.riskFactors,
    confidence: prediction.confidence,
  });

  const result = PredictFraudResponse.parse(prediction);
  res.json(result);
});

router.post("/upload", async (req, res) => {
  const body = UploadTransactionsBody.parse(req.body);
  const startTime = Date.now();

  const results = [];
  for (const tx of body.transactions) {
    const prediction = predictFraud(tx);
    results.push(prediction);
  }

  const fraudDetected = results.filter((r) => r.isFraud).length;

  res.json({
    totalProcessed: results.length,
    fraudDetected,
    results,
    processingTimeMs: Date.now() - startTime,
  });
});

router.get("/", async (req, res) => {
  const query = ListTransactionsQueryParams.parse(req.query);
  const limit = query.limit ?? 50;
  const offset = query.offset ?? 0;
  const fraudOnly = query.fraudOnly ?? false;

  const baseQuery = db.select().from(transactionsTable);
  
  let rows;
  if (fraudOnly) {
    rows = await baseQuery
      .where(eq(transactionsTable.isFraud, true))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit)
      .offset(offset);
  } else {
    rows = await baseQuery
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit)
      .offset(offset);
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
  }));

  res.json({ transactions, total, page: Math.floor(offset / limit) });
});

export default router;
