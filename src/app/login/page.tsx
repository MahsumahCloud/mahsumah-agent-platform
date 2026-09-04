"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await fetch("/api/v1/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    setLoading(false);
    if (!res.ok) { setError("كلمة المرور غير صحيحة"); return; }
    router.replace(params.get("next") ?? "/");
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-sm p-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-700 text-xl font-bold text-white">م</div>
        <h1 className="text-lg font-bold">منصة وكلاء محسومة</h1>
        <p className="mt-1 text-sm text-slate-500">لوحة تحكم المالك</p>
      </div>
      <label className="label">كلمة مرور المشرف</label>
      <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button className="btn-primary mt-4 w-full" disabled={loading}>{loading ? "جاري الدخول…" : "دخول"}</button>
      <p className="mt-4 text-center text-xs text-slate-400">القيمة الافتراضية في .env هي ADMIN_PASSWORD</p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <Suspense><LoginForm /></Suspense>
    </main>
  );
}
