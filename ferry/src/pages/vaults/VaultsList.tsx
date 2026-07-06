import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { vaultsApi, Vault, getApiErrorMessage } from "@/services/api";
import { toast } from "sonner";
import { FolderOpen, Plus, Users, ChevronRight, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function VaultsList() {
  const [vaults, setVaults] = useState<Vault[] | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  function load() {
    vaultsApi.list()
      .then(({ data }) => setVaults(data.vaults))
      .catch((err) => {
        toast.error(getApiErrorMessage(err));
        setVaults([]);
      });
  }

  useEffect(load, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await vaultsApi.create({ name: name.trim(), description: description.trim() });
      toast.success("Vault created");
      setOpen(false); setName(""); setDescription("");
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally { setCreating(false); }
  }

  return (
    <AppLayout>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Vaults</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Group documents by project, family, or team. You're the editor of any vault you create.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1.5 h-4 w-4" /> New vault</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a vault</DialogTitle>
              <DialogDescription>You become the editor and can invite viewers.</DialogDescription>
            </DialogHeader>
            <form onSubmit={onCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="vname">Name</Label>
                <Input id="vname" placeholder="e.g. Family Documents" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vdesc">Description</Label>
                <Textarea id="vdesc" rows={3} placeholder="Optional" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create vault
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {vaults === null ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl border bg-secondary/40" />
          ))
        ) : vaults.length === 0 ? (
          <div className="surface col-span-full p-12 text-center">
            <p className="text-base font-medium">You don't have any vaults yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Create one to start organizing your files.</p>
          </div>
        ) : vaults.map((v) => (
          <Link key={v._id} to={`/vaults/${v._id}`} className="surface-lift group block p-5 animate-fade-in">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <FolderOpen className="h-5 w-5" />
              </div>
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${v.role === "editor" ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}>
                {v.role}
              </span>
            </div>
            <div className="mt-4 truncate text-[15px] font-medium">{v.name}</div>
            {v.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{v.description}</p>
            )}
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{v.documentCount} file{v.documentCount === 1 ? "" : "s"}</span>
              <span>{formatDate(v.updatedAt)}</span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3 w-3" /> {v.owner.name}
              </span>
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
