import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { adminApi, AdminShare, getApiErrorMessage } from "@/services/api";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Share2 } from "lucide-react";

export default function AdminShares() {
  const [shares, setShares] = useState<AdminShare[] | null>(null);
  useEffect(() => {
    adminApi.shares().then(({ data }) => setShares(data.shares))
      .catch((err) => { toast.error(getApiErrorMessage(err)); setShares([]); });
  }, []);
  return (
    <AppLayout mode="admin">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Share links</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Recent shareable links across the platform.</p>
      </div>
      <div className="surface mt-7 overflow-hidden">
        {shares === null ? (
          <div className="divide-y">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse bg-secondary/40" />)}</div>
        ) : shares.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No shares yet</div>
        ) : (
          <ul className="divide-y">
            {shares.map((s) => (
              <li key={s._id} className="flex items-center gap-3 p-4 hover:bg-secondary/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent"><Share2 className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{s.document?.name ?? "Deleted document"}</div>
                  <div className="text-[11px] text-muted-foreground">
                    by {s.createdBy?.email ?? "—"} · {s.views} views{s.maxViews ? ` / ${s.maxViews}` : ""} · {s.allowDownload ? "downloadable" : "preview-only"}
                  </div>
                </div>
                {s.revokedAt
                  ? <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">Revoked</span>
                  : s.expiresAt && new Date(s.expiresAt) < new Date()
                  ? <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Expired</span>
                  : <span className="rounded-md bg-[hsl(var(--success))]/10 px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--success))]">Active</span>
                }
                <span className="text-xs text-muted-foreground">{formatDate(s.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}
