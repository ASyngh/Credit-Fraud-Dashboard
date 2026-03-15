import { Layout } from "@/components/Layout";
import { ShieldAlert, AlertTriangle, CheckCircle, DollarSign, TrendingUp, Activity, Cpu } from "lucide-react";
import { 
  useGetInsightsSummary, 
  useGetInsightsTrends, 
  useListTransactions,
  useGetModelsInfo
} from "@workspace/api-client-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Link } from "wouter";
import { useModel } from "@/context/ModelContext";

function StatCard({ title, value, subtitle, icon: Icon, colorClass, loading }: any) {
  return (
    <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-lg shadow-black/20 hover:border-border transition-all duration-300 group relative overflow-hidden">
      <div className={`absolute top-0 right-0 p-32 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity rounded-bl-[100%] ${colorClass}`}></div>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 shadow-inner`}>
          <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 w-24 bg-secondary rounded animate-pulse" />
          <div className="h-4 w-32 bg-secondary rounded animate-pulse" />
        </div>
      ) : (
        <div>
          <h3 className="text-3xl font-display font-bold text-foreground tracking-tight">{value}</h3>
          <p className="text-sm font-medium text-muted-foreground mt-1">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-2 opacity-80">{subtitle}</p>}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { model } = useModel();
  const { data: summary, isLoading: isLoadingSummary } = useGetInsightsSummary();
  const { data: trends, isLoading: isLoadingTrends } = useGetInsightsTrends();
  const { data: transactionsRes, isLoading: isLoadingTransactions } = useListTransactions({ limit: 5 });
  const { data: modelsInfo } = useGetModelsInfo();

  const currentMetrics = model === 'random_forest' 
    ? modelsInfo?.randomForest?.metrics 
    : modelsInfo?.logisticRegression?.metrics;

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-4 rounded-xl shadow-xl shadow-black/50">
          <p className="text-sm font-bold text-foreground mb-2">{label}</p>
          {payload.map((entry: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-semibold text-foreground">
                {entry.name.toLowerCase().includes('rate') ? formatPercentage(entry.value) : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Layout>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-display font-bold text-foreground">Dashboard Overview</h1>
            <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              {model === 'random_forest' ? 'Random Forest' : 'Logistic Regression'}
            </div>
            {currentMetrics && (
              <div className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-mono font-medium border border-border">
                AUC: {(currentMetrics.auc * 100).toFixed(1)}%
              </div>
            )}
          </div>
          <p className="text-muted-foreground">Real-time credit card fraud analytics and monitoring.</p>
        </div>
        <Link 
          href="/prediction"
          className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] flex items-center gap-2"
        >
          <Activity className="w-4 h-4" />
          New Prediction
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Transactions" 
          value={summary?.totalTransactions?.toLocaleString() || "0"} 
          icon={Activity}
          colorClass="bg-blue-500"
          loading={isLoadingSummary}
        />
        <StatCard 
          title="Fraud Detected" 
          value={summary?.totalFraudDetected?.toLocaleString() || "0"} 
          icon={ShieldAlert}
          colorClass="bg-destructive"
          loading={isLoadingSummary}
        />
        <StatCard 
          title="Fraud Rate" 
          value={summary ? formatPercentage(summary.fraudRate) : "0%"} 
          icon={TrendingUp}
          colorClass="bg-warning"
          loading={isLoadingSummary}
        />
        <StatCard 
          title="Amount Saved" 
          value={summary ? formatCurrency(summary.savedAmount) : "$0"} 
          icon={DollarSign}
          colorClass="bg-success"
          loading={isLoadingSummary}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-card rounded-2xl p-6 border border-border/50 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-display font-bold text-foreground">Fraud Detection Trends</h3>
          </div>
          <div className="h-[300px] w-full">
            {isLoadingTrends ? (
              <div className="w-full h-full bg-secondary/50 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends?.daily || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFraud" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={customTooltip} />
                  <Area type="monotone" dataKey="fraudCount" name="Fraud Cases" stroke="hsl(var(--destructive))" strokeWidth={3} fillOpacity={1} fill="url(#colorFraud)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-lg">
          <h3 className="text-lg font-display font-bold text-foreground mb-6">Risk Distribution</h3>
          <div className="h-[300px] w-full flex items-center justify-center flex-col relative">
            {isLoadingSummary ? (
              <div className="w-48 h-48 rounded-full border-8 border-secondary animate-pulse" />
            ) : (
               <div className="text-center">
                 <div className="relative w-48 h-48 mx-auto mb-4">
                   <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                     <circle cx="50" cy="50" r="40" stroke="hsl(var(--secondary))" strokeWidth="12" fill="none" />
                     <circle cx="50" cy="50" r="40" stroke="hsl(var(--destructive))" strokeWidth="12" fill="none" strokeDasharray={`${summary?.fraudRate ? summary.fraudRate * 251 : 0} 251`} className="transition-all duration-1000 ease-out" />
                   </svg>
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-3xl font-bold text-foreground">{summary ? formatPercentage(summary.fraudRate) : '0%'}</span>
                     <span className="text-xs text-muted-foreground">Fraud</span>
                   </div>
                 </div>
                 <div className="flex justify-center gap-4 text-sm mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-secondary"></div>
                      <span className="text-muted-foreground">Legitimate</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-destructive shadow-[0_0_8px_hsl(var(--destructive))]"></div>
                      <span className="text-foreground">Fraud</span>
                    </div>
                 </div>
               </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-border/50 flex justify-between items-center bg-secondary/20">
          <h3 className="text-lg font-display font-bold text-foreground">Recent Transactions</h3>
          <Link href="/insights" className="text-sm text-primary hover:underline">View Full Analysis</Link>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/20">
              <tr>
                <th className="px-6 py-4 font-medium">Transaction ID</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Merchant</th>
                <th className="px-6 py-4 font-medium">Risk Level</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoadingTransactions ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-6 py-4"><div className="h-6 bg-secondary/50 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : transactionsRes?.transactions?.length ? (
                transactionsRes.transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-muted-foreground">...{t.id.slice(-8)}</td>
                    <td className="px-6 py-4 font-medium text-foreground">{formatCurrency(t.amount)}</td>
                    <td className="px-6 py-4 text-foreground">{t.merchantName}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                        ${t.riskLevel === 'critical' ? 'bg-destructive/20 text-destructive border border-destructive/30' :
                          t.riskLevel === 'high' ? 'bg-warning/20 text-warning border border-warning/30' :
                          t.riskLevel === 'medium' ? 'bg-primary/20 text-primary border border-primary/30' :
                          'bg-success/20 text-success border border-success/30'}`}>
                        {t.riskLevel.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {t.isFraud ? (
                        <div className="flex items-center text-destructive gap-1.5 font-medium">
                          <AlertTriangle className="w-4 h-4" /> Blocked
                        </div>
                      ) : (
                        <div className="flex items-center text-success gap-1.5 font-medium">
                          <CheckCircle className="w-4 h-4" /> Approved
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
