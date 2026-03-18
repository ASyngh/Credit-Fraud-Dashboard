import { Layout } from "@/components/Layout";
import { useState, useRef } from "react";
import Papa from "papaparse";
import { useUploadTransactions } from "@workspace/api-client-react";
import { useModel } from "@/context/ModelContext";
import { UploadCloud, FileType, CheckCircle, AlertTriangle, FileUp, RotateCcw, ShieldAlert, Activity, Info } from "lucide-react";
import { cn, formatPercentage } from "@/lib/utils";

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

export default function Upload() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { model: selectedModel } = useModel();

  const { mutate: uploadBatch, data: result, isPending: isUploading, reset: resetMutation } = useUploadTransactions();

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
            `Unrecognized CSV format. Expected Kaggle-style columns: Time, V1–V28, Amount (and optionally Class). Found: ${headers.slice(0, 6).join(", ")}...`
          );
          return;
        }

        const rows = results.data as Record<string, string>[];
        setRowCount(rows.length);

        const mapped = rows.map(parseKaggleRow);

        uploadBatch({
          data: {
            transactions: mapped as any,
            model: selectedModel as any,
          },
        });
      },
      error: () => {
        setIsParsing(false);
        setFormatError("Failed to parse CSV file. Make sure it is a valid UTF-8 encoded CSV.");
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

  return (
    <Layout>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">Batch Upload</h1>
          <p className="text-muted-foreground mt-2">
            Upload a Kaggle-format CSV (Time, V1–V28, Amount) to score thousands of transactions instantly.
          </p>
        </div>
        {result && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Upload New File
          </button>
        )}
      </div>

      {/* Format Info Banner */}
      {!result && (
        <div className="mb-6 flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-2xl p-4 text-sm text-muted-foreground max-w-4xl mx-auto">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-foreground">Expected CSV format:</span>{" "}
            Kaggle Credit Card Fraud dataset — columns{" "}
            <code className="bg-secondary px-1 py-0.5 rounded text-xs font-mono text-foreground">Time</code>,{" "}
            <code className="bg-secondary px-1 py-0.5 rounded text-xs font-mono text-foreground">V1–V28</code>,{" "}
            <code className="bg-secondary px-1 py-0.5 rounded text-xs font-mono text-foreground">Amount</code>.
            The optional{" "}
            <code className="bg-secondary px-1 py-0.5 rounded text-xs font-mono text-foreground">Class</code>{" "}
            column is ignored — the model predicts it.
          </div>
        </div>
      )}

      {!result && (
        <div
          className={cn(
            "w-full max-w-4xl mx-auto rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-16 text-center relative overflow-hidden",
            dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-card hover:bg-secondary/20",
            isProcessing ? "opacity-50 pointer-events-none" : ""
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
                {isParsing ? "Parsing CSV..." : `Analyzing ${rowCount?.toLocaleString() ?? ""} rows...`}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Running {selectedModel === "logistic_regression" ? "Logistic Regression" : "Random Forest"} inference</p>
            </div>
          )}

          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6 shadow-xl shadow-black/20">
            <UploadCloud className={cn("w-10 h-10 transition-colors", dragActive ? "text-primary" : "text-muted-foreground")} />
          </div>
          <h3 className="text-2xl font-display font-bold text-foreground mb-2">Drag & Drop CSV</h3>
          <p className="text-muted-foreground mb-8 max-w-md">
            Drop any Kaggle-format credit card transaction CSV here. The active ML model will score every row.
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
            <span>No row limit</span>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-card rounded-2xl p-6 border border-border shadow-lg">
              <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Processed</span>
              </div>
              <p className="text-3xl font-display font-bold text-foreground">{result.totalProcessed.toLocaleString()}</p>
            </div>
            <div className="bg-card rounded-2xl p-6 border border-destructive/30 shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-destructive/10 rounded-bl-full" />
              <div className="flex items-center gap-3 mb-2 text-destructive">
                <ShieldAlert className="w-5 h-5" />
                <span className="font-medium">Fraud Detected</span>
              </div>
              <p className="text-3xl font-display font-bold text-foreground">{result.fraudDetected.toLocaleString()}</p>
            </div>
            <div className="bg-card rounded-2xl p-6 border border-border shadow-lg">
              <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <span className="font-medium">Hit Rate</span>
              </div>
              <p className="text-3xl font-display font-bold text-foreground">
                {formatPercentage(result.fraudDetected / result.totalProcessed)}
              </p>
            </div>
            <div className="bg-card rounded-2xl p-6 border border-border shadow-lg">
              <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                <Activity className="w-5 h-5 text-primary" />
                <span className="font-medium">Compute Time</span>
              </div>
              <p className="text-3xl font-display font-bold text-foreground">
                {result.processingTimeMs.toFixed(0)}<span className="text-lg text-muted-foreground ml-1">ms</span>
              </p>
            </div>
          </div>

          {/* Model Used Badge */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Model used:</span>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium text-xs uppercase tracking-wide">
              {result.modelUsed === "logistic_regression" ? "Logistic Regression" : "Random Forest"}
            </span>
            <span>•</span>
            <span>{file?.name}</span>
          </div>

          {/* Results Table */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-border/50 bg-secondary/10">
              <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
                <FileUp className="w-5 h-5 text-primary" /> Analysis Results
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/30">
                  <tr>
                    <th className="px-6 py-4 font-medium">#</th>
                    <th className="px-6 py-4 font-medium">Risk Probability</th>
                    <th className="px-6 py-4 font-medium">Level</th>
                    <th className="px-6 py-4 font-medium">Verdict</th>
                    <th className="px-6 py-4 font-medium">Top Risk Factors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {result.results.slice(0, 200).map((r, i) => (
                    <tr key={i} className={cn("hover:bg-secondary/20", r.isFraud && "bg-destructive/5")}>
                      <td className="px-6 py-4 font-mono text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold w-12">{formatPercentage(r.fraudProbability)}</span>
                          <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", r.isFraud ? "bg-destructive" : "bg-success")}
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
                        <span className={cn(
                          "font-semibold text-xs",
                          r.isFraud ? "text-destructive" : "text-green-400"
                        )}>
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
              {result.results.length > 200 && (
                <div className="p-4 text-center text-sm text-muted-foreground border-t border-border/50 bg-secondary/10">
                  Showing first 200 of {result.results.length.toLocaleString()} rows.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
