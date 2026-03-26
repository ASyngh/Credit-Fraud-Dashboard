import { Layout } from "@/components/Layout";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePredictFraud } from "@workspace/api-client-react";
import { ShieldAlert, Cpu, AlertTriangle, Info, CheckCircle2, SlidersHorizontal, Settings2, Zap } from "lucide-react";
import { cn, formatPercentage } from "@/lib/utils";
import { useModel } from "@/context/ModelContext";

const simpleFormSchema = z.object({
  amount: z.coerce.number().min(0, "Amount must be positive"),
  merchantCategory: z.string().min(1, "Required"),
  hour: z.coerce.number().min(0).max(23),
  dayOfWeek: z.coerce.number().min(0).max(6),
  distanceFromHome: z.coerce.number().min(0),
  cardPresent: z.boolean(),
  onlineTransaction: z.boolean(),
  numTransactionsLast24h: z.coerce.number().min(0),
  avgTransactionAmount: z.coerce.number().min(0),
});

const expertFormSchema = z.object({
  amount: z.coerce.number().min(0, "Amount must be positive"),
  time: z.coerce.number().min(0).max(172792),
  v1: z.coerce.number(), v2: z.coerce.number(), v3: z.coerce.number(), v4: z.coerce.number(),
  v5: z.coerce.number(), v6: z.coerce.number(), v7: z.coerce.number(), v8: z.coerce.number(),
  v9: z.coerce.number(), v10: z.coerce.number(), v11: z.coerce.number(), v12: z.coerce.number(),
  v13: z.coerce.number(), v14: z.coerce.number(), v15: z.coerce.number(), v16: z.coerce.number(),
  v17: z.coerce.number(), v18: z.coerce.number(), v19: z.coerce.number(), v20: z.coerce.number(),
  v21: z.coerce.number(), v22: z.coerce.number(), v23: z.coerce.number(), v24: z.coerce.number(),
  v25: z.coerce.number(), v26: z.coerce.number(), v27: z.coerce.number(), v28: z.coerce.number(),
});

type SimpleFormValues = z.infer<typeof simpleFormSchema>;
type ExpertFormValues = z.infer<typeof expertFormSchema>;

