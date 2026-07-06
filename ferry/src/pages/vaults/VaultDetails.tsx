import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { vaultsApi, Vault, VaultMember, UserRef, getApiErrorMessage } from "@/services/api";
import { toast } from "sonner";
import { ArrowLeft, Crown, Loader2, Save, Trash2, UserPlus, X } from "lucide-react";

export default function VaultDetails() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [vault, setVault] = useState<Vault | null>(null);
  const [owner, setOwner] = useState<(UserRef & { role: "editor" }) | null>(null);
  const [members, setMembers] = useState<VaultMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allowDl, setAllowDl] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const [{ data: v }, { data: m }] = await Promise.all([
        vaultsApi.get(id),
        vaultsApi.members(id),
      ]);
      setVault(v.vault);
      setName(v.vault.name);
      setDescription(v.vault.description);
      setAllowDl(v.vault.allowViewerDownload);
      setOwner(m.owner);
      setMembers(m.members);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      nav("/vaults");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const isEditor = vault?.role === "editor";

  async function onSave() {
    if (!id) return;
    setSaving(true);
    try {
      await vaultsApi.update(id, { name: name.trim(), description: description.trim(), allowViewerDownload: allowDl });
      toast.success("Saved");
      load();
    } catch (err) { toast.error(getApiErrorMessage(err)); }
    finally { setSaving(false); }
  }

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setInviting(true);
    try {
      await vaultsApi.invite(id, inviteEmail.trim());
      toast.success("Invitation sent");
      setInviteEmail("");
      load();
    } catch (err) { toast.error(getApiErrorMessage(err)); }
    finally { setInviting(false); }
  }

  async function onRemoveMember(memberId: string) {
    if (!id || !confirm("Remove this viewer?")) return;
    try {
      await vaultsApi.removeMember(id, memberId);
      toast.success("Member removed");
      setMembers((ms) => ms.filter((m) => m._id !== memberId));
    } catch (err) { toast.error(getApiErrorMessage(err)); }
  }

  async function onDelete() {
    if (!id || !confirm("Delete this vault and all its files?")) return;
    try {
      await vaultsApi.remove(id);
      toast.success("Vault deleted");
      nav("/vaults");
    } catch (err) { toast.error(getApiErrorMessage(err)); }
  }

  return (
    <AppLayout>
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link to="/vaults"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to vaults</Link>
      </Button>

      {loading || !vault ? (
        <div className="mt-8 flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-3 grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <div className="surface p-6">
              <h1 className="font-display text-2xl font-semibold tracking-tight">{vault.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{vault.documentCount} files</p>
              <div className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="vname">Name</Label>
                  <Input id="vname" disabled={!isEditor} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vdesc">Description</Label>
                  <Input id="vdesc" disabled={!isEditor} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-secondary/40 p-3">
                  <div>
                    <div className="text-sm font-medium">Allow viewers to download</div>
                    <div className="text-xs text-muted-foreground">When off, viewers can preview but not save files.</div>
                  </div>
                  <Switch checked={allowDl} onCheckedChange={setAllowDl} disabled={!isEditor} />
                </div>
                {isEditor && (
                  <div className="flex items-center justify-between border-t pt-4">
                    <Button onClick={onSave} disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save changes
                    </Button>
                    <Button variant="ghost" onClick={onDelete} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete vault
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <Button asChild variant="outline" className="w-full">
              <Link to={`/dashboard?vault=${vault._id}`}>Open files in this vault →</Link>
            </Button>
          </div>

          <aside className="surface h-fit p-6">
            <h2 className="text-sm font-semibold">People</h2>
            {isEditor && (
              <form onSubmit={onInvite} className="mt-4 flex gap-2">
                <Input
                  type="email"
                  placeholder="Invite by email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
                <Button type="submit" size="sm" disabled={inviting}>
                  {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                </Button>
              </form>
            )}
            <ul className="mt-4 space-y-2">
              {owner && (
                <li className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold">
                    {owner.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{owner.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{owner.email}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase text-background">
                    <Crown className="h-3 w-3" /> Editor
                  </span>
                </li>
              )}
              {members.map((m) => (
                <li key={m._id} className="flex items-center gap-3 rounded-lg p-3 hover:bg-secondary/40">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground text-xs font-semibold">
                    {m.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{m.user.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{m.user.email}</div>
                  </div>
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                    Viewer
                  </span>
                  {isEditor && (
                    <button
                      onClick={() => onRemoveMember(m._id)}
                      className="ml-1 text-muted-foreground hover:text-destructive"
                      aria-label="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {members.length === 0 && (
              <p className="mt-3 text-xs text-muted-foreground">No viewers yet.</p>
            )}
          </aside>
        </div>
      )}
    </AppLayout>
  );
}
