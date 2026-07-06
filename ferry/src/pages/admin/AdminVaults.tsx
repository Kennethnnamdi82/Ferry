import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { adminApi, AdminVault, getApiErrorMessage } from "@/services/api";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { FolderOpen } from "lucide-react";

export default function AdminVaults() {
  const [vaults, setVaults] = useState<AdminVault[] | null>(null);
  useEffect(() => {
    adminApi.vaults().then(({ data }) => setVaults(data.vaults))
      .catch((err) => { toast.error(getApiErrorMessage(err)); setVaults([]); });
  }, []);
  return (
    <AppLayout mode="admin">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Vaults</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">All vaults across the system.</p>
      </div>
      <div className="surface mt-7 overflow-hidden">
        {vaults === null ? (
          <div className="divide-y">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse bg-secondary/40" />)}</div>
        ) : vaults.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No vaults yet</div>
        ) : (
          <ul className="divide-y">
            {vaults.map((v) => (
              <li key={v._id} className="flex items-center gap-3 p-4 hover:bg-secondary/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent"><FolderOpen className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{v.name}</div>
                  <div className="text-[11px] text-muted-foreground">{v.owner?.email ?? "—"} · {v.documentCount} files</div>
                </div>
                {v.deletedAt && <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">Deleted</span>}
                <span className="text-xs text-muted-foreground">{formatDate(v.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}