export default function Prediction() {
  const { model } = useModel();
  const { mutate: predictFraud, data: result, isPending } = usePredictFraud();
  const [submitted, setSubmitted] = useState(false);
  const [mode, setMode] = useState<"simple" | "expert">("simple");

  const simpleForm = useForm<SimpleFormValues>({
    resolver: zodResolver(simpleFormSchema),
    defaultValues: {
      amount: 150.00,
      merchantCategory: "retail",
      hour: 14,
      dayOfWeek: 2,
      distanceFromHome: 12.5,
      cardPresent: true,
      onlineTransaction: false,
      numTransactionsLast24h: 3,
      avgTransactionAmount: 85.50,
    }
  });

  const expertForm = useForm<ExpertFormValues>({
    resolver: zodResolver(expertFormSchema),
    defaultValues: {
      amount: 150.00,
      time: 3600,
      v1: 0, v2: 0, v3: 0, v4: 0, v5: 0, v6: 0, v7: 0, v8: 0, v9: 0, v10: 0, v11: 0, v12: 0, v13: 0, v14: 0,
      v15: 0, v16: 0, v17: 0, v18: 0, v19: 0, v20: 0, v21: 0, v22: 0, v23: 0, v24: 0, v25: 0, v26: 0, v27: 0, v28: 0,
    }
  });

  const TOP_14_FEATURES = ["v14", "v10", "v12", "v17", "v4", "v3", "v11", "v16", "v2", "v9", "v7", "v21", "v19", "v18"];

  const fillPresets = (isFraud: boolean) => {
    expertForm.setValue("amount", isFraud ? 122.21 : 88.29);
    expertForm.setValue("time", isFraud ? 40000 : 90000);
    const fraudStats: Record<string, number> = {
      v14: -6.97, v10: -5.68, v12: -6.26, v17: -6.67, v4: 4.54, v3: -7.03, v11: 3.80, v16: -4.14, v2: 3.62, v9: -2.58, v7: -5.57, v21: 0.71, v19: 0.68, v18: -2.25
    };
    const normalStats: Record<string, number> = {
      v14: 0.01, v10: 0.01, v12: 0.01, v17: 0.01, v4: -0.01, v3: 0.01, v11: -0.01, v16: 0.01, v2: -0.01, v9: 0, v7: 0.01, v21: 0, v19: 0, v18: 0
    };
    
    TOP_14_FEATURES.forEach(f => {
      expertForm.setValue(f as keyof ExpertFormValues, isFraud ? fraudStats[f] : normalStats[f]);
    });
  };

  const cardPresent = simpleForm.watch("cardPresent");
  const onlineTransaction = simpleForm.watch("onlineTransaction");

  const onSimpleSubmit = (data: SimpleFormValues) => {
    predictFraud({ data: { ...data, model } }, {
      onSuccess: () => setSubmitted(true)
    });
  };

  const onExpertSubmit = (data: ExpertFormValues) => {
    predictFraud({ data: { ...data, model } }, {
      onSuccess: () => setSubmitted(true)
    });
  };

  return (
    <Layout>
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">Real-time Inference</h1>
          <p className="text-muted-foreground mt-2">Run individual transaction parameters through the ML model.</p>
        </div>
        
        <div className="flex bg-secondary/50 p-1 rounded-xl border border-border">
          <button
            onClick={() => setMode("simple")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
              mode === "simple" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Simple Mode
          </button>
          <button
            onClick={() => setMode("expert")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
              mode === "expert" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Settings2 className="w-4 h-4" />
            Expert Mode (PCA)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-card rounded-2xl border border-border/50 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-accent"></div>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Cpu className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-foreground">Transaction Details</h3>
                <p className="text-sm text-muted-foreground">
                  {mode === "simple" ? "Enter business features" : "Enter raw PCA components"}
                </p>
              </div>
            </div>

            {mode === "simple" ? (
              <form onSubmit={simpleForm.handleSubmit(onSimpleSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Amount (USD)</label>
                    <input 
                      type="number" step="0.01"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      {...simpleForm.register("amount")}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Merchant Category</label>
                    <select 
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                      {...simpleForm.register("merchantCategory")}
                    >
                      <option value="retail">Retail & Shopping</option>
                      <option value="food">Food & Dining</option>
                      <option value="travel">Travel & Transport</option>
                      <option value="online">Online Services</option>
                      <option value="entertainment">Entertainment</option>
                      <option value="gas">Gas & Auto</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Hour of Day (0-23)</label>
                    <input 
                      type="number"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      {...simpleForm.register("hour")}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Day of Week (0=Mon)</label>
                    <input 
                      type="number"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      {...simpleForm.register("dayOfWeek")}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Distance from Home (km)</label>
                    <input 
                      type="number" step="0.1"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      {...simpleForm.register("distanceFromHome")}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Past 24h Transactions</label>
                    <input 
                      type="number"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      {...simpleForm.register("numTransactionsLast24h")}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-foreground">Average Transaction Amount (Historical)</label>
                    <input 
                      type="number" step="0.01"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      {...simpleForm.register("avgTransactionAmount")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/50">
                  <div 
                    className={cn("p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between", cardPresent ? "bg-primary/10 border-primary" : "bg-background border-border hover:border-border/80")}
                    onClick={() => {
                      simpleForm.setValue("cardPresent", true);
                      simpleForm.setValue("onlineTransaction", false);
                    }}
                  >
                    <div>
                      <p className="font-medium text-foreground">Card Present</p>
                      <p className="text-xs text-muted-foreground">Physical terminal scan</p>
                    </div>
                    <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", cardPresent ? "border-primary" : "border-muted-foreground")}>
                      {cardPresent && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                    </div>
                  </div>

                  <div 
                    className={cn("p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between", onlineTransaction ? "bg-primary/10 border-primary" : "bg-background border-border hover:border-border/80")}
                    onClick={() => {
                      simpleForm.setValue("onlineTransaction", true);
                      simpleForm.setValue("cardPresent", false);
                    }}
                  >
                    <div>
                      <p className="font-medium text-foreground">Online Transaction</p>
                      <p className="text-xs text-muted-foreground">E-commerce / Web</p>
                    </div>
                    <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", onlineTransaction ? "border-primary" : "border-muted-foreground")}>
                      {onlineTransaction && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isPending}
                  className="w-full py-4 mt-6 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none"
                >
                  {isPending ? "Evaluating Model..." : "Analyze Transaction"}
                </button>
              </form>
            ) : (
              <form onSubmit={expertForm.handleSubmit(onExpertSubmit)} className="space-y-6">
                 <div className="flex gap-4 mb-6">
                    <button type="button" onClick={() => fillPresets(true)} className="flex-1 py-3 bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_hsl(var(--destructive)/0.2)] hover:shadow-[0_0_25px_hsl(var(--destructive)/0.4)] hover:-translate-y-0.5 backdrop-blur-md group relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-destructive/0 via-destructive/10 to-destructive/0 -translate-x-full group-hover:animate-shimmer" />
                      <Zap className="w-4 h-4" /> Typical Fraud Transaction
                    </button>
                    <button type="button" onClick={() => fillPresets(false)} className="flex-1 py-3 bg-success/10 text-success border border-success/30 hover:bg-success/20 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_hsl(var(--success)/0.2)] hover:shadow-[0_0_25px_hsl(var(--success)/0.4)] hover:-translate-y-0.5 backdrop-blur-md group relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-success/0 via-success/10 to-success/0 -translate-x-full group-hover:animate-shimmer" />
                      <CheckCircle2 className="w-4 h-4" /> Typical Normal Transaction
                    </button>
                 </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Amount</label>
                    <input 
                      type="number" step="0.01"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      {...expertForm.register("amount")}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Time (seconds)</label>
                    <input 
                      type="number" step="1"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      {...expertForm.register("time")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/50">
                  {TOP_14_FEATURES.map((feat) => (
                    <div key={feat} className="space-y-2 group relative">
                      <label className="text-xs font-medium text-foreground flex items-center gap-1 uppercase">
                        {feat}
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </label>
                      <input 
                        type="number" step="0.01"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                        {...expertForm.register(feat as keyof ExpertFormValues)}
                      />
                      <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-secondary text-secondary-foreground text-xs p-2 rounded shadow-xl -top-10 left-0 w-48 pointer-events-none z-10">
                        Top {feat.toUpperCase()} component - highly important
                      </div>
                    </div>
                  ))}
                </div>

                {Array.from({ length: 28 }, (_, i) => `v${i + 1}`).map((feat) => (
                  !TOP_14_FEATURES.includes(feat) && (
                    <input key={feat} type="hidden" {...expertForm.register(feat as keyof ExpertFormValues)} />
                  )
                ))}

                <button 
                  type="submit" 
                  disabled={isPending}
                  className="w-full py-4 mt-6 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none"
                >
                  {isPending ? "Evaluating Model..." : "Analyze Transaction"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-5">
          {!submitted && !result && !isPending ? (
            <div className="bg-card h-full min-h-[400px] rounded-2xl border border-border/50 border-dashed flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
                <ShieldAlert className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-display font-bold text-foreground mb-2">Awaiting Data</h3>
              <p className="text-muted-foreground max-w-sm">
                Submit transaction details to run the fraud detection model and view risk probability scores.
              </p>
            </div>
          ) : isPending ? (
            <div className="bg-card h-full min-h-[400px] rounded-2xl border border-border/50 flex flex-col items-center justify-center p-8">
               <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
               <p className="text-lg font-medium text-foreground animate-pulse">Running Neural Networks...</p>
            </div>
          ) : result && (
            <div className="bg-card rounded-2xl border border-border/50 shadow-2xl overflow-hidden relative animate-in fade-in slide-in-from-bottom-8 duration-500">
              {result.isFraud && <div className="absolute inset-0 bg-destructive/5 pointer-events-none z-0" />}
              <div className="p-8 relative z-10 flex flex-col items-center border-b border-border/50">
                <div className="flex justify-between w-full mb-8">
                  <h3 className="text-lg font-display font-bold text-foreground">Model Output</h3>
                  <span className="px-2.5 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-md font-mono">
                    {result.modelUsed}
                  </span>
                </div>
                
                {/* SVG Gauge */}
                <div className="relative w-48 h-48 mb-6">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-180">
                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="hsl(var(--secondary))" strokeWidth="12" strokeLinecap="round" />
                    <path 
                      d="M 10 50 A 40 40 0 0 1 90 50" 
                      fill="none" 
                      stroke={result.isFraud ? "hsl(var(--destructive))" : "hsl(var(--success))"} 
                      strokeWidth="12" 
                      strokeLinecap="round" 
                      strokeDasharray="125.6"
                      strokeDashoffset={125.6 - (result.fraudProbability * 125.6)}
                      className="transition-all duration-1000 ease-out drop-shadow-lg" 
                    />
                  </svg>
                  <div className="absolute inset-x-0 bottom-6 flex flex-col items-center">
                    <span className="text-4xl font-display font-bold text-foreground tracking-tighter">
                      {formatPercentage(result.fraudProbability)}
                    </span>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mt-1">
                      Probability
                    </span>
                  </div>
                </div>

                <div className={cn(
                  "px-6 py-2 rounded-full font-bold text-lg flex items-center gap-2 shadow-lg",
                  result.riskLevel === 'critical' ? "bg-destructive text-destructive-foreground shadow-destructive/30" :
                  result.riskLevel === 'high' ? "bg-warning text-warning-foreground shadow-warning/30" :
                  result.riskLevel === 'medium' ? "bg-primary text-primary-foreground shadow-primary/30" :
                  "bg-success text-success-foreground shadow-success/30"
                )}>
                  {result.isFraud ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  {result.riskLevel.toUpperCase()} RISK
                </div>
              </div>

              <div className="p-8 relative z-10 bg-secondary/10">
                <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  Key Risk Factors
                </h4>
                {result.riskFactors.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.riskFactors.map((factor, i) => (
                      <span key={i} className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-muted-foreground">
                        {factor}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No elevated risk factors detected in this transaction.</p>
                )}
                
                <div className="mt-8 pt-6 border-t border-border/50 flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Model Confidence</span>
                  <span className="font-semibold text-foreground">{formatPercentage(result.confidence)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
