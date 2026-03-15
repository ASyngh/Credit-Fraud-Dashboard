import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db/schema";
import { eq, count, sum, avg } from "drizzle-orm";
import {
  getFeatureImportance,
  getDatasetStats,
  getModelMetrics,
  getModelDescription,
  type ModelType,
} from "../lib/mlModels.js";

const router: IRouter = Router();

router.get("/summary", async (_req, res) => {
  const [totals] = await db.select({
    totalTransactions: count(),
    totalAmountAnalyzed: sum(transactionsTable.amount),
    avgFraudProbability: avg(transactionsTable.fraudProbability),
  }).from(transactionsTable);

  const [fraudCount] = await db.select({ value: count() })
    .from(transactionsTable).where(eq(transactionsTable.isFraud, true));

  const [highRiskCount] = await db.select({ value: count() })
    .from(transactionsTable).where(eq(transactionsTable.riskLevel, "high"));

  const [criticalCount] = await db.select({ value: count() })
    .from(transactionsTable).where(eq(transactionsTable.riskLevel, "critical"));

  const [fraudAmountRow] = await db.select({ value: sum(transactionsTable.amount) })
    .from(transactionsTable).where(eq(transactionsTable.isFraud, true));

  const totalTransactions = Number(totals?.totalTransactions ?? 0);
  const totalFraudDetected = Number(fraudCount?.value ?? 0);
  const totalAmountAnalyzed = Number(totals?.totalAmountAnalyzed ?? 0);
  const totalFraudAmount = Number(fraudAmountRow?.value ?? 0);
  const highRiskTransactions = Number(highRiskCount?.value ?? 0) + Number(criticalCount?.value ?? 0);
  const fraudRate = totalTransactions > 0 ? totalFraudDetected / totalTransactions : 0;
  const avgFraudProbability = Number(totals?.avgFraudProbability ?? 0);

  const datasetStats = getDatasetStats();

  res.json({
    totalTransactions,
    totalFraudDetected,
    fraudRate: Math.round(fraudRate * 10000) / 10000,
    totalAmountAnalyzed: Math.round(totalAmountAnalyzed * 100) / 100,
    totalFraudAmount: Math.round(totalFraudAmount * 100) / 100,
    avgFraudProbability: Math.round(avgFraudProbability * 1000) / 1000,
    highRiskTransactions,
    savedAmount: Math.round(totalFraudAmount * 0.85 * 100) / 100,
    datasetTotalTransactions: datasetStats.totalTransactions,
    datasetFraudRate: datasetStats.fraudRate,
  });
});

router.get("/trends", async (_req, res) => {
  const datasetStats = getDatasetStats();
  const hourly = datasetStats.fraudTrend || [];

  // Also get DB transactions for recent daily trend
  const rows = await db.select().from(transactionsTable)
    .orderBy(transactionsTable.createdAt);

  const dailyMap: Record<string, { total: number; fraudCount: number; amount: number }> = {};
  for (const row of rows) {
    const date = row.createdAt.toISOString().split("T")[0];
    if (!dailyMap[date]) dailyMap[date] = { total: 0, fraudCount: 0, amount: 0 };
    dailyMap[date].total++;
    if (row.isFraud) dailyMap[date].fraudCount++;
    dailyMap[date].amount += row.amount;
  }

  const daily = Object.entries(dailyMap).map(([date, data]) => ({
    date,
    total: data.total,
    fraudCount: data.fraudCount,
    fraudRate: data.total > 0 ? Math.round((data.fraudCount / data.total) * 10000) / 10000 : 0,
    amount: Math.round(data.amount * 100) / 100,
  }));

  res.json({
    hourly,
    daily,
    weekly: daily.slice(-7),
  });
});

router.get("/feature-importance", (req, res) => {
  const modelParam = req.query.model as string;
  const modelType: ModelType =
    modelParam === "logistic_regression" ? "logistic_regression" : "random_forest";

  const features = getFeatureImportance(modelType);

  res.json({ features, model: modelType });
});

router.get("/pca-analysis", (_req, res) => {
  const datasetStats = getDatasetStats();
  const vFeatureStats = datasetStats.vFeatureStats || [];

  const features = vFeatureStats.map((stat: {
    feature: string;
    fraud: { mean: number; std: number };
    normal: { mean: number; std: number };
  }) => ({
    feature: stat.feature,
    fraudMean: stat.fraud.mean,
    normalMean: stat.normal.mean,
    fraudStd: stat.fraud.std,
    normalStd: stat.normal.std,
    separation: Math.abs(stat.fraud.mean - stat.normal.mean),
  }));

  // Sort by separation (most discriminating first)
  features.sort((a: { separation: number }, b: { separation: number }) => b.separation - a.separation);

  res.json({ features });
});

router.get("/fraud-patterns", (_req, res) => {
  const datasetStats = getDatasetStats();

  res.json({
    amountDistribution: datasetStats.amountStats,
    fraudRateByHour: datasetStats.fraudTrend,
    datasetSummary: {
      totalTransactions: datasetStats.totalTransactions,
      fraudCount: datasetStats.fraudCount,
      normalCount: datasetStats.normalCount,
      fraudRate: datasetStats.fraudRate,
    },
  });
});

export default router;
