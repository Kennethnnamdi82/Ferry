import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { activityApi, ActivityItem, getApiErrorMessage, Pagination as PageInfo } from "@/services/api";
import { toast } from "sonner";
import { Activity as ActivityIcon, Upload, Download, Trash2, RotateCcw, Share2, Users, FolderPlus, FolderMinus, FolderEdit, LogIn, LogOut, FileEdit, ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";

const ICON: Record<string, LucideIcon> = {
  upload: Upload, download: Download, delete: Trash2, restore: RotateCcw, purge: Trash2,
  share_create: Share2, share_revoke: Share2, share_view: Share2, share_download: Download,
  invite: Users, invite_remove: Users, invite_accept: Users,
  vault_create: FolderPlus, vault_delete: FolderMinus, vault_update: FolderEdit,
  login: LogIn, logout: LogOut, register: Users, update: FileEdit,
};

export default function Activity() {
  const [logs, setLogs] = useState<ActivityItem[] | null>(null);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLogs(null);
    activityApi
      .list({ page, limit: 30 })
      .then(({ data }) => {
        if (cancelled) return;
        setLogs(data.logs);
        setPageInfo(data.pagination);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(getApiErrorMessage(err));
        setLogs([]);
      });
    return () => { cancelled = true; };
  }, [page]);

  return (
    <AppLayout>
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your uploads, downloads, shares, and vault changes.
        </p>
      </div>

      <div className="mt-7 surface overflow-hidden">
        {logs === null ? (
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse bg-secondary/40" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <ActivityIcon className="mx-auto h-6 w-6 opacity-40" />
            <p className="mt-3">No activity to show yet.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {logs.map((l) => {
              const Icon = ICON[l.action] ?? ActivityIcon;
              return (
                <li key={l._id} className="flex items-center gap-3 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <span className="font-medium">{l.action.replace(/_/g, " ")}</span>
                    {l.target && <span className="ml-2 text-xs text-muted-foreground">#{l.target.slice(-6)}</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(l.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {pageInfo && pageInfo.pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Page {pageInfo.page} of {pageInfo.pages} · {pageInfo.total} events
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pageInfo.pages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
