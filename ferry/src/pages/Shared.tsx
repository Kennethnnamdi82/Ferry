import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { vaultsApi, Vault, getApiErrorMessage } from "@/services/api";
import { toast } from "sonner";
import { FolderOpen, Users, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function Shared() {
  const [vaults, setVaults] = useState<Vault[] | null>(null);

  useEffect(() => {
    vaultsApi.list()
      .then(({ data }) => setVaults(data.vaults.filter((v) => v.role === "viewer")))
      .catch((err) => { toast.error(getApiErrorMessage(err)); setVaults([]); });
  }, []);

  return (
    <AppLayout>
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Shared with me</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Vaults where you've been invited as a viewer.
        </p>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {vaults === null ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border bg-secondary/40" />
          ))
        ) : vaults.length === 0 ? (
          <div className="surface col-span-full p-12 text-center">
            <p className="text-base font-medium">Nothing shared with you yet</p>
            <p className="mt-1 text-sm text-muted-foreground">When someone invites you to a vault, it'll show up here.</p>
          </div>
        ) : vaults.map((v) => (
          <Link key={v._id} to={`/dashboard?vault=${v._id}`} className="surface-lift block p-5 animate-fade-in">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <FolderOpen className="h-4 w-4" />
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-3 truncate text-sm font-medium">{v.name}</div>
            <div className="mt-1 truncate text-xs text-muted-foreground">
              <Users className="mr-1 inline h-3 w-3" />
              {v.owner.name} · {v.documentCount} file{v.documentCount === 1 ? "" : "s"}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">Updated {formatDate(v.updatedAt)}</div>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
