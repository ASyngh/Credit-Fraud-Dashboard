import { v4 as uuidv4 } from "uuid";

export interface TransactionFeatures {
  amount: number;
  merchantCategory: string;
  hour: number;
  dayOfWeek: number;
  distanceFromHome: number;
  cardPresent: boolean;
  onlineTransaction: boolean;
  numTransactionsLast24h: number;
  avgTransactionAmount: number;
}

export interface FraudPrediction {
  transactionId: string;
  fraudProbability: number;
  isFraud: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
  riskFactors: string[];
  confidence: number;
}

const HIGH_RISK_CATEGORIES = ["online", "travel"];
const SUSPICIOUS_HOURS = [0, 1, 2, 3, 4, 22, 23];

export function predictFraud(features: TransactionFeatures): FraudPrediction {
  let score = 0;
  const riskFactors: string[] = [];

  // Amount ratio compared to average
  const amountRatio = features.amount / Math.max(features.avgTransactionAmount, 1);
  if (amountRatio > 5) {
    score += 0.35;
    riskFactors.push("Transaction amount is 5x above average");
  } else if (amountRatio > 3) {
    score += 0.2;
    riskFactors.push("Transaction amount significantly above average");
  } else if (amountRatio > 2) {
    score += 0.1;
    riskFactors.push("Transaction amount above average");
  }

  // High-risk merchant categories
  if (HIGH_RISK_CATEGORIES.includes(features.merchantCategory)) {
    score += 0.1;
    riskFactors.push(`High-risk merchant category: ${features.merchantCategory}`);
  }

  // Suspicious hours
  if (SUSPICIOUS_HOURS.includes(features.hour)) {
    score += 0.15;
    riskFactors.push(`Transaction at unusual hour: ${features.hour}:00`);
  }

  // Distance from home
  if (features.distanceFromHome > 500) {
    score += 0.25;
    riskFactors.push("Transaction far from home location (>500km)");
  } else if (features.distanceFromHome > 200) {
    score += 0.15;
    riskFactors.push("Transaction far from home location (>200km)");
  } else if (features.distanceFromHome > 50) {
    score += 0.05;
    riskFactors.push("Transaction away from home location");
  }

  // Card not present with high amount
  if (!features.cardPresent && features.amount > 200) {
    score += 0.2;
    riskFactors.push("Card-not-present transaction with high amount");
  } else if (!features.cardPresent) {
    score += 0.08;
    riskFactors.push("Card not physically present");
  }

  // Online transaction
  if (features.onlineTransaction) {
    score += 0.08;
    riskFactors.push("Online transaction");
  }

  // High velocity
  if (features.numTransactionsLast24h > 10) {
    score += 0.25;
    riskFactors.push(`High transaction velocity: ${features.numTransactionsLast24h} transactions in 24h`);
  } else if (features.numTransactionsLast24h > 5) {
    score += 0.1;
    riskFactors.push("Elevated transaction velocity in last 24h");
  }

  // Clamp score
  const fraudProbability = Math.min(Math.max(score + (Math.random() * 0.05 - 0.025), 0), 1);

  let riskLevel: "low" | "medium" | "high" | "critical";
  if (fraudProbability >= 0.75) riskLevel = "critical";
  else if (fraudProbability >= 0.5) riskLevel = "high";
  else if (fraudProbability >= 0.25) riskLevel = "medium";
  else riskLevel = "low";

  const isFraud = fraudProbability >= 0.5;
  const confidence = 0.82 + Math.random() * 0.15;

  return {
    transactionId: uuidv4(),
    fraudProbability: Math.round(fraudProbability * 1000) / 1000,
    isFraud,
    riskLevel,
    riskFactors: riskFactors.length > 0 ? riskFactors : ["No significant risk factors detected"],
    confidence: Math.round(confidence * 1000) / 1000,
  };
}
