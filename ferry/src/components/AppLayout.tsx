import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LogOut, FolderOpen, Upload, Users, FileText, ScrollText,
  Activity, Menu, X, Trash2, Share2, LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FerryLogo } from "@/components/FerryLogo";

const userNav = [
  { to: "/dashboard", label: "All files", icon: LayoutDashboard },
  { to: "/vaults", label: "Vaults", icon: FolderOpen },
  { to: "/shared", label: "Shared with me", icon: Share2 },
  { to: "/trash", label: "Trash", icon: Trash2 },
  { to: "/activity", label: "Activity", icon: Activity },
];

const adminNav = [
  { to: "/admin", label: "Overview", icon: Activity },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/vaults", label: "Vaults", icon: FolderOpen },
  { to: "/admin/documents", label: "Documents", icon: FileText },
  { to: "/admin/shares", label: "Shares", icon: Share2 },
  { to: "/admin/logs", label: "Activity", icon: ScrollText },
];

export function AppLayout({ children, mode = "user" }: { children: React.ReactNode; mode?: "user" | "admin" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = mode === "admin" ? adminNav : userNav;
  const [open, setOpen] = useState(false);

  const SidebarBody = (
    <>
      <Link to="/dashboard" className="flex items-center gap-2.5 px-5 py-5">
        <FerryLogo size={26} />
        <span className="ml-1 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {mode === "admin" ? "Admin" : "Beta"}
        </span>
      </Link>

      {mode === "user" && (
        <div className="px-3 pb-3">
          <Button asChild className="h-10 w-full justify-start">
            <Link to="/upload">
              <Upload className="mr-2 h-4 w-4" /> Upload
            </Link>
          </Button>
        </div>
      )}

      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors",
                isActive
                  ? "bg-foreground text-background"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
              )
            }
          >
            <item.icon className="h-[17px] w-[17px]" />
            <span className="flex-1">{item.label}</span>
          </NavLink>
        ))}

      </nav>

      <div className="border-t p-3">
        <div className="mb-2 flex items-center gap-2 px-2 text-[11px] text-muted-foreground">
          <span className="dot-live" />
          <span>All systems normal</span>
        </div>
        <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-sidebar-accent/60 px-2.5 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[12px] font-semibold text-background">
            {user?.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-foreground">{user?.name}</div>
            <div className="truncate text-[11px] text-muted-foreground">{user?.email}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={async () => {
            await logout();
            navigate("/login");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar md:flex">
        {SidebarBody}
      </aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r bg-sidebar shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {SidebarBody}
          </aside>
        </div>
      )}

      <main className="flex-1 overflow-x-hidden">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur md:hidden">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <FerryLogo size={22} />
          <div className="w-9" />
        </header>
        <div className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-10 animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
