import { Router, type IRouter } from "express";
import {
  getFeatureImportance,
  getDatasetStats,
  getModelMetrics,
  getModelDescription,
} from "../lib/mlModels.js";

const router: IRouter = Router();

router.get("/info", (_req, res) => {
  const datasetStats = getDatasetStats();

  res.json({
    logisticRegression: {
      type: "logistic_regression",
      description: getModelDescription("logistic_regression"),
      metrics: getModelMetrics("logistic_regression"),
      featureImportance: getFeatureImportance("logistic_regression").slice(0, 10),
    },
    randomForest: {
      type: "random_forest",
      description: getModelDescription("random_forest"),
      metrics: getModelMetrics("random_forest"),
      featureImportance: getFeatureImportance("random_forest").slice(0, 10),
    },
    datasetInfo: {
      totalRows: datasetStats.totalTransactions,
      fraudRows: datasetStats.fraudCount,
      normalRows: datasetStats.normalCount,
      fraudRate: datasetStats.fraudRate,
      features: "Time, V1-V28 (PCA), Amount",
      trainingNote: "Trained on Kaggle Credit Card Fraud Detection dataset with balanced class weights",
    },
  });
});

export default router;
