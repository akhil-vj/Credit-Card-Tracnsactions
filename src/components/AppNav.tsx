import { Link } from "@tanstack/react-router";
import { CreditCard, LayoutDashboard, ListOrdered, AlertTriangle, Receipt } from "lucide-react";
import { LibraryToolbar } from "@/components/LibraryToolbar";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ListOrdered },
  { to: "/hidden-charges", label: "Hidden charges", icon: AlertTriangle },
  { to: "/gst-tax", label: "GST / Tax", icon: Receipt },
] as const;

export function AppNav() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/50 shadow-gold">
            <CreditCard className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl leading-none">Vault</h1>
            <p className="text-xs text-muted-foreground">Flipkart Axis · Credit Card Tracker</p>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card/40 p-1">
          {items.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>

      <LibraryToolbar />
    </div>
  );
}
