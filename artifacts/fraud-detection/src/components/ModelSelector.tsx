import { useModel } from "@/context/ModelContext";
import { useGetModelsInfo } from "@workspace/api-client-react";
import { Network, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function ModelSelector() {
  const { model, setModel } = useModel();
  const { data: modelsInfo } = useGetModelsInfo();

  const currentMetrics = model === 'random_forest' 
    ? modelsInfo?.randomForest?.metrics 
    : modelsInfo?.logisticRegression?.metrics;

  return (
    <div className="flex flex-col gap-2 p-4 border-t border-border/50">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Active Engine
      </div>
      <div className="bg-background/50 p-1 rounded-xl border border-border flex">
        <button
          onClick={() => setModel("random_forest")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 text-xs font-medium rounded-lg transition-all",
            model === "random_forest"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
          )}
        >
          <Network className="w-4 h-4" />
          <span>Forest</span>
        </button>
        <button
          onClick={() => setModel("logistic_regression")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 text-xs font-medium rounded-lg transition-all",
            model === "logistic_regression"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
          )}
        >
          <TrendingUp className="w-4 h-4" />
          <span>LogReg</span>
        </button>
      </div>
      {currentMetrics && (
        <div className="flex justify-between px-1 mt-1 text-[10px] text-muted-foreground font-mono">
          <span>AUC: {(currentMetrics.auc * 100).toFixed(1)}%</span>
          <span>F1: {(currentMetrics.f1 * 100).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}
