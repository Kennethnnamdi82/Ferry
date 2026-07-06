import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { sharesApi, ShareLink, getApiErrorMessage } from "@/services/api";
import { toast } from "sonner";
import { Copy, Loader2, Lock, Plus, Share2, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";

const EXPIRY = [
  { label: "1 hour", value: 1 },
  { label: "1 day", value: 24 },
  { label: "1 week", value: 24 * 7 },
  { label: "30 days", value: 24 * 30 },
  { label: "Never", value: null as number | null },
];

export function ShareDialog({
  documentId, open, onOpenChange,
}: { documentId: string; open: boolean; onOpenChange: (b: boolean) => void }) {
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [allowDownload, setAllowDownload] = useState(true);
  const [expiresInHours, setExpiresInHours] = useState<number | null>(24);
  const [maxViews, setMaxViews] = useState<string>("");
  const [maxDownloads, setMaxDownloads] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [usePassword, setUsePassword] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await sharesApi.listForDocument(documentId);
      setShares(data.shares);
    } catch (err) { toast.error(getApiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (open) load(); /* eslint-disable-next-line */ }, [open]);

  async function onCreate() {
    setCreating(true);
    try {
      const { data } = await sharesApi.create({
        documentId,
        allowDownload,
        expiresInHours,
        maxViews: maxViews ? Number(maxViews) : null,
        maxDownloads: maxDownloads ? Number(maxDownloads) : null,
        password: usePassword && password ? password : null,
      });
      setShares((s) => [data.share, ...s]);
      setMaxViews("");
      setMaxDownloads("");
      setPassword("");
      setUsePassword(false);
      toast.success("Share link created");
    } catch (err) { toast.error(getApiErrorMessage(err)); }
    finally { setCreating(false); }
  }

  async function onRevoke(id: string) {
    try {
      await sharesApi.revoke(id);
      setShares((s) => s.map((x) => x._id === id ? { ...x, revokedAt: new Date().toISOString() } : x));
      toast.success("Link revoked");
    } catch (err) { toast.error(getApiErrorMessage(err)); }
  }

  function copy(token: string) {
    const url = `${window.location.origin}/s/${token}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copied to clipboard"),
      () => toast.error("Failed to copy")
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Share2 className="h-4 w-4" /> Share this document</DialogTitle>
          <DialogDescription>Create a secure, time-limited link.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-secondary/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[13px] font-medium">Allow downloads</Label>
                <p className="text-xs text-muted-foreground">Off = preview only.</p>
              </div>
              <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Expires</Label>
              <div className="flex flex-wrap gap-1.5">
                {EXPIRY.map((e) => (
                  <button
                    key={e.label}
                    onClick={() => setExpiresInHours(e.value)}
                    className={`rounded-full border px-2.5 py-1 text-[12px] font-medium ${expiresInHours === e.value ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"}`}
                    type="button"
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mx" className="text-[13px] font-medium">Max views (optional)</Label>
              <Input id="mx" type="number" min={1} placeholder="Unlimited" value={maxViews} onChange={(e) => setMaxViews(e.target.value)} />
            </div>
            {allowDownload && (
              <div className="space-y-1.5">
                <Label htmlFor="mxd" className="text-[13px] font-medium">Max downloads (optional)</Label>
                <Input id="mxd" type="number" min={1} placeholder="Unlimited" value={maxDownloads} onChange={(e) => setMaxDownloads(e.target.value)} />
              </div>
            )}
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[13px] font-medium flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" /> Require a password
                  </Label>
                  <p className="text-xs text-muted-foreground">Recipients must enter it to view.</p>
                </div>
                <Switch checked={usePassword} onCheckedChange={setUsePassword} />
              </div>
              {usePassword && (
                <Input
                  type="text"
                  placeholder="Enter a password (min 4 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={4}
                />
              )}
            </div>
            <Button onClick={onCreate} disabled={creating} className="w-full">
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create link
            </Button>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active links</h4>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-secondary/40" />)}
              </div>
            ) : shares.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active links.</p>
            ) : (
              <ul className="space-y-2">
                {shares.map((s) => (
                  <li key={s._id} className="flex items-center gap-2 rounded-lg border p-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono text-[11px] text-foreground">/s/{s.token}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {s.revokedAt ? <span className="text-destructive">Revoked</span> :
                         s.expiresAt ? `Expires ${formatDate(s.expiresAt)}` : "Never expires"}
                        {" · "}{s.views} view{s.views === 1 ? "" : "s"}
                        {s.maxViews ? ` / ${s.maxViews}` : ""}
                        {s.allowDownload && (s.downloads > 0 || s.maxDownloads) && (
                          <> · {s.downloads} dl{s.maxDownloads ? ` / ${s.maxDownloads}` : ""}</>
                        )}
                        {s.hasPassword && (
                          <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-foreground/10 px-1 py-0.5 text-[10px] font-medium">
                            <Lock className="h-2.5 w-2.5" /> Protected
                          </span>
                        )}
                      </div>
                    </div>
                    {!s.revokedAt && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => copy(s.token)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onRevoke(s._id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
