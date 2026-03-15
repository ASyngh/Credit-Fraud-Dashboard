import { Layout } from "@/components/Layout";
import { useState, useRef } from "react";
import Papa from "papaparse";
import { useUploadTransactions } from "@workspace/api-client-react";
import { UploadCloud, FileType, CheckCircle, AlertTriangle, FileUp, ListRestart, ShieldAlert } from "lucide-react";
import { cn, formatCurrency, formatPercentage } from "@/lib/utils";

export default function Upload() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { mutate: uploadBatch, data: result, isPending: isUploading } = useUploadTransactions();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setIsParsing(false);
        // Map CSV rows to TransactionInput schema
        const mapped = results.data.map((row: any) => ({
          amount: parseFloat(row.amount || 0),
          merchantCategory: row.merchantCategory || 'other',
          hour: parseInt(row.hour || 12, 10),
          dayOfWeek: parseInt(row.dayOfWeek || 0, 10),
          distanceFromHome: parseFloat(row.distanceFromHome || 0),
          cardPresent: String(row.cardPresent).toLowerCase() === 'true' || row.cardPresent === '1',
          onlineTransaction: String(row.onlineTransaction).toLowerCase() === 'true' || row.onlineTransaction === '1',
          numTransactionsLast24h: parseInt(row.numTransactionsLast24h || 0, 10),
          avgTransactionAmount: parseFloat(row.avgTransactionAmount || 0),
        }));

        uploadBatch({ data: { transactions: mapped } });
      },
      error: () => {
        setIsParsing(false);
        alert("Failed to parse CSV file.");
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const isProcessing = isParsing || isUploading;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-foreground">Batch Upload</h1>
        <p className="text-muted-foreground mt-2">Upload CSV data to process thousands of transactions in seconds.</p>
      </div>

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
              <p className="text-lg font-bold text-foreground">{isParsing ? "Parsing CSV..." : "Analyzing Batch Data..."}</p>
            </div>
          )}

          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6 shadow-xl shadow-black/20">
            <UploadCloud className={cn("w-10 h-10 transition-colors", dragActive ? "text-primary" : "text-muted-foreground")} />
          </div>
          <h3 className="text-2xl font-display font-bold text-foreground mb-2">
            Drag & Drop CSV
          </h3>
          <p className="text-muted-foreground mb-8 max-w-md">
            Upload historical or batched transaction logs. The model will score each row and return a detailed report.
          </p>
          <input 
            ref={inputRef} type="file" accept=".csv" className="hidden" 
            onChange={handleChange} 
          />
          <button 
            onClick={() => inputRef.current?.click()}
            className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
          >
            Browse Files
          </button>
          
          <div className="mt-8 text-xs text-muted-foreground flex items-center gap-4">
            <span className="flex items-center gap-1"><FileType className="w-4 h-4"/> .csv only</span>
            <span>•</span>
            <span>Required headers: amount, merchantCategory, hour, etc.</span>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
          
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-card rounded-2xl p-6 border border-border shadow-lg">
              <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                <ListRestart className="w-5 h-5" /> <span className="font-medium">Processed</span>
              </div>
              <p className="text-3xl font-display font-bold text-foreground">{result.totalProcessed}</p>
            </div>
            <div className="bg-card rounded-2xl p-6 border border-destructive/30 shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-destructive/10 rounded-bl-full" />
              <div className="flex items-center gap-3 mb-2 text-destructive">
                <ShieldAlert className="w-5 h-5" /> <span className="font-medium">Fraud Detected</span>
              </div>
              <p className="text-3xl font-display font-bold text-foreground">{result.fraudDetected}</p>
            </div>
            <div className="bg-card rounded-2xl p-6 border border-border shadow-lg">
              <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                <AlertTriangle className="w-5 h-5 text-warning" /> <span className="font-medium">Hit Rate</span>
              </div>
              <p className="text-3xl font-display font-bold text-foreground">
                {formatPercentage(result.fraudDetected / result.totalProcessed)}
              </p>
            </div>
            <div className="bg-card rounded-2xl p-6 border border-border shadow-lg">
              <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                <Activity className="w-5 h-5 text-primary" /> <span className="font-medium">Compute Time</span>
              </div>
              <p className="text-3xl font-display font-bold text-foreground">
                {result.processingTimeMs.toFixed(0)}<span className="text-lg text-muted-foreground ml-1">ms</span>
              </p>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-border/50 flex justify-between items-center bg-secondary/10">
              <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
                <FileUp className="w-5 h-5 text-primary" /> Analysis Results
              </h3>
              <button 
                onClick={() => { setFile(null); uploadBatch({data: {transactions: []}} as any) }} // Using a small hack to reset via cache invalidation or just page refresh is better but state wipe works
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Clear & Upload New
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/30">
                  <tr>
                    <th className="px-6 py-4 font-medium">Tx ID</th>
                    <th className="px-6 py-4 font-medium">Risk Probability</th>
                    <th className="px-6 py-4 font-medium">Level</th>
                    <th className="px-6 py-4 font-medium">Factors Identified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {result.results.slice(0, 100).map((r, i) => (
                    <tr key={i} className="hover:bg-secondary/20">
                      <td className="px-6 py-4 font-mono text-muted-foreground">...{r.transactionId.slice(-6)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold w-12">{formatPercentage(r.fraudProbability)}</span>
                          <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full", r.isFraud ? "bg-destructive" : "bg-success")} 
                              style={{ width: `${r.fraudProbability * 100}%` }} 
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                          ${r.riskLevel === 'critical' ? 'bg-destructive/20 text-destructive' :
                            r.riskLevel === 'high' ? 'bg-warning/20 text-warning' :
                            r.riskLevel === 'medium' ? 'bg-primary/20 text-primary' :
                            'bg-success/20 text-success'}`}>
                          {r.riskLevel.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {r.riskFactors.slice(0, 2).map((f, j) => (
                            <span key={j} className="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground truncate max-w-[120px]">
                              {f}
                            </span>
                          ))}
                          {r.riskFactors.length > 2 && <span className="text-xs text-muted-foreground px-1 py-1">+{r.riskFactors.length - 2}</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.results.length > 100 && (
                <div className="p-4 text-center text-sm text-muted-foreground border-t border-border/50 bg-secondary/10">
                  Showing first 100 results. Download full report for all {result.results.length} rows.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
