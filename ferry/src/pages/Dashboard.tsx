import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  documentsApi,
  vaultsApi,
  exportApi,
  DocumentItem,
  Vault,
  DOCUMENT_CATEGORIES,
  DocumentCategory,
  getApiErrorMessage,
} from "@/services/api";
import { formatBytes, formatDate } from "@/lib/format";
import { downloadBlob, downloadDocumentToDevice } from "@/lib/download";
import { toast } from "sonner";
import {
  Search, Plus, HardDrive, Files, ChevronDown, FolderOpen,
  Loader2, Download, Trash2, LayoutGrid, List as ListIcon,
  Archive, FileType2, X as XIcon, CheckSquare,
  ChevronLeft, ChevronRight, SlidersHorizontal, type LucideIcon,
} from "lucide-react";
import { fileIcon, CATEGORY_TONES } from "@/lib/fileIcon";

type SortKey = "newest" | "oldest" | "largest" | "name";
const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "largest", label: "Largest" },
  { key: "name", label: "Name (A–Z)" },
];

type FileType = "image" | "pdf" | "doc" | "sheet" | "video" | "audio" | "text";
const FILE_TYPES: Array<{ key: FileType; label: string }> = [
  { key: "image", label: "Images" },
  { key: "pdf", label: "PDF" },
  { key: "doc", label: "Word" },
  { key: "sheet", label: "Spreadsheet" },
  { key: "video", label: "Video" },
  { key: "audio", label: "Audio" },
  { key: "text", label: "Text" },
];
const PAGE_SIZE = 24;

