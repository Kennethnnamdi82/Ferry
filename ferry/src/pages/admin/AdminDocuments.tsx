import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { adminApi, getApiErrorMessage } from "@/services/api";
import { formatBytes, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Loader2, Trash2, FileText } from "lucide-react";

interface AdminDoc {
  _id: string;
  name: string;
  mimeType: string;
  size: number;
  flagged: boolean;
  owner: { name: string; email: string } | null;
  createdAt: string;
}

export default function AdminDocuments() {
  const [docs, setDocs] = useState<AdminDoc[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      const { data } = await adminApi.documents();
      setDocs(data.documents as AdminDoc[]);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      setDocs([]);
    }
  }

  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Delete this document? This can't be undone.")) return;
    setBusy(id);
    try {
      await adminApi.deleteDocument(id);
      setDocs((arr) => arr?.filter((d) => d._id !== id) ?? null);
      toast.success("Document deleted");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppLayout mode="admin">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Documents</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Metadata only — file contents stay encrypted and private.
        </p>
      </div>

      <div className="surface mt-7 overflow-hidden">
        {docs === null ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-3 p-4">
                <div className="h-10 w-10 rounded-lg bg-secondary" />
                <div className="h-3 w-1/2 rounded bg-secondary" />
              </div>
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No documents yet
          </div>
        ) : (
          <ul className="divide-y">
            {docs.map((d) => (
              <li key={d._id} className="flex items-center gap-4 p-4 hover:bg-secondary/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{d.name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                    <span>{d.owner?.email ?? "—"}</span>
                    <span>·</span>
                    <span>{d.mimeType}</span>
                    <span>·</span>
                    <span className="stat-num">{formatBytes(d.size)}</span>
                    <span>·</span>
                    <span>{formatDate(d.createdAt)}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(d._id)}
                  disabled={busy === d._id}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  {busy === d._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}
