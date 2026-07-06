import { Loader2, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  url: string | null;
  mimeType: string;
  loading?: boolean;
  onDownload?: () => void;
}

export function DocumentPreview({ url, mimeType, loading, onDownload }: Props) {
  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center bg-secondary/40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!url) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 bg-secondary/40 p-6 text-center">
        <FileText className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No preview available.</p>
        {onDownload && <Button size="sm" onClick={onDownload}><Download className="mr-1.5 h-3.5 w-3.5" /> Download</Button>}
      </div>
    );
  }
  if (mimeType.startsWith("image/")) {
    return (
      <div className="flex min-h-[420px] items-center justify-center bg-[#0f1115] p-3">
        <img src={url} alt="Preview" className="max-h-[70vh] max-w-full rounded-md object-contain" />
      </div>
    );
  }
  if (mimeType === "application/pdf") {
    return (
      <iframe
        src={url}
        title="PDF preview"
        className="h-[70vh] w-full bg-[#1a1c20]"
      />
    );
  }
  if (mimeType.startsWith("video/")) {
    return (
      <div className="bg-black p-3">
        <video src={url} controls className="mx-auto max-h-[70vh] w-full" />
      </div>
    );
  }
  if (mimeType.startsWith("audio/")) {
    return (
      <div className="flex min-h-[160px] items-center justify-center bg-secondary/40 p-6">
        <audio src={url} controls className="w-full max-w-md" />
      </div>
    );
  }
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 bg-secondary/40 p-6 text-center">
      <FileText className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">In-app preview isn't available for this file type.</p>
      {onDownload && <Button size="sm" onClick={onDownload}><Download className="mr-1.5 h-3.5 w-3.5" /> Download to view</Button>}
    </div>
  );
}
