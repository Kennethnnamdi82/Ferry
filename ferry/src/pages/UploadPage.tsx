import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  documentsApi, vaultsApi, Vault,
  DOCUMENT_CATEGORIES, DocumentCategory, getApiErrorMessage,
} from "@/services/api";
import { formatBytes } from "@/lib/format";
import { toast } from "sonner";
import { Upload as UploadIcon, FileText, Loader2, X, ArrowRight, CheckCircle2, FolderOpen } from "lucide-react";

interface PendingFile {
  file: File;
  name: string;
  category: DocumentCategory;
  description: string;
  tags: string;
  progress: number;
  status: "idle" | "uploading" | "done" | "error";
  error?: string;
}

const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword";
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const MAX_UPLOAD_LABEL = "50 MB";

export default function UploadPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [vaults, setVaults] = useState<Vault[] | null>(null);
  const [vaultId, setVaultId] = useState<string>(params.get("vault") || "");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    vaultsApi
      .list()
      .then(({ data }) => {
        const editable = data.vaults.filter((v) => v.role === "editor");
        setVaults(editable);
        if (!vaultId && editable[0]) setVaultId(editable[0]._id);
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err));
        setVaults([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const next: PendingFile[] = [];
    for (const f of Array.from(list)) {
      if (f.size > MAX_UPLOAD_BYTES) {
        toast.error(`${f.name} exceeds ${MAX_UPLOAD_LABEL}`);
        continue;
      }
      next.push({
        file: f,
        name: f.name,
        category: "Other",
        description: "",
        tags: "",
        progress: 0,
        status: "idle",
      });
    }
    setFiles((prev) => [...prev, ...next]);
  }

  function update(idx: number, patch: Partial<PendingFile>) {
    setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }

  function remove(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function uploadAll(e: React.FormEvent) {
    e.preventDefault();
    if (!vaultId) return toast.error("Choose a vault first");
    if (!files.length) return toast.error("Add at least one file");
    setUploading(true);
    let okCount = 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.status === "done") continue;
      update(i, { status: "uploading", progress: 0, error: undefined });
      try {
        const fd = new FormData();
        fd.append("file", f.file);
        fd.append("name", f.name.trim() || f.file.name);
        fd.append("description", f.description.trim());
        fd.append("tags", f.tags.trim());
        fd.append("category", f.category);
        fd.append("vault", vaultId);
        await documentsApi.create(fd, (e) => {
          const total = (e as ProgressEvent).total || 1;
          const loaded = (e as ProgressEvent).loaded || 0;
          update(i, { progress: Math.round((loaded / total) * 100) });
        });
        update(i, { status: "done", progress: 100 });
        okCount++;
      } catch (err) {
        update(i, { status: "error", error: getApiErrorMessage(err) });
      }
    }
    setUploading(false);
    if (okCount > 0) {
      toast.success(`${okCount} file${okCount > 1 ? "s" : ""} uploaded`);
      setTimeout(() => nav(`/dashboard`), 700);
    }
  }

  return (
    <AppLayout>
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Upload documents</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          PDF, images (PNG/JPG), and DOCX. Up to {MAX_UPLOAD_LABEL} per file. Multi-file supported.
        </p>
      </div>

      <form onSubmit={uploadAll} className="mt-7 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`surface relative flex min-h-[220px] flex-col items-center justify-center p-8 text-center transition-all ${dragOver ? "border-accent bg-accent/5" : ""}`}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background">
              <UploadIcon className="h-6 w-6" />
            </div>
            <p className="mt-5 text-base font-semibold">Drop files here</p>
            <p className="mt-1 text-sm text-muted-foreground">or click below to browse from your device</p>
            <Button
              type="button"
              variant="outline"
              className="mt-5 h-10"
              onClick={() => inputRef.current?.click()}
            >
              Choose files
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {/* File queue */}
          {files.length > 0 && (
            <div className="surface overflow-hidden">
              <div className="border-b px-4 py-3 text-sm font-semibold">
                {files.length} file{files.length > 1 ? "s" : ""} ready
              </div>
              <ul className="divide-y">
                {files.map((f, idx) => (
                  <li key={idx} className="p-4 animate-fade-in">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Input
                              value={f.name}
                              onChange={(e) => update(idx, { name: e.target.value })}
                              className="h-8 truncate text-[13px]"
                            />
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              {formatBytes(f.file.size)} · {f.file.type || "file"}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 shrink-0 p-0"
                            onClick={() => remove(idx)}
                            disabled={uploading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <select
                            value={f.category}
                            onChange={(e) => update(idx, { category: e.target.value as DocumentCategory })}
                            className="h-8 rounded-md border bg-background px-2 text-[12px]"
                          >
                            {DOCUMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <Input
                            placeholder="Tags (comma separated)"
                            value={f.tags}
                            onChange={(e) => update(idx, { tags: e.target.value })}
                            className="h-8 text-[12px]"
                          />
                        </div>
                        {f.status === "uploading" && (
                          <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
                            <div className="h-full bg-accent transition-all" style={{ width: `${f.progress}%` }} />
                          </div>
                        )}
                        {f.status === "done" && (
                          <p className="inline-flex items-center gap-1 text-[11px] font-medium text-[hsl(var(--success))]">
                            <CheckCircle2 className="h-3 w-3" /> Uploaded
                          </p>
                        )}
                        {f.status === "error" && (
                          <p className="text-[11px] text-destructive">{f.error}</p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sidebar: vault + submit */}
        <div className="surface space-y-4 p-6 h-fit">
          <h2 className="text-sm font-semibold">Destination</h2>
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Vault</Label>
            {vaults === null ? (
              <div className="h-10 animate-pulse rounded-md bg-secondary" />
            ) : vaults.length === 0 ? (
              <div className="rounded-md border bg-secondary/50 p-3 text-xs text-muted-foreground">
                You don't own any vaults yet. <a href="/vaults" className="font-medium text-foreground underline">Create one</a>.
              </div>
            ) : (
              <select
                value={vaultId}
                onChange={(e) => setVaultId(e.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {vaults.map((v) => (
                  <option key={v._id} value={v._id}>{v.name}</option>
                ))}
              </select>
            )}
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <FolderOpen className="h-3 w-3" /> Only editors can upload to a vault.
            </p>
          </div>

          <Button
            type="submit"
            className="h-11 w-full text-[15px]"
            disabled={uploading || !files.length || !vaultId}
          >
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {uploading ? "Uploading…" : `Upload ${files.length || ""} ${files.length === 1 ? "file" : "files"}`}
            {!uploading && <ArrowRight className="ml-1.5 h-4 w-4" />}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Encrypted at rest. Signed download links expire in seconds.
          </p>
        </div>
      </form>
    </AppLayout>
  );
}
