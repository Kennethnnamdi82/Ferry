import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { adminApi, AdminStats, getApiErrorMessage } from "@/services/api";
import { formatBytes, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Users, FileText, HardDrive, Activity, ArrowUpRight, FolderOpen, Share2, Trash2 } from "lucide-react";

const ICONS = { register: Users, login: Users, logout: Users, upload: FileText, download: FileText, update: FileText, delete: FileText, admin_action: Activity } as const;

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await adminApi.stats();
        setStats(data);
      } catch (err) {
        toast.error(getApiErrorMessage(err));
      }
    })();
  }, []);

  const cards = [
    { label: "Total users", value: stats?.totalUsers, Icon: Users, tone: "bg-[#3b82f6]/10 text-[#3b82f6]" },
    { label: "Active documents", value: stats?.totalDocuments, Icon: FileText, tone: "bg-[#10b981]/10 text-[#10b981]" },
    { label: "Vaults", value: stats?.totalVaults, Icon: FolderOpen, tone: "bg-[#f59e0b]/10 text-[#f59e0b]" },
    { label: "Active shares", value: stats?.activeShares, Icon: Share2, tone: "bg-[#ec4899]/10 text-[#ec4899]" },
    { label: "Storage used", value: stats ? formatBytes(stats.totalStorage) : null, Icon: HardDrive, tone: "bg-[#8b5cf6]/10 text-[#8b5cf6]" },
    { label: "In trash", value: stats?.deletedDocuments, Icon: Trash2, tone: "bg-secondary text-muted-foreground" },
  ];

  return (
    <AppLayout mode="admin">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          A snapshot of system usage and recent activity.
        </p>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">{c.label}</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.tone}`}>
                <c.Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="stat-num mt-3 text-3xl font-semibold">
              {c.value === null || c.value === undefined ? (
                <div className="h-8 w-20 animate-pulse rounded bg-secondary" />
              ) : (
                c.value
              )}
            </div>
            <div className="mt-2 inline-flex items-center gap-1 text-xs text-[hsl(var(--success))]">
              <ArrowUpRight className="h-3 w-3" /> Live
            </div>
          </div>
        ))}
      </div>

      <div className="surface mt-8 overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="dot-live" /> Live
          </span>
        </div>
        {!stats ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-3 p-4">
                <div className="h-9 w-9 rounded-lg bg-secondary" />
                <div className="h-3 w-1/2 rounded bg-secondary" />
              </div>
            ))}
          </div>
        ) : stats.recentActivity.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No activity yet
          </div>
        ) : (
          <ul className="divide-y">
            {stats.recentActivity.map((log) => {
              const Icon = ICONS[log.action as keyof typeof ICONS] ?? Activity;
              return (
                <li key={log._id} className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/40">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <span className="font-medium">{log.user?.name ?? "Unknown"}</span>{" "}
                    <span className="text-muted-foreground">
                      · {log.action.replace("_", " ")}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(log.createdAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}
