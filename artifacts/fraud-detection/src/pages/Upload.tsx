import { Layout } from "@/components/Layout";
import { useState, useRef, useMemo } from "react";
import Papa from "papaparse";
import { useUploadTransactions } from "@workspace/api-client-react";
import { useModel } from "@/context/ModelContext";
import {
  UploadCloud, FileType, CheckCircle, AlertTriangle, FileUp,
  RotateCcw, ShieldAlert, Activity, Info
} from "lucide-react";
import { cn, formatPercentage } from "@/lib/utils";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

const COLORS = {
  fraud: "#ef4444",
  legit: "#22c55e",
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

function parseKaggleRow(row: Record<string, string>) {
  const obj: Record<string, number | undefined> = {
    time: row["Time"] !== undefined ? parseFloat(row["Time"]) : undefined,
    amount: row["Amount"] !== undefined ? parseFloat(row["Amount"]) : 0,
  };
  for (let i = 1; i <= 28; i++) {
    const key = `V${i}`;
    obj[`v${i}`] = row[key] !== undefined ? parseFloat(row[key]) : undefined;
  }
  return obj;
}

function detectFormat(headers: string[]): "kaggle" | "unknown" {
  const hasV1 = headers.includes("V1") || headers.includes("v1");
  const hasAmount = headers.includes("Amount") || headers.includes("amount");
  return hasV1 && hasAmount ? "kaggle" : "unknown";
}

type UploadResult = {
  totalProcessed: number;
  fraudDetected: number;
  processingTimeMs: number;
  modelUsed: string;
  results: Array<{
    transactionId: string;
    fraudProbability: number;
    isFraud: boolean;
    riskLevel: string;
    riskFactors: string[];
    confidence: number;
  }>;
};

function buildChartData(result: UploadResult) {
  const legit = result.totalProcessed - result.fraudDetected;

  const pieData = [
    { name: "Fraud", value: result.fraudDetected, color: COLORS.fraud },
    { name: "Legitimate", value: legit, color: COLORS.legit },
  ];

  const riskCounts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  const bins = Array.from({ length: 10 }, (_, i) => ({
    range: `${i * 10}–${(i + 1) * 10}%`,
    count: 0,
    fraudCount: 0,
  }));

  for (const r of result.results) {
    riskCounts[r.riskLevel] = (riskCounts[r.riskLevel] || 0) + 1;
    const binIdx = Math.min(Math.floor(r.fraudProbability * 10), 9);
    bins[binIdx].count++;
    if (r.isFraud) bins[binIdx].fraudCount++;
  }

  const riskData = [
    { name: "Critical", value: riskCounts.critical, color: COLORS.critical },
    { name: "High", value: riskCounts.high, color: COLORS.high },
    { name: "Medium", value: riskCounts.medium, color: COLORS.medium },
    { name: "Low", value: riskCounts.low, color: COLORS.low },
  ];

  return { pieData, riskData, bins };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs shadow-xl">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <span className="font-bold">{p.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

export default function Upload() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { model: selectedModel } = useModel();

  const { mutate: uploadBatch, data: result, isPending: isUploading, reset: resetMutation } =
    useUploadTransactions();

  const chartData = useMemo(() => (result ? buildChartData(result as UploadResult) : null), [result]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);
    setFormatError(null);
    setRowCount(null);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setIsParsing(false);
        const headers = results.meta.fields || [];
        const fmt = detectFormat(headers);

        if (fmt === "unknown") {
          setFormatError(
            `Unrecognized CSV format. Expected: Time, V1–V28, Amount (optionally Class). Found: ${headers.slice(0, 6).join(", ")}…`
          );
          return;
        }

        const rows = results.data as Record<string, string>[];
        const MAX_ROWS = 5000;
        let mapped = rows.map(parseKaggleRow);
        
        if (mapped.length > MAX_ROWS) {
          mapped = mapped.slice(0, MAX_ROWS);
          setRowCount(MAX_ROWS);
        } else {
          setRowCount(mapped.length);
        }

        uploadBatch(
          { data: { transactions: mapped as any, model: selectedModel as any } },
          {
            onError: (err: any) => {
              setFormatError(`Server rejected the file: ${err?.message || "Unknown Network Error"}`);
            }
          }
        );
      },
      error: () => {
        setIsParsing(false);
        setFormatError("Failed to parse CSV. Make sure it is a valid UTF-8 encoded file.");
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const handleReset = () => {
    setFile(null);
    setFormatError(null);
    setRowCount(null);
    resetMutation();
    if (inputRef.current) inputRef.current.value = "";
  };

  const isProcessing = isParsing || isUploading;
  const typedResult = result as UploadResult | undefined;

  return (
    <Layout>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">Batch Upload</h1>
          <p className="text-muted-foreground mt-2">
            Upload a Kaggle-format CSV (Time, V1–V28, Amount) to score every row with the active ML model.
          </p>
        </div>
        {typedResult && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Upload New File
          </button>
        )}
      </div>

      {/* Format banner */}
      {!typedResult && (
        <div className="mb-6 flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-2xl p-4 text-sm text-muted-foreground max-w-4xl mx-auto">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-foreground">Expected CSV format:</span> Kaggle Credit Card Fraud
            dataset — columns{" "}
            <code className="bg-secondary px-1 py-0.5 rounded text-xs font-mono text-foreground">Time</code>,{" "}
            <code className="bg-secondary px-1 py-0.5 rounded text-xs font-mono text-foreground">V1–V28</code>,{" "}
            <code className="bg-secondary px-1 py-0.5 rounded text-xs font-mono text-foreground">Amount</code>. The
            optional{" "}
            <code className="bg-secondary px-1 py-0.5 rounded text-xs font-mono text-foreground">Class</code> column
            is ignored — the model predicts it.
          </div>
        </div>
      )}

      {/* Drop zone */}
      {!typedResult && (
        <div
          className={cn(
            "w-full max-w-4xl mx-auto rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-16 text-center relative overflow-hidden",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 bg-card hover:bg-secondary/20",
            isProcessing && "opacity-50 pointer-events-none"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {isProcessing && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-lg font-bold text-foreground">
                {isParsing ? "Parsing CSV…" : `Analyzing ${rowCount?.toLocaleString() ?? ""} rows…`}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Running {selectedModel === "logistic_regression" ? "Logistic Regression" : "Random Forest"} inference
              </p>
            </div>
          )}

          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6 shadow-xl shadow-black/20">
            <UploadCloud className={cn("w-10 h-10 transition-colors", dragActive ? "text-primary" : "text-muted-foreground")} />
          </div>
          <h3 className="text-2xl font-display font-bold text-foreground mb-2">Drag & Drop CSV</h3>
          <p className="text-muted-foreground mb-8 max-w-md">
            Drop any Kaggle-format credit card CSV. Every row will be scored and visualised instantly.
          </p>
          <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleChange} />
          <button
            onClick={() => inputRef.current?.click()}
            className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
          >
            Browse Files
          </button>

          {formatError && (
            <div className="mt-6 flex items-start gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 max-w-lg text-left">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formatError}</span>
            </div>
          )}

          <div className="mt-8 text-xs text-muted-foreground flex items-center gap-4">
            <span className="flex items-center gap-1"><FileType className="w-4 h-4" /> .csv only</span>
            <span>•</span>
            <span>Columns: Time, V1–V28, Amount</span>
            <span>•</span>
            <span>Max 5,000 rows</span>
          </div>
        </div>
      )}

      {/* Results */}
      {typedResult && chartData && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">

          {/* Summary stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-card rounded-2xl p-6 border border-border shadow-lg">
              <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Processed</span>
              </div>
              <p className="text-3xl font-display font-bold text-foreground">
                {typedResult.totalProcessed.toLocaleString()}
              </p>
            </div>
            <div className="bg-card rounded-2xl p-6 border border-destructive/30 shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-destructive/10 rounded-bl-full" />
              <div className="flex items-center gap-3 mb-2 text-destructive">
                <ShieldAlert className="w-5 h-5" />
                <span className="font-medium">Fraud Detected</span>
              </div>
              <p className="text-3xl font-display font-bold text-foreground">
                {typedResult.fraudDetected.toLocaleString()}
              </p>
            </div>
            <div className="bg-card rounded-2xl p-6 border border-border shadow-lg">
              <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <span className="font-medium">Hit Rate</span>
              </div>
              <p className="text-3xl font-display font-bold text-foreground">
                {formatPercentage(typedResult.fraudDetected / typedResult.totalProcessed)}
              </p>
            </div>
            <div className="bg-card rounded-2xl p-6 border border-border shadow-lg">
              <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                <Activity className="w-5 h-5 text-primary" />
                <span className="font-medium">Compute Time</span>
              </div>
              <p className="text-3xl font-display font-bold text-foreground">
                {typedResult.processingTimeMs.toFixed(0)}
                <span className="text-lg text-muted-foreground ml-1">ms</span>
              </p>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Fraud vs Legit donut */}
            <div className="bg-card rounded-2xl border border-border/50 shadow-lg p-6">
              <h3 className="text-sm font-semibold text-foreground mb-1">Fraud vs Legitimate</h3>
              <p className="text-xs text-muted-foreground mb-4">Transaction verdict breakdown</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chartData.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-2">
                {chartData.pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: d.color }} />
                    {d.name} ({d.value.toLocaleString()})
                  </div>
                ))}
              </div>
            </div>

            {/* Risk level bar chart */}
            <div className="bg-card rounded-2xl border border-border/50 shadow-lg p-6">
              <h3 className="text-sm font-semibold text-foreground mb-1">Risk Level Distribution</h3>
              <p className="text-xs text-muted-foreground mb-4">Transactions by risk tier</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData.riskData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.4)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.riskData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Probability histogram */}
            <div className="bg-card rounded-2xl border border-border/50 shadow-lg p-6">
              <h3 className="text-sm font-semibold text-foreground mb-1">Fraud Probability Distribution</h3>
              <p className="text-xs text-muted-foreground mb-4">Transactions binned by score (0–100%)</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData.bins} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.4)" vertical={false} />
                  <XAxis dataKey="range" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Total" fill="hsl(var(--primary)/0.4)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="fraudCount" name="Fraud" fill={COLORS.fraud} radius={[3, 3, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* File + model info */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>File: <span className="text-foreground font-medium">{file?.name}</span></span>
            <span>•</span>
            <span>Model:</span>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium text-xs uppercase tracking-wide">
              {typedResult.modelUsed === "logistic_regression" ? "Logistic Regression" : "Random Forest"}
            </span>
          </div>

          {/* Results table */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-border/50 bg-secondary/10">
              <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
                <FileUp className="w-5 h-5 text-primary" /> Row-by-Row Results
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  (showing first 200 of {typedResult.results.length.toLocaleString()})
                </span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/30">
                  <tr>
                    <th className="px-6 py-4 font-medium">#</th>
                    <th className="px-6 py-4 font-medium">Fraud Probability</th>
                    <th className="px-6 py-4 font-medium">Risk Level</th>
                    <th className="px-6 py-4 font-medium">Verdict</th>
                    <th className="px-6 py-4 font-medium">Top Risk Factors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {typedResult.results.slice(0, 200).map((r, i) => (
                    <tr key={i} className={cn("hover:bg-secondary/20", r.isFraud && "bg-destructive/5")}>
                      <td className="px-6 py-4 font-mono text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold w-12">{formatPercentage(r.fraudProbability)}</span>
                          <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", r.isFraud ? "bg-destructive" : "bg-green-500")}
                              style={{ width: `${r.fraudProbability * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                          r.riskLevel === "critical" ? "bg-destructive/20 text-destructive" :
                          r.riskLevel === "high" ? "bg-orange-500/20 text-orange-400" :
                          r.riskLevel === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-green-500/20 text-green-400"
                        )}>
                          {r.riskLevel.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("font-semibold text-xs", r.isFraud ? "text-destructive" : "text-green-400")}>
                          {r.isFraud ? "⚠ FRAUD" : "✓ LEGIT"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {r.riskFactors.slice(0, 2).map((f, j) => (
                            <span key={j} className="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground truncate max-w-[140px]">
                              {f}
                            </span>
                          ))}
                          {r.riskFactors.length > 2 && (
                            <span className="text-xs text-muted-foreground px-1 py-1">+{r.riskFactors.length - 2}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {typedResult.results.length > 200 && (
                <div className="p-4 text-center text-sm text-muted-foreground border-t border-border/50 bg-secondary/10">
                  Showing first 200 of {typedResult.results.length.toLocaleString()} rows.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
