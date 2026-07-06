import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ScanText, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface OcrPanelProps {
  url: string | null;
  mimeType: string;
}

/**
 * Client-side OCR for image documents using tesseract.js.
 * Loads the worker only when the user clicks "Extract text" — keeps the bundle lean.
 * PDFs are not supported in-browser (would require pdf.js page rendering).
 */
export function OcrPanel({ url, mimeType }: OcrPanelProps) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const supported = mimeType.startsWith("image/");
  if (!supported) return null;

  async function run() {
    if (!url) return;
    setRunning(true);
    setProgress(0);
    setText(null);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") setProgress(Math.round(m.progress * 100));
        },
      });
      const { data } = await worker.recognize(url);
      await worker.terminate();
      setText((data.text || "").trim() || "No text detected.");
    } catch (err) {
      console.error(err);
      toast.error("OCR failed. Try again.");
    } finally {
      setRunning(false);
    }
  }

  async function copy() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="surface p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">Extract text (OCR)</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Pull readable text out of this image.</p>
        </div>
        <Button size="sm" onClick={run} disabled={running || !url}>
          {running ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ScanText className="mr-1.5 h-3.5 w-3.5" />}
          {running ? `${progress}%` : text ? "Re-run" : "Extract text"}
        </Button>
      </div>

      {text !== null && (
        <div className="mt-4">
          <div className="relative">
            <textarea
              readOnly
              value={text}
              rows={Math.min(12, Math.max(4, text.split("\n").length))}
              className="w-full resize-y rounded-lg border bg-background p-3 font-mono text-xs leading-relaxed"
            />
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-2 top-2 h-7"
              onClick={copy}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}