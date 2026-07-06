import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { adminApi, User, getApiErrorMessage } from "@/services/api";
import { formatBytes, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      const { data } = await adminApi.users();
      setUsers(data.users);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      setUsers([]);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleStatus(u: User) {
    setBusy(u.id);
    try {
      const next = u.status === "active" ? "suspended" : "active";
      await adminApi.updateUser(u.id, { status: next });
      setUsers((arr) => arr?.map((x) => (x.id === u.id ? { ...x, status: next } : x)) ?? null);
      toast.success(`User ${next}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function toggleRole(u: User) {
    setBusy(u.id);
    try {
      const next = u.role === "admin" ? "user" : "admin";
      await adminApi.updateUser(u.id, { role: next });
      setUsers((arr) => arr?.map((x) => (x.id === u.id ? { ...x, role: next } : x)) ?? null);
      toast.success("Role updated");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function remove(u: User) {
    if (!confirm(`Delete ${u.email}? This removes all their files.`)) return;
    setBusy(u.id);
    try {
      await adminApi.deleteUser(u.id);
      setUsers((arr) => arr?.filter((x) => x.id !== u.id) ?? null);
      toast.success("User deleted");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppLayout mode="admin">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Manage accounts, roles, and access.</p>
      </div>

      <div className="surface mt-7 overflow-hidden">
        {users === null ? (
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-3 p-4">
                <div className="h-9 w-9 rounded-full bg-secondary" />
                <div className="h-3 w-1/3 rounded bg-secondary" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No users yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-secondary/50 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Storage</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-secondary/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-[12px] font-semibold text-background">
                          {u.name?.charAt(0).toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-[11px] text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${
                          u.role === "admin"
                            ? "bg-accent/10 text-accent"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                          u.status === "active"
                            ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {u.status}
                      </span>
                    </td>
                    <td className="stat-num px-5 py-3.5 text-xs">{formatBytes(u.storageUsed)}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => toggleRole(u)} disabled={busy === u.id}>
                          {u.role === "admin" ? "Demote" : "Promote"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleStatus(u)} disabled={busy === u.id}>
                          {u.status === "active" ? "Suspend" : "Activate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => remove(u)}
                          disabled={busy === u.id}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          {busy === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
