import { Layout } from "@/components/Layout";
import { useGetFeatureImportance, useGetInsightsTrends, useGetInsightsSummary } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LineChart, Line, Legend } from "recharts";

export default function Insights() {
  const { data: features, isLoading: isFeaturesLoading } = useGetFeatureImportance();
  const { data: trends, isLoading: isTrendsLoading } = useGetInsightsTrends();
  const { data: summary, isLoading: isSummaryLoading } = useGetInsightsSummary();

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-4 rounded-xl shadow-xl">
          <p className="text-sm font-bold text-foreground mb-1">{label}</p>
          {payload.map((entry: any, i: number) => (
            <div key={i} className="text-sm text-muted-foreground">
              {entry.name}: <span className="text-foreground font-semibold">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-foreground">Model Insights</h1>
        <p className="text-muted-foreground mt-2">Deep dive into model architecture, feature importance, and historical analytics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Feature Importance */}
        <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-lg">
          <div className="mb-6">
            <h3 className="text-lg font-display font-bold text-foreground">Global Feature Importance</h3>
            <p className="text-sm text-muted-foreground">SHAP values aggregated across all evaluated transactions.</p>
          </div>
          <div className="h-[350px] w-full">
            {isFeaturesLoading ? (
               <div className="w-full h-full bg-secondary/50 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={features?.features || []} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="feature" type="category" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={customTooltip} cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.5 }} />
                  <Bar dataKey="importance" name="Importance Score" radius={[0, 4, 4, 0]}>
                    {(features?.features || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(189 100% ${50 - index * 5}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Amount vs Fraud Trend */}
        <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-lg">
          <div className="mb-6">
            <h3 className="text-lg font-display font-bold text-foreground">Financial Impact Over Time</h3>
            <p className="text-sm text-muted-foreground">Correlation between transaction volume and fraud rates.</p>
          </div>
          <div className="h-[350px] w-full">
            {isTrendsLoading ? (
               <div className="w-full h-full bg-secondary/50 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends?.weekly || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={customTooltip} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="amount" name="Total Amount ($)" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  <Line yAxisId="right" type="monotone" dataKey="fraudRate" name="Fraud Rate (%)" stroke="hsl(var(--destructive))" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-primary/20 to-transparent p-6 rounded-2xl border border-primary/30">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">High Risk Flag Rate</h4>
          <p className="text-4xl font-display font-bold text-foreground">
            {isSummaryLoading ? "-" : summary?.highRiskTransactions?.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground mt-2">Transactions require manual review</p>
        </div>
        
        <div className="bg-gradient-to-br from-destructive/20 to-transparent p-6 rounded-2xl border border-destructive/30">
          <h4 className="text-sm font-semibold text-destructive uppercase tracking-wider mb-2">Avg Probability</h4>
          <p className="text-4xl font-display font-bold text-foreground">
            {isSummaryLoading ? "-" : summary?.avgFraudProbability ? (summary.avgFraudProbability * 100).toFixed(1) + "%" : "0%"}
          </p>
          <p className="text-sm text-muted-foreground mt-2">Baseline noise across network</p>
        </div>

        <div className="bg-gradient-to-br from-success/20 to-transparent p-6 rounded-2xl border border-success/30">
          <h4 className="text-sm font-semibold text-success uppercase tracking-wider mb-2">Total Value Secured</h4>
          <p className="text-4xl font-display font-bold text-foreground">
            {isSummaryLoading ? "-" : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(summary?.totalAmountAnalyzed || 0)}
          </p>
          <p className="text-sm text-muted-foreground mt-2">Analyzed by Aegis engine to date</p>
        </div>
      </div>
    </Layout>
  );
}
