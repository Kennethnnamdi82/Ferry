import { FileText, FileImage, FileArchive, FileVideo, FileAudio, FileSpreadsheet, FileType } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function fileIcon(mime: string): { Icon: LucideIcon; tone: string } {
  if (mime.startsWith("image/")) return { Icon: FileImage, tone: "bg-[#8b5cf6]/10 text-[#8b5cf6]" };
  if (mime.startsWith("video/")) return { Icon: FileVideo, tone: "bg-[#ec4899]/10 text-[#ec4899]" };
  if (mime.startsWith("audio/")) return { Icon: FileAudio, tone: "bg-[#06b6d4]/10 text-[#06b6d4]" };
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("tar"))
    return { Icon: FileArchive, tone: "bg-[#f59e0b]/10 text-[#f59e0b]" };
  if (mime.includes("sheet") || mime.includes("csv") || mime.includes("excel"))
    return { Icon: FileSpreadsheet, tone: "bg-[#10b981]/10 text-[#10b981]" };
  if (mime.includes("pdf")) return { Icon: FileType, tone: "bg-[#ef4444]/10 text-[#ef4444]" };
  if (mime.includes("word") || mime.includes("document"))
    return { Icon: FileText, tone: "bg-[#3b82f6]/10 text-[#3b82f6]" };
  return { Icon: FileText, tone: "bg-[#3b82f6]/10 text-[#3b82f6]" };
}

export const CATEGORY_TONES: Record<string, string> = {
  Identity: "bg-[#3b82f6]/10 text-[#3b82f6]",
  Education: "bg-[#8b5cf6]/10 text-[#8b5cf6]",
  Property: "bg-[#10b981]/10 text-[#10b981]",
  Medical: "bg-[#ef4444]/10 text-[#ef4444]",
  Financial: "bg-[#f59e0b]/10 text-[#f59e0b]",
  Other: "bg-secondary text-muted-foreground",
};
