import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { documentsApi, DocumentItem, DOCUMENT_CATEGORIES, DocumentCategory, getApiErrorMessage } from "@/services/api";
import { downloadDocumentToDevice } from "@/lib/download";
import { formatBytes, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { ArrowLeft, Download, Loader2, Save, Share2, Trash2, ShieldCheck, Eye } from "lucide-react";
import { ShareDialog } from "@/components/ShareDialog";
import { DocumentPreview } from "@/components/DocumentPreview";
import { OcrPanel } from "@/components/OcrPanel";

export default function DocumentDetails() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [role, setRole] = useState<"editor" | "viewer">("viewer");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("Other");
  const [shareOpen, setShareOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await documentsApi.get(id);
        setDoc(data.document);
        setRole(data.role);
        setName(data.document.name);
        setDescription(data.document.description);
        setTags(data.document.tags.join(", "));
        setCategory(data.document.category);
      } catch (err) {
        toast.error(getApiErrorMessage(err));
        nav("/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, nav]);

  // Lazy-load preview URL
  useEffect(() => {
    if (!id || !doc) return;
    setPreviewLoading(true);
    documentsApi.preview(id)
      .then(({ data }) => setPreviewUrl(data.url))
      .catch(() => setPreviewUrl(null))
      .finally(() => setPreviewLoading(false));
  }, [id, doc]);

  async function onSave() {
    if (!id) return;
    setSaving(true);
    try {
      const { data } = await documentsApi.update(id, {
        name: name.trim(),
        description: description.trim(),
        category,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setDoc(data.document);
      toast.success("Changes saved");
    } catch (err) { toast.error(getApiErrorMessage(err)); }
    finally { setSaving(false); }
  }

  async function onDownload() {
    if (!id || !doc) return;
    setDownloading(true);
    try {
      await downloadDocumentToDevice(id, doc.name || "document");
    } catch {
      /* toast surfaced inside helper */
    } finally {
      setDownloading(false);
    }
  }

  async function onDelete() {
    if (!id || !confirm("Move this document to Trash?")) return;
    try {
      await documentsApi.remove(id);
      toast.success("Moved to Trash");
      nav("/dashboard");
    } catch (err) { toast.error(getApiErrorMessage(err)); }
  }

  const isEditor = role === "editor";

  return (
    <AppLayout>
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link to="/dashboard"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to documents</Link>
      </Button>

      {loading || !doc ? (
        <div className="mt-8 flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-3 grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            {/* Preview */}
            <div className="surface overflow-hidden">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="inline-flex items-center gap-2 text-sm font-semibold">
                  <Eye className="h-4 w-4" /> Preview
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={onDownload} disabled={downloading}>
                    {downloading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
                    Download
                  </Button>
                  {isEditor && (
                    <Button size="sm" onClick={() => setShareOpen(true)}>
                      <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share
                    </Button>
                  )}
                </div>
              </div>
              <DocumentPreview url={previewUrl} mimeType={doc.mimeType} loading={previewLoading} onDownload={onDownload} />
            </div>

            <OcrPanel url={previewUrl} mimeType={doc.mimeType} />

            {/* Editable fields */}
            <div className="surface p-6">
              <h2 className="font-display text-xl font-semibold tracking-tight">Details</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isEditor ? "Update the metadata below." : "You're a viewer — these fields are read-only."}
              </p>
              <div className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-[13px] font-medium">Name</Label>
                  <Input id="name" value={name} disabled={!isEditor} onChange={(e) => setName(e.target.value)} className="h-10" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cat" className="text-[13px] font-medium">Category</Label>
                    <select
                      id="cat"
                      value={category}
                      disabled={!isEditor}
                      onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-60"
                    >
                      {DOCUMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tags" className="text-[13px] font-medium">Tags</Label>
                    <Input id="tags" value={tags} disabled={!isEditor} onChange={(e) => setTags(e.target.value)} className="h-10" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-[13px] font-medium">Description</Label>
                  <Textarea id="description" rows={4} disabled={!isEditor} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                {isEditor && (
                  <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                    <Button onClick={onSave} disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save changes
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={onDelete}
                      className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="surface h-fit p-6">
            <h2 className="text-sm font-semibold">File info</h2>
            <dl className="mt-4 space-y-3.5">
              {[
                ["Type", doc.mimeType],
                ["Category", doc.category],
                ["Size", formatBytes(doc.size)],
                ["Uploaded", formatDate(doc.createdAt)],
                ["Updated", formatDate(doc.updatedAt)],
                ["Role", role],
                ["File ID", doc._id.slice(-12)],
              ].map(([k, v]) => (
                <div key={k as string} className="flex items-start justify-between gap-3">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="text-right font-mono text-xs text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex items-center gap-2 rounded-lg border bg-secondary/40 px-3 py-2">
              <ShieldCheck className="h-4 w-4 text-[hsl(var(--success))]" />
              <span className="text-xs font-medium">Encrypted at rest</span>
            </div>
          </aside>
        </div>
      )}

      {doc && <ShareDialog documentId={doc._id} open={shareOpen} onOpenChange={setShareOpen} />}
    </AppLayout>
  );
}
