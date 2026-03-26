import { Layout } from "@/components/Layout";
import { 
  useGetFeatureImportance, 
  useGetInsightsTrends, 
  useGetPcaAnalysis,
  useGetFraudPatterns,
  useGetModelsInfo
} from "@workspace/api-client-react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, 
  LineChart, Line, Legend, AreaChart, Area, ComposedChart 
} from "recharts";
import { useModel } from "@/context/ModelContext";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { Activity, ShieldAlert, Database, Cpu } from "lucide-react";

export default function Insights() {
  const { model } = useModel();
  
  const { data: features, isLoading: isFeaturesLoading } = useGetFeatureImportance({ model });
  const { data: trends, isLoading: isTrendsLoading } = useGetInsightsTrends();
  const { data: pcaAnalysis, isLoading: isPcaLoading } = useGetPcaAnalysis();
  const { data: fraudPatterns, isLoading: isPatternsLoading } = useGetFraudPatterns();
  const { data: modelsInfo, isLoading: isModelsInfoLoading } = useGetModelsInfo();

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-4 rounded-xl shadow-xl z-50 relative">
          <p className="text-sm font-bold text-foreground mb-1">{label}</p>
          {payload.map((entry: any, i: number) => (
            <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <span>{entry.name}:</span>
              <span className="text-foreground font-semibold">
                {entry.name.toLowerCase().includes('rate') || entry.name.toLowerCase().includes('probability') 
                  ? formatPercentage(entry.value) 
                  : typeof entry.value === 'number' && !Number.isInteger(entry.value) 
                    ? entry.value.toFixed(4) 
                    : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const currentModelMetrics = model === 'random_forest' ? modelsInfo?.randomForest?.metrics : modelsInfo?.logisticRegression?.metrics;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-foreground">Model Insights</h1>
        <p className="text-muted-foreground mt-2">Deep dive into model architecture, feature importance, and historical analytics.</p>
      </div>

      <div className="space-y-8">
        {/* Panel 1: Fraud Rate Over Time & Panel 4: Fraud vs Normal Transaction Patterns (Top Section) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card rounded-2xl p-6 border border-border/50 shadow-lg">
            <div className="mb-6">
              <h3 className="text-lg font-display font-bold text-foreground">Fraud Rate Over Time (48h)</h3>
              <p className="text-sm text-muted-foreground">Total transaction volume vs detected fraud rate.</p>
            </div>
            <div className="h-[300px] w-full">
              {isTrendsLoading ? (
                 <div className="w-full h-full bg-secondary/50 rounded-xl animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trends?.hourly || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}h`} />
                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v * 100).toFixed(1)}%`} />
                    <Tooltip content={customTooltip} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar yAxisId="left" dataKey="total" name="Total Transactions" fill="hsl(var(--primary))" fillOpacity={0.2} radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="fraudRate" name="Fraud Rate" stroke="hsl(var(--destructive))" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-gradient-to-br from-primary/10 to-transparent p-6 rounded-2xl border border-primary/20 shadow-lg flex-1 flex flex-col justify-center">
              <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Dataset Summary
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                  <span className="text-muted-foreground text-sm">Total Transactions</span>
                  <span className="font-bold text-foreground">{fraudPatterns?.datasetSummary?.totalTransactions?.toLocaleString() || "-"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                  <span className="text-muted-foreground text-sm">Fraud Cases</span>
                  <span className="font-bold text-destructive">{fraudPatterns?.datasetSummary?.fraudCount?.toLocaleString() || "-"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Base Fraud Rate</span>
                  <span className="font-bold text-foreground">{fraudPatterns?.datasetSummary?.fraudRate != null ? formatPercentage(fraudPatterns.datasetSummary.fraudRate) : "-"}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 h-1/2">
               <div className="bg-card rounded-xl p-4 border border-border/50 shadow flex flex-col justify-center items-center text-center">
                 <p className="text-xs text-muted-foreground mb-1">Normal Avg</p>
                 <p className="text-xl font-bold text-foreground">
                   {fraudPatterns?.amountDistribution?.normal?.mean != null ? formatCurrency(fraudPatterns.amountDistribution.normal.mean) : "-"}
                 </p>
               </div>
               <div className="bg-card rounded-xl p-4 border border-destructive/30 shadow flex flex-col justify-center items-center text-center relative overflow-hidden">
                 <div className="absolute inset-0 bg-destructive/5" />
                 <p className="text-xs text-destructive mb-1 relative z-10">Fraud Avg</p>
                 <p className="text-xl font-bold text-foreground relative z-10">
                   {fraudPatterns?.amountDistribution?.fraud?.mean != null ? formatCurrency(fraudPatterns.amountDistribution.fraud.mean) : "-"}
                 </p>
               </div>
            </div>
          </div>
        </div>

        {/* Panel 2 & Panel 5 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Feature Importance */}
          <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-lg">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-display font-bold text-foreground">Feature Importance</h3>
                <p className="text-sm text-muted-foreground">Top 15 features for {model === 'random_forest' ? 'Random Forest' : 'Logistic Regression'}.</p>
              </div>
            </div>
            <div className="h-[400px] w-full">
              {isFeaturesLoading ? (
                 <div className="w-full h-full bg-secondary/50 rounded-xl animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(features?.features || []).slice(0, 15)} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="feature" type="category" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} width={80} />
                    <Tooltip content={customTooltip} cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.5 }} />
                    <Bar dataKey="importance" name="Importance Score" radius={[0, 4, 4, 0]}>
                      {(features?.features || []).slice(0, 15).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(189 100% ${max(20, 50 - index * 2)}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Model Performance Comparison */}
          <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-lg flex flex-col">
            <div className="mb-6">
              <h3 className="text-lg font-display font-bold text-foreground">Model Performance Comparison</h3>
              <p className="text-sm text-muted-foreground">Evaluation metrics on test dataset.</p>
            </div>
            
            {isModelsInfoLoading ? (
               <div className="w-full flex-1 bg-secondary/50 rounded-xl animate-pulse" />
            ) : (
              <div className="flex-1 flex flex-col gap-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary/20">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg font-medium">Metric</th>
                        <th className={`px-4 py-3 font-medium ${model === 'random_forest' ? 'bg-primary/20 text-primary' : ''}`}>Random Forest</th>
                        <th className={`px-4 py-3 rounded-tr-lg font-medium ${model === 'logistic_regression' ? 'bg-primary/20 text-primary' : ''}`}>Logistic Regression</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {['AUC', 'F1 Score', 'Precision', 'Recall', 'Accuracy'].map((metric, i) => {
                        const key = metric === 'F1 Score' ? 'f1' : metric.toLowerCase() as keyof typeof modelsInfo.randomForest.metrics;
                        return (
                          <tr key={i} className="hover:bg-secondary/10 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground">{metric}</td>
                            <td className={`px-4 py-3 font-mono ${model === 'random_forest' ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                              {formatPercentage(modelsInfo?.randomForest?.metrics?.[key] as number)}
                            </td>
                            <td className={`px-4 py-3 font-mono ${model === 'logistic_regression' ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                              {formatPercentage(modelsInfo?.logisticRegression?.metrics?.[key] as number)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-auto">
                   {['random_forest', 'logistic_regression'].map((m) => {
                     const mInfo = m === 'random_forest' ? modelsInfo?.randomForest : modelsInfo?.logisticRegression;
                     const isSelected = model === m;
                     return (
                       <div key={m} className={`p-4 rounded-xl border ${isSelected ? 'border-primary shadow-[0_0_15px_hsl(var(--primary)/0.15)]' : 'border-border/50 opacity-70'}`}>
                         <h5 className={`text-xs font-semibold uppercase mb-3 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                           {m === 'random_forest' ? 'Random Forest' : 'Logistic Regression'} Matrix
                         </h5>
                         <div className="grid grid-cols-2 gap-2 text-center text-xs">
                            <div className="bg-success/10 border border-success/20 p-2 rounded text-success">
                              <div className="font-mono text-sm font-bold">{mInfo?.metrics.tn.toLocaleString()}</div>
                              <div className="opacity-80">TN</div>
                            </div>
                            <div className="bg-warning/10 border border-warning/20 p-2 rounded text-warning">
                              <div className="font-mono text-sm font-bold">{mInfo?.metrics.fp.toLocaleString()}</div>
                              <div className="opacity-80">FP</div>
                            </div>
                            <div className="bg-destructive/10 border border-destructive/20 p-2 rounded text-destructive">
                              <div className="font-mono text-sm font-bold">{mInfo?.metrics.fn.toLocaleString()}</div>
                              <div className="opacity-80">FN</div>
                            </div>
                            <div className="bg-primary/10 border border-primary/20 p-2 rounded text-primary">
                              <div className="font-mono text-sm font-bold">{mInfo?.metrics.tp.toLocaleString()}</div>
                              <div className="opacity-80">TP</div>
                            </div>
                         </div>
                       </div>
                     );
                   })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel 3: PCA Feature Influence */}
        <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-lg">
          <div className="mb-6">
            <h3 className="text-lg font-display font-bold text-foreground">PCA Component Mean Values: Fraud vs Normal</h3>
            <p className="text-sm text-muted-foreground">Distribution shift of V1-V28 features for legitimate vs fraudulent transactions.</p>
          </div>
          <div className="h-[350px] w-full">
            {isPcaLoading ? (
               <div className="w-full h-full bg-secondary/50 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pcaAnalysis?.features || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="feature" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={customTooltip} cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.2 }} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Bar dataKey="normalMean" name="Normal Mean" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="fraudMean" name="Fraud Mean" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
}

function max(a: number, b: number) {
  return a > b ? a : b;
}
