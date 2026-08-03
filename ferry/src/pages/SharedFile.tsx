import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { sharesApi, getApiErrorMessage } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FerryLogo } from "@/components/FerryLogo";
import { Download, Loader2, ShieldCheck, AlertCircle, Eye, Lock } from "lucide-react";
import { formatBytes, formatDate } from "@/lib/format";
import { fileIcon } from "@/lib/fileIcon";
import { DocumentPreview } from "@/components/DocumentPreview";
import { downloadBlob } from "@/lib/download";
import { ThemeToggle } from "@/components/ThemeToggle";

interface SharedFileMeta {
  document: {
    _id: string;
    name: string;
    mimeType: string;
    size: number;
    createdAt: string;
  };
  allowDownload: boolean;
  expiresAt: string | null;
  requiresPassword: boolean;
}

export default function SharedFile() {
  const { token } = useParams<{ token: string }>();
  const [meta, setMeta] = useState<SharedFileMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  function replacePreviewUrl(blob: Blob) {
    const objectUrl = URL.createObjectURL(blob);
    setPreviewUrl((old) => {
      if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      return objectUrl;
    });
  }

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!token) return;
    sharesApi.publicGet(token)
      .then(({ data }) => {
        setMeta(data);
        if (!data.requiresPassword) {
          return sharesApi.publicContent(token).then(({ data: blob }) => {
            replacePreviewUrl(blob as Blob);
            setUnlocked(true);
          });
        }
      })
      .catch((err) => setError(getApiErrorMessage(err)));
  }, [token]);

  async function onUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setUnlocking(true);
    try {
      const { data } = await sharesApi.publicContent(token, { password });
      replacePreviewUrl(data as Blob);
      setUnlocked(true);
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { setUnlocking(false); }
  }

  async function onDownload() {
    if (!token) return;
    setDownloading(true);
    try {
      const { data } = await sharesApi.publicContent(token, { download: true, password: password || undefined });
      downloadBlob(data as Blob, meta?.document?.name || "document");
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { setDownloading(false); }
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="surface max-w-md p-10 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <h1 className="mt-4 font-display text-xl font-semibold">Link unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { Icon, tone } = fileIcon(meta.document.mimeType);
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <FerryLogo size={26} />
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> Secure shared link
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="surface overflow-hidden">
          <div className="flex items-center gap-3 border-b p-5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${tone}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-semibold">{meta.document.name}</h1>
              <p className="text-xs text-muted-foreground">
                {formatBytes(meta.document.size)} · Shared {formatDate(meta.document.createdAt)}
                {meta.expiresAt ? ` · Expires ${formatDate(meta.expiresAt)}` : ""}
              </p>
            </div>
            {meta.allowDownload && (
              <Button onClick={onDownload} disabled={downloading}>
                {downloading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                Download
              </Button>
            )}
          </div>
          {meta.requiresPassword && !unlocked ? (
            <div className="border-t bg-secondary/30 p-10">
              <form onSubmit={onUnlock} className="mx-auto max-w-sm space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5">
                  <Lock className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <h2 className="font-display text-base font-semibold">Password protected</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enter the password the sender shared with you.
                  </p>
                </div>
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="pw">Password</Label>
                  <Input
                    id="pw"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <Button type="submit" disabled={unlocking || !password} className="w-full">
                  {unlocking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                  Unlock
                </Button>
              </form>
            </div>
          ) : (
            <DocumentPreview url={previewUrl} mimeType={meta.document.mimeType} onDownload={meta.allowDownload ? onDownload : undefined} />
          )}
          {!meta.allowDownload && (
            <p className="border-t px-5 py-3 text-xs text-muted-foreground">
              <Eye className="mr-1 inline h-3 w-3" /> Preview-only link — downloads are disabled.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
