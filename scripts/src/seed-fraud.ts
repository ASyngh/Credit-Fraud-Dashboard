import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db/schema";

const MERCHANT_NAMES: Record<string, string[]> = {
  retail: ["Amazon", "Walmart", "Target", "Best Buy", "Costco"],
  food: ["McDonald's", "Starbucks", "Chipotle", "DoorDash", "Uber Eats"],
  travel: ["Delta Airlines", "Marriott Hotels", "Expedia", "United Airlines", "Airbnb"],
  online: ["Netflix", "Steam", "eBay", "Etsy", "Shopify Store"],
  gas: ["Shell", "BP", "Chevron", "ExxonMobil", "Sunoco"],
  entertainment: ["AMC Theaters", "Spotify", "Apple iTunes", "Xbox", "PlayStation"],
  other: ["CVS Pharmacy", "Home Depot", "Lowe's", "PetSmart", "AutoZone"],
};

const CATEGORIES = Object.keys(MERCHANT_NAMES);
const LOCATIONS = [
  "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX",
  "Phoenix, AZ", "Philadelphia, PA", "San Antonio, TX", "San Diego, CA",
  "Dallas, TX", "Miami, FL", "Seattle, WA", "Denver, CO",
];

function uuid() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max));
}

function calcFraudScore(tx: {
  amount: number;
  avgTransactionAmount: number;
  distanceFromHome: number;
  hour: number;
  cardPresent: boolean;
  onlineTransaction: boolean;
  numTransactionsLast24h: number;
  merchantCategory: string;
}): number {
  let score = 0;
  const ratio = tx.amount / Math.max(tx.avgTransactionAmount, 1);
  if (ratio > 5) score += 0.35;
  else if (ratio > 3) score += 0.2;
  else if (ratio > 2) score += 0.1;

  if (["online", "travel"].includes(tx.merchantCategory)) score += 0.1;
  if ([0, 1, 2, 3, 4, 22, 23].includes(tx.hour)) score += 0.15;
  if (tx.distanceFromHome > 500) score += 0.25;
  else if (tx.distanceFromHome > 200) score += 0.15;
  else if (tx.distanceFromHome > 50) score += 0.05;
  if (!tx.cardPresent && tx.amount > 200) score += 0.2;
  else if (!tx.cardPresent) score += 0.08;
  if (tx.onlineTransaction) score += 0.08;
  if (tx.numTransactionsLast24h > 10) score += 0.25;
  else if (tx.numTransactionsLast24h > 5) score += 0.1;

  return Math.min(Math.max(score + (Math.random() * 0.05 - 0.025), 0), 1);
}

async function seed() {
  console.log("Seeding fraud detection data...");
  
  const rows = [];
  const now = new Date();

  for (let i = 0; i < 300; i++) {
    const daysAgo = randInt(0, 30);
    const hoursAgo = randInt(0, 24);
    const createdAt = new Date(now);
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(createdAt.getHours() - hoursAgo);

    const category = CATEGORIES[randInt(0, CATEGORIES.length)];
    const names = MERCHANT_NAMES[category];
    const merchantName = names[randInt(0, names.length)];
    const avgAmount = rand(30, 200);
    const isFraudSeed = Math.random() < 0.08;
    
    const amount = isFraudSeed
      ? avgAmount * rand(3, 8)
      : avgAmount * rand(0.3, 1.8);

    const distanceFromHome = isFraudSeed ? rand(100, 800) : rand(0, 100);
    const hour = isFraudSeed && Math.random() < 0.5 ? randInt(0, 5) : randInt(6, 23);
    const numTransactions = isFraudSeed && Math.random() < 0.4 ? randInt(8, 15) : randInt(1, 5);
    const cardPresent = !isFraudSeed || Math.random() > 0.7;
    const onlineTransaction = !cardPresent || Math.random() < 0.3;

    const fp = calcFraudScore({
      amount,
      avgTransactionAmount: avgAmount,
      distanceFromHome,
      hour,
      cardPresent,
      onlineTransaction,
      numTransactionsLast24h: numTransactions,
      merchantCategory: category,
    });

    let riskLevel: "low" | "medium" | "high" | "critical";
    if (fp >= 0.75) riskLevel = "critical";
    else if (fp >= 0.5) riskLevel = "high";
    else if (fp >= 0.25) riskLevel = "medium";
    else riskLevel = "low";

    rows.push({
      transactionId: uuid(),
      amount: Math.round(amount * 100) / 100,
      merchantCategory: category,
      merchantName,
      cardLast4: String(randInt(1000, 9999)),
      location: LOCATIONS[randInt(0, LOCATIONS.length)],
      hour,
      dayOfWeek: randInt(0, 7),
      distanceFromHome: Math.round(distanceFromHome * 10) / 10,
      cardPresent,
      onlineTransaction,
      numTransactionsLast24h: numTransactions,
      avgTransactionAmount: Math.round(avgAmount * 100) / 100,
      fraudProbability: Math.round(fp * 1000) / 1000,
      isFraud: fp >= 0.5,
      riskLevel,
      riskFactors: fp >= 0.5 ? ["High risk transaction detected"] : ["Normal transaction pattern"],
      confidence: Math.round((0.82 + Math.random() * 0.15) * 1000) / 1000,
      createdAt,
    });
  }

  await db.insert(transactionsTable).values(rows);
  console.log(`Seeded ${rows.length} transactions.`);
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