export default function Dashboard() {
  const [vaults, setVaults] = useState<Vault[] | null>(null);
  const [vaultId, setVaultId] = useState<string | "all">("all");
  const [category, setCategory] = useState<DocumentCategory | "All">("All");
  const [sort, setSort] = useState<SortKey>("newest");
  const [docs, setDocs] = useState<DocumentItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState<"zip" | "pdf" | null>(null);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState<{ page: number; pages: number; total: number } | null>(null);
  const [advOpen, setAdvOpen] = useState(false);
  const [fileType, setFileType] = useState<FileType | "any">("any");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minSizeMB, setMinSizeMB] = useState("");
  const [maxSizeMB, setMaxSizeMB] = useState("");

  // Initial vault fetch
  useEffect(() => {
    vaultsApi
      .list()
      .then(({ data }) => setVaults(data.vaults))
      .catch((err) => {
        toast.error(getApiErrorMessage(err));
        setVaults([]);
      });
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [vaultId, category, sort, query, fileType, dateFrom, dateTo, minSizeMB, maxSizeMB]);

  // Reload documents when filters change
  useEffect(() => {
    let cancelled = false;
    setDocs(null);
    setSelected(new Set());
    documentsApi
      .list({
        vault: vaultId === "all" ? undefined : vaultId,
        category: category === "All" ? undefined : category,
        sort,
        q: query.trim() || undefined,
        page,
        limit: PAGE_SIZE,
        type: fileType === "any" ? undefined : fileType,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        minSize: minSizeMB ? Math.round(Number(minSizeMB) * 1024 * 1024) : undefined,
        maxSize: maxSizeMB ? Math.round(Number(maxSizeMB) * 1024 * 1024) : undefined,
      })
      .then(({ data }) => {
        if (!cancelled) {
          setDocs(data.documents);
          setPageInfo({ page: data.pagination.page, pages: data.pagination.pages, total: data.pagination.total });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(getApiErrorMessage(err));
          setDocs([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [vaultId, category, sort, query, page, fileType, dateFrom, dateTo, minSizeMB, maxSizeMB]);

  const hasAdvanced = fileType !== "any" || dateFrom || dateTo || minSizeMB || maxSizeMB;
  function clearAdvanced() {
    setFileType("any"); setDateFrom(""); setDateTo(""); setMinSizeMB(""); setMaxSizeMB("");
  }

  async function onDelete(id: string) {
    if (!confirm("Move this document to Trash?")) return;
    try {
      await documentsApi.remove(id);
      setDocs((d) => d?.filter((x) => x._id !== id) ?? null);
      toast.success("Moved to Trash");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function onDownload(id: string) {
    setDownloading(id);
    try {
      const doc = docs?.find((d) => d._id === id);
      await downloadDocumentToDevice(id, doc?.name || "document");
    } catch {
      // toast already surfaced
    } finally {
      setDownloading(null);
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (!docs) return;
    if (selected.size === docs.length) setSelected(new Set());
    else setSelected(new Set(docs.map((d) => d._id)));
  }

  async function onExportZip() {
    if (selected.size === 0) return;
    setExporting("zip");
    try {
      const { data } = await exportApi.zip([...selected]);
      downloadBlob(data as Blob, `ferry-export-${Date.now()}.zip`);
      toast.success(`Exported ${selected.size} file${selected.size === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setExporting(null);
    }
  }

  async function onExportPdf() {
    if (selected.size === 0) return;
    if (!canUpload) {
      toast.error("Editor access required to convert to PDF");
      return;
    }
    setExporting("pdf");
    try {
      const ids = [...selected];
      const { data } = await exportApi.pdf(ids, ids.length === 1 ? "ferry-document" : "ferry-merged");
      downloadBlob(data as Blob, `ferry-${ids.length === 1 ? "document" : "merged"}.pdf`);
      toast.success(ids.length === 1 ? "Converted to PDF" : `Merged ${ids.length} files into one PDF`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setExporting(null);
    }
  }

  const totalSize = useMemo(
    () => docs?.reduce((s, d) => s + d.size, 0) ?? 0,
    [docs],
  );

  const activeVault = vaults?.find((v) => v._id === vaultId);
  const canUpload = vaultId === "all" ? true : activeVault?.role === "editor";

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Workspace
          </div>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight">
            {vaultId === "all" ? "All files" : activeVault?.name ?? "Documents"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {vaultId === "all"
              ? "Everything across your vaults."
              : activeVault?.description || "Files in this vault."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/vaults"><FolderOpen className="mr-1.5 h-4 w-4" /> Manage vaults</Link>
          </Button>
          <Button asChild disabled={!canUpload}>
            <Link to={`/upload${vaultId !== "all" ? `?vault=${vaultId}` : ""}`}>
              <Plus className="mr-1.5 h-4 w-4" /> Upload
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatTile label="Documents" value={docs?.length ?? "—"} Icon={Files} />
        <StatTile label="Storage in view" value={docs ? formatBytes(totalSize) : "—"} Icon={HardDrive} />
        <StatTile label="Vaults" value={vaults?.length ?? "—"} Icon={FolderOpen} />
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {/* Vault picker */}
          <div className="flex flex-wrap items-center gap-2">
            <Pill
              active={vaultId === "all"}
              onClick={() => setVaultId("all")}
              label="All vaults"
            />
            {vaults?.map((v) => (
              <Pill
                key={v._id}
                active={vaultId === v._id}
                onClick={() => setVaultId(v._id)}
                label={v.name}
                badge={v.documentCount}
              />
            ))}
          </div>

          {/* View + sort */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border bg-card p-0.5">
              <button
                onClick={() => setView("grid")}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${view === "grid" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${view === "list" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="List view"
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
            <SortMenu sort={sort} onChange={setSort} />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, tag, or description…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 pl-9"
            />
          </div>
          <button
            onClick={() => setAdvOpen((v) => !v)}
            className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors ${
              advOpen || hasAdvanced ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-secondary"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {hasAdvanced && <span className="ml-1 rounded-full bg-background/20 px-1.5 py-0 text-[10px]">on</span>}
          </button>
          {/* Categories */}
          <div className="-mx-1 flex flex-wrap gap-1.5 overflow-x-auto px-1">
            <Pill
              active={category === "All"}
              onClick={() => setCategory("All")}
              label="All"
              compact
            />
            {DOCUMENT_CATEGORIES.map((c) => (
              <Pill
                key={c}
                active={category === c}
                onClick={() => setCategory(c)}
                label={c}
                tone={CATEGORY_TONES[c]}
                compact
              />
            ))}
          </div>
        </div>

        {advOpen && (
          <div className="surface grid gap-3 p-4 animate-fade-in sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">File type</label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value as FileType | "any")}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value="any">Any</option>
                {FILE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">From</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 h-9" />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">To</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 h-9" />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Min size (MB)</label>
              <Input type="number" min="0" value={minSizeMB} onChange={(e) => setMinSizeMB(e.target.value)} className="mt-1 h-9" />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Max size (MB)</label>
              <Input type="number" min="0" value={maxSizeMB} onChange={(e) => setMaxSizeMB(e.target.value)} className="mt-1 h-9" />
            </div>
            {hasAdvanced && (
              <div className="sm:col-span-2 lg:col-span-5">
                <Button size="sm" variant="ghost" onClick={clearAdvanced} className="h-8 text-xs text-muted-foreground">
                  <XIcon className="mr-1 h-3 w-3" /> Clear filters
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="mt-6">
        {selected.size > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border bg-foreground px-3 py-2 text-background animate-fade-in">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <span className="ml-1 text-xs opacity-70">·</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-background hover:bg-background/10 hover:text-background"
              onClick={onExportZip}
              disabled={exporting !== null}
            >
              {exporting === "zip" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Archive className="mr-1.5 h-3.5 w-3.5" />}
              Download as ZIP
            </Button>
            {canUpload && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-background hover:bg-background/10 hover:text-background"
                onClick={onExportPdf}
                disabled={exporting !== null}
                title="Images & PDFs only — DOCX not supported in Phase 2"
              >
                {exporting === "pdf" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileType2 className="mr-1.5 h-3.5 w-3.5" />}
                {selected.size === 1 ? "Convert to PDF" : "Merge to PDF"}
              </Button>
            )}
            <button
              onClick={selectAll}
              className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-background/10"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              {docs && selected.size === docs.length ? "Clear all" : "Select all"}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-background/10"
              aria-label="Clear selection"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {docs === null ? (
          view === "grid" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-36 animate-pulse rounded-xl border bg-secondary/40" />
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg border bg-secondary/40" />
              ))}
            </div>
          )
        ) : docs.length === 0 ? (
          <EmptyState canUpload={canUpload} vaultId={vaultId} />
        ) : view === "grid" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
            {docs.map((doc) => (
              <DocCard
                key={doc._id}
                doc={doc}
                onDelete={onDelete}
                onDownload={onDownload}
                downloading={downloading === doc._id}
                selected={selected.has(doc._id)}
                onToggleSelect={() => toggleSelected(doc._id)}
                canDelete={canUpload}
              />
            ))}
          </div>
        ) : (
          <DocList
            docs={docs}
            onDelete={onDelete}
            onDownload={onDownload}
            downloading={downloading}
            selectedIds={selected}
            onToggleSelect={toggleSelected}
            canDelete={canUpload}
          />
        )}
      </div>

      {/* Pagination */}
      {pageInfo && pageInfo.pages > 1 && (
        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
          <span className="text-xs text-muted-foreground">
            Page {pageInfo.page} of {pageInfo.pages} · {pageInfo.total} files
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(1)} className="h-8 px-2">
              First
            </Button>
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 px-2">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm font-medium">{page}</span>
            <Button variant="outline" size="sm" disabled={page >= pageInfo.pages} onClick={() => setPage((p) => p + 1)} className="h-8 px-2">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pageInfo.pages} onClick={() => setPage(pageInfo.pages)} className="h-8 px-2">
              Last
            </Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function StatTile({ label, value, Icon }: { label: string; value: React.ReactNode; Icon: LucideIcon }) {
  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="stat-num mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Pill({
  active, onClick, label, badge, tone, compact = false,
}: { active: boolean; onClick: () => void; label: string; badge?: number; tone?: string; compact?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border transition-colors ${
        compact ? "px-2.5 py-1 text-[12px]" : "px-3 py-1.5 text-[13px]"
      } font-medium ${
        active
          ? "border-foreground bg-foreground text-background"
          : tone
          ? `${tone} border-transparent hover:opacity-90`
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {typeof badge === "number" && (
        <span className={`rounded-full px-1.5 py-0 text-[10px] ${active ? "bg-background/20" : "bg-secondary"}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function SortMenu({ sort, onChange }: { sort: SortKey; onChange: (s: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const current = SORTS.find((s) => s.key === sort)?.label ?? "Newest";
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-[13px] font-medium hover:bg-secondary"
      >
        Sort: {current} <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1.5 w-44 overflow-hidden rounded-lg border bg-popover p-1 shadow-lg animate-scale-in">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => { onChange(s.key); setOpen(false); }}
              className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-secondary ${sort === s.key ? "font-medium text-foreground" : "text-muted-foreground"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DocCard({ doc, onDelete, onDownload, downloading, selected, onToggleSelect, canDelete }: {
  doc: DocumentItem; onDelete: (id: string) => void; onDownload: (id: string) => void; downloading: boolean;
  selected: boolean; onToggleSelect: () => void; canDelete: boolean;
}) {
  const { Icon, tone } = fileIcon(doc.mimeType);
  return (
    <div className={`surface-lift group relative flex flex-col p-5 ${selected ? "ring-2 ring-foreground" : ""}`}>
      <div className="absolute left-3 top-3 opacity-0 transition-opacity group-hover:opacity-100 has-[:checked]:opacity-100" data-checked={selected}>
        <Checkbox checked={selected} onCheckedChange={onToggleSelect} aria-label={`Select ${doc.name}`} />
      </div>
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tone} ${selected ? "invisible" : ""}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_TONES[doc.category] ?? "bg-secondary text-muted-foreground"}`}>
          {doc.category}
        </span>
      </div>
      <Link
        to={`/documents/${doc._id}`}
        className="mt-4 block truncate text-[15px] font-medium text-foreground hover:text-accent"
        title={doc.name}
      >
        {doc.name}
      </Link>
      <div className="mt-1 text-xs text-muted-foreground">
        <span className="stat-num">{formatBytes(doc.size)}</span>
        <span className="px-1.5">·</span>
        <span>{formatDate(doc.createdAt)}</span>
      </div>
      {doc.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {doc.tags.slice(0, 3).map((t) => (
            <span key={t} className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center gap-1 border-t pt-3">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 flex-1 justify-start text-xs"
          onClick={() => onDownload(doc._id)}
          disabled={downloading}
        >
          {downloading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
          Download
        </Button>
        {canDelete && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(doc._id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function DocList({ docs, onDelete, onDownload, downloading, selectedIds, onToggleSelect, canDelete }: {
  docs: DocumentItem[]; onDelete: (id: string) => void; onDownload: (id: string) => void; downloading: string | null;
  selectedIds: Set<string>; onToggleSelect: (id: string) => void; canDelete: boolean;
}) {
  return (
    <div className="surface overflow-hidden animate-fade-in">
      <ul className="divide-y">
        {docs.map((doc) => {
          const { Icon, tone } = fileIcon(doc.mimeType);
          const isSel = selectedIds.has(doc._id);
          return (
            <li key={doc._id} className={`flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 ${isSel ? "bg-secondary/60" : ""}`}>
              <Checkbox checked={isSel} onCheckedChange={() => onToggleSelect(doc._id)} aria-label={`Select ${doc.name}`} />
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <Link to={`/documents/${doc._id}`} className="block truncate text-sm font-medium hover:text-accent">
                  {doc.name}
                </Link>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {doc.category} · {formatBytes(doc.size)} · {formatDate(doc.createdAt)}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onDownload(doc._id)} disabled={downloading === doc._id}>
                {downloading === doc._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              </Button>
              {canDelete && (
                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete(doc._id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EmptyState({ canUpload, vaultId }: { canUpload: boolean; vaultId: string | "all" }) {
  return (
    <div className="surface flex flex-col items-center p-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
        <Files className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="mt-4 text-base font-medium">No documents here yet</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {canUpload
          ? "Upload your first file or invite people to collaborate."
          : "You're a viewer in this vault. Wait for the editor to upload files."}
      </p>
      {canUpload && (
        <Button asChild className="mt-5 h-10">
          <Link to={`/upload${vaultId !== "all" ? `?vault=${vaultId}` : ""}`}>
            <Plus className="mr-1.5 h-4 w-4" /> Upload a file
          </Link>
        </Button>
      )}
    </div>
  );
}
