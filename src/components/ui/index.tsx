import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">◌</div>
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <div className="font-semibold">حدث خطأ</div>
      <div className="mt-1">{message}</div>
      {retry && <button onClick={retry} className="btn-secondary mt-3">إعادة المحاولة</button>}
    </div>
  );
}

export function Spinner({ label = "جاري التحميل…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-10 text-sm text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      {label}
    </div>
  );
}

export function StatCard({ label, value, hint, tone = "default" }: { label: string; value: string | number; hint?: string; tone?: "default" | "good" | "warn" | "bad" }) {
  const tones = { default: "text-slate-900", good: "text-emerald-700", warn: "text-amber-700", bad: "text-red-700" };
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${tones[tone]}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export function ConfidenceBadge({ value, threshold }: { value: number | null; threshold: number }) {
  if (value === null) return <span className="badge bg-slate-100 text-slate-500">—</span>;
  const pct = Math.round(value * 100);
  const cls = value >= 0.75 ? "bg-emerald-100 text-emerald-800" : value >= threshold ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
  return <span className={`badge ${cls}`}>{pct}%</span>;
}
