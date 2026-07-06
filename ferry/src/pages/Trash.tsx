import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { documentsApi, DocumentItem, getApiErrorMessage } from "@/services/api";
import { toast } from "sonner";
import { Loader2, RotateCcw, Trash2, Undo2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatBytes, formatDate } from "@/lib/format";
import { fileIcon } from "@/lib/fileIcon";

const PAGE_SIZE = 24;

export default function Trash() {
  const [docs, setDocs] = useState<DocumentItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState<{ page: number; pages: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setDocs(null);
    setError(null);
    documentsApi.list({ trash: true, page, limit: PAGE_SIZE })
      .then(({ data }) => {
        setDocs(data.documents);
        setPageInfo({ page: data.pagination.page, pages: data.pagination.pages, total: data.pagination.total });
      })
      .catch((err) => {
        const msg = getApiErrorMessage(err);
        setError(msg);
        toast.error(msg);
        setDocs([]);
      });
  }
  useEffect(load, [page]);

  async function onRestore(id: string) {
    setBusyId(id);
    try { await documentsApi.restore(id); toast.success("Restored"); load(); }
    catch (err) { toast.error(getApiErrorMessage(err)); }
    finally { setBusyId(null); }
  }
  async function onPurge(id: string) {
    if (!confirm("Permanently delete? This can't be undone.")) return;
    setBusyId(id);
    try {
      await documentsApi.purge(id);
      toast.success("Permanently deleted");
      setDocs((d) => d?.filter((x) => x._id !== id) ?? null);
    } catch (err) { toast.error(getApiErrorMessage(err)); }
    finally { setBusyId(null); }
  }

  return (
    <AppLayout>
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Trash</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Deleted files stay here until permanently removed by the vault editor.
        </p>
      </div>

      <div className="mt-7 surface overflow-hidden">
        {docs === null ? (
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse bg-secondary/40" />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center text-sm text-destructive">
            {error}
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={load}>Retry</Button>
            </div>
          </div>
        ) : docs.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Undo2 className="mx-auto h-6 w-6 opacity-40" />
            <p className="mt-3">Trash is empty.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {docs.map((d) => {
              const { Icon, tone } = fileIcon(d.mimeType);
              return (
                <li key={d._id} className="flex items-center gap-3 p-4">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.category} · {formatBytes(d.size)} · deleted {formatDate(d.deletedAt || d.updatedAt)}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onRestore(d._id)} disabled={busyId === d._id}>
                    {busyId === d._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restore</>}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onPurge(d._id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {pageInfo && pageInfo.pages > 1 && (
        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
          <span className="text-xs text-muted-foreground">
            Page {pageInfo.page} of {pageInfo.pages} · {pageInfo.total} files
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(1)} className="h-8 px-2">First</Button>
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 px-2">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm font-medium">{page}</span>
            <Button variant="outline" size="sm" disabled={page >= pageInfo.pages} onClick={() => setPage((p) => p + 1)} className="h-8 px-2">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pageInfo.pages} onClick={() => setPage(pageInfo.pages)} className="h-8 px-2">Last</Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
