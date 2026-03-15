import { Link, useLocation } from "wouter";
import { LayoutDashboard, ShieldAlert, UploadCloud, LineChart, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModelSelector } from "./ModelSelector";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/prediction", label: "Predict Fraud", icon: ShieldAlert },
  { href: "/upload", label: "Batch Upload", icon: UploadCloud },
  { href: "/insights", label: "Insights", icon: LineChart },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 fixed inset-y-0 left-0 bg-card border-r border-border flex flex-col z-50">
      <div className="h-20 flex items-center px-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <Activity className="w-6 h-6 text-card" />
          </div>
          <span className="font-display font-bold text-lg text-foreground tracking-wide">
            Aegis<span className="text-primary">Fraud</span>
          </span>
        </div>
      </div>

      <nav className="flex-1 py-8 px-4 flex flex-col gap-2 overflow-y-auto">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
          Menu
        </div>
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_10px_hsl(var(--primary))]" />
              )}
              <item.icon
                className={cn(
                  "w-5 h-5 transition-transform duration-300",
                  isActive ? "scale-110" : "group-hover:scale-110 group-hover:text-primary"
                )}
              />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <ModelSelector />

      <div className="p-4 border-t border-border/50">
        <div className="bg-secondary/50 rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_hsl(var(--success))]" />
            <span className="text-sm font-medium text-foreground">System Online</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Real-time inference engine active.
          </p>
        </div>
      </div>
    </aside>
  );
}
