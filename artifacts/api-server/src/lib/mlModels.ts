import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const modelsPath = join(__dirname, "models.json");
const modelsData = JSON.parse(readFileSync(modelsPath, "utf-8"));

export const MODEL_DATA = modelsData;

export type ModelType = "logistic_regression" | "random_forest";

interface TreeNode {
  leaf: boolean;
  prob?: number;
  feature?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

export interface TransactionFeatures {
  time?: number;
  v1?: number; v2?: number; v3?: number; v4?: number; v5?: number;
  v6?: number; v7?: number; v8?: number; v9?: number; v10?: number;
  v11?: number; v12?: number; v13?: number; v14?: number; v15?: number;
  v16?: number; v17?: number; v18?: number; v19?: number; v20?: number;
  v21?: number; v22?: number; v23?: number; v24?: number; v25?: number;
  v26?: number; v27?: number; v28?: number;
  amount: number;
  // Legacy fields from heuristic model
  merchantCategory?: string;
  hour?: number;
  dayOfWeek?: number;
  distanceFromHome?: number;
  cardPresent?: boolean;
  onlineTransaction?: boolean;
  numTransactionsLast24h?: number;
  avgTransactionAmount?: number;
}

export interface MLPrediction {
  transactionId: string;
  fraudProbability: number;
  isFraud: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
  riskFactors: string[];
  confidence: number;
  modelUsed: ModelType;
}

function sigmoid(z: number): number {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

function featuresToVector(features: TransactionFeatures): number[] {
  // Feature order: Time, V1-V28, Amount
  return [
    features.time ?? 0,
    features.v1 ?? 0, features.v2 ?? 0, features.v3 ?? 0, features.v4 ?? 0,
    features.v5 ?? 0, features.v6 ?? 0, features.v7 ?? 0, features.v8 ?? 0,
    features.v9 ?? 0, features.v10 ?? 0, features.v11 ?? 0, features.v12 ?? 0,
    features.v13 ?? 0, features.v14 ?? 0, features.v15 ?? 0, features.v16 ?? 0,
    features.v17 ?? 0, features.v18 ?? 0, features.v19 ?? 0, features.v20 ?? 0,
    features.v21 ?? 0, features.v22 ?? 0, features.v23 ?? 0, features.v24 ?? 0,
    features.v25 ?? 0, features.v26 ?? 0, features.v27 ?? 0, features.v28 ?? 0,
    features.amount,
  ];
}

function predictWithLR(features: TransactionFeatures): number {
  const lr = MODEL_DATA.logisticRegression;
  const vec = featuresToVector(features);
  const { means, stds } = lr.scaler;
  const scaled = vec.map((v: number, i: number) => (v - means[i]) / stds[i]);
  const z = lr.weights.reduce((sum: number, w: number, i: number) => sum + w * scaled[i], lr.bias);
  return sigmoid(z);
}

function predictTreeNode(node: TreeNode, vec: number[]): number {
  if (node.leaf) return node.prob ?? 0;
  if (vec[node.feature!] <= node.threshold!) {
    return predictTreeNode(node.left!, vec);
  }
  return predictTreeNode(node.right!, vec);
}

function predictWithRF(features: TransactionFeatures): number {
  const rf = MODEL_DATA.randomForest;
  const vec = featuresToVector(features);
  const probs = rf.trees.map((tree: TreeNode) => predictTreeNode(tree, vec));
  return probs.reduce((s: number, p: number) => s + p, 0) / probs.length;
}

function buildRiskFactors(features: TransactionFeatures, fraudProb: number): string[] {
  const factors: string[] = [];

  if (features.amount > 500) factors.push(`High transaction amount ($${features.amount.toFixed(2)})`);
  if ((features.v14 ?? 0) < -5) factors.push("V14 component strongly indicates fraud pattern");
  if ((features.v3 ?? 0) < -5) factors.push("V3 component indicates unusual transaction behavior");
  if ((features.v17 ?? 0) < -4) factors.push("V17 component shows anomalous pattern");
  if ((features.v10 ?? 0) < -4) factors.push("V10 component flagged as suspicious");
  if ((features.v12 ?? 0) < -4) factors.push("V12 component indicates potential fraud");
  if ((features.v4 ?? 0) > 4) factors.push("V4 component elevated — unusual purchase type");
  if ((features.v11 ?? 0) > 4) factors.push("V11 component elevated — atypical for this card");

  // Legacy heuristic factors
  if (features.distanceFromHome && features.distanceFromHome > 200) factors.push(`Transaction ${features.distanceFromHome.toFixed(0)}km from home`);
  if (features.numTransactionsLast24h && features.numTransactionsLast24h > 8) factors.push(`High velocity: ${features.numTransactionsLast24h} transactions in 24h`);
  if (features.cardPresent === false && features.amount > 200) factors.push("Card not present with high amount");
  if (features.hour !== undefined && [0, 1, 2, 3, 4].includes(features.hour)) factors.push(`Late-night transaction (${features.hour}:00)`);

  if (factors.length === 0) {
    factors.push(fraudProb > 0.3 ? "Elevated fraud probability from model" : "No significant risk factors detected");
  }

  return factors;
}

export function predictFraudML(features: TransactionFeatures, modelType: ModelType, transactionId: string): MLPrediction {
  let fraudProbability: number;
  if (modelType === "logistic_regression") {
    fraudProbability = predictWithLR(features);
  } else {
    fraudProbability = predictWithRF(features);
  }

  fraudProbability = Math.round(fraudProbability * 1000) / 1000;

  let riskLevel: "low" | "medium" | "high" | "critical";
  if (fraudProbability >= 0.75) riskLevel = "critical";
  else if (fraudProbability >= 0.5) riskLevel = "high";
  else if (fraudProbability >= 0.25) riskLevel = "medium";
  else riskLevel = "low";

  const isFraud = fraudProbability >= 0.5;
  const riskFactors = buildRiskFactors(features, fraudProbability);

  // Model confidence based on how far from decision boundary
  const distFromBoundary = Math.abs(fraudProbability - 0.5);
  const confidence = Math.min(0.5 + distFromBoundary * 1.8, 0.99);

  return {
    transactionId,
    fraudProbability,
    isFraud,
    riskLevel,
    riskFactors,
    confidence: Math.round(confidence * 1000) / 1000,
    modelUsed: modelType,
  };
}

export function getModelMetrics(modelType: ModelType) {
  if (modelType === "logistic_regression") {
    return MODEL_DATA.logisticRegression.metrics;
  }
  return MODEL_DATA.randomForest.metrics;
}

export function getFeatureImportance(modelType: ModelType) {
  if (modelType === "logistic_regression") {
    return MODEL_DATA.logisticRegression.featureImportance;
  }
  return MODEL_DATA.randomForest.featureImportance;
}

export function getDatasetStats() {
  return MODEL_DATA.datasetStats;
}

export function getModelDescription(modelType: ModelType) {
  if (modelType === "logistic_regression") {
    return MODEL_DATA.logisticRegression.description;
  }
  return MODEL_DATA.randomForest.description;
}
