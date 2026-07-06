import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { adminApi, getApiErrorMessage } from "@/services/api";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

interface Log {
  _id: string;
  action: string;
  target?: string;
  ip?: string;
  meta?: Record<string, unknown>;
  user: { name: string; email: string } | null;
  createdAt: string;
}

const COLOR: Record<string, string> = {
  register: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  login: "bg-secondary text-muted-foreground",
  logout: "bg-secondary text-muted-foreground",
  upload: "bg-accent/10 text-accent",
  download: "bg-accent/10 text-accent",
  update: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
  delete: "bg-destructive/10 text-destructive",
  admin_action: "bg-foreground/10 text-foreground",
};

export default function AdminLogs() {
  const [logs, setLogs] = useState<Log[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await adminApi.logs();
        setLogs(data.logs as Log[]);
      } catch (err) {
        toast.error(getApiErrorMessage(err));
        setLogs([]);
      }
    })();
  }, []);

  return (
    <AppLayout mode="admin">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">The last 200 events across the system.</p>
      </div>

      <div className="surface mt-7 overflow-hidden">
        {logs === null ? (
          <div className="divide-y">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-3 p-4">
                <div className="h-5 w-20 rounded bg-secondary" />
                <div className="h-3 w-1/3 rounded bg-secondary" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No activity yet
          </div>
        ) : (
          <ul className="divide-y">
            {logs.map((l) => (
              <li key={l._id} className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/40">
                <span
                  className={`min-w-[90px] rounded-md px-2 py-0.5 text-center text-[11px] font-medium ${
                    COLOR[l.action] ?? "bg-secondary text-muted-foreground"
                  }`}
                >
                  {l.action.replace("_", " ")}
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">{l.user?.name ?? "Unknown"}</span>
                  <span className="text-[12px] text-muted-foreground"> · {l.user?.email ?? "—"}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(l.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}
