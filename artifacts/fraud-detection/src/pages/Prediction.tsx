import { Layout } from "@/components/Layout";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePredictFraud } from "@workspace/api-client-react";
import { ShieldAlert, Cpu, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { cn, formatPercentage } from "@/lib/utils";

const formSchema = z.object({
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

type FormValues = z.infer<typeof formSchema>;

export default function Prediction() {
  const { mutate: predictFraud, data: result, isPending } = usePredictFraud();
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
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

  const cardPresent = watch("cardPresent");
  const onlineTransaction = watch("onlineTransaction");

  const onSubmit = (data: FormValues) => {
    predictFraud({ data }, {
      onSuccess: () => setSubmitted(true)
    });
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-foreground">Real-time Inference</h1>
        <p className="text-muted-foreground mt-2">Run individual transaction parameters through the ML model.</p>
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
                <p className="text-sm text-muted-foreground">Enter features for evaluation</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Amount (USD)</label>
                  <input 
                    type="number" step="0.01"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register("amount")}
                  />
                  {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Merchant Category</label>
                  <select 
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                    {...register("merchantCategory")}
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
                    {...register("hour")}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Day of Week (0=Mon)</label>
                  <input 
                    type="number"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register("dayOfWeek")}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Distance from Home (km)</label>
                  <input 
                    type="number" step="0.1"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register("distanceFromHome")}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Past 24h Transactions</label>
                  <input 
                    type="number"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register("numTransactionsLast24h")}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-foreground">Average Transaction Amount (Historical)</label>
                  <input 
                    type="number" step="0.01"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register("avgTransactionAmount")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/50">
                <div 
                  className={cn("p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between", cardPresent ? "bg-primary/10 border-primary" : "bg-background border-border hover:border-border/80")}
                  onClick={() => setValue("cardPresent", !cardPresent)}
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
                  onClick={() => setValue("onlineTransaction", !onlineTransaction)}
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
                <h3 className="text-lg font-display font-bold text-foreground mb-8 self-start">Model Output</h3>
                
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
