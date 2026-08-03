import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lock, Zap, Users, FileText, ShieldCheck, CheckCircle2, Star } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { FerryLogo } from "@/components/FerryLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <FerryLogo size={30} withWordmark />
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Features</a>
            <a href="#how" className="text-sm text-muted-foreground transition-colors hover:text-foreground">How it works</a>
            <a href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Button asChild size="sm">
                <Link to="/dashboard">Open app <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/register">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-60" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-accent/10 to-transparent" />
        <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-20 text-center md:pt-28">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm transition-colors hover:border-accent/40 hover:text-foreground"
          >
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">New</span>
            End-to-end encryption is now standard
            <ArrowRight className="h-3 w-3" />
          </Link>

          <h1 className="font-display mt-6 text-balance text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            Your documents,
            <br />
            <span className="gradient-text">organized and secure.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-muted-foreground">
            Ferry is a clean, modern home for your important files. Upload,
            organize, and share — protected by encryption from the start.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link to={user ? "/dashboard" : "/register"}>
                {user ? "Open your workspace" : "Start for free"}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-6 text-base">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> No credit card</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> Free forever plan</span>
          </div>

          {/* App preview */}
          <div className="relative mx-auto mt-16 max-w-4xl">
            <div className="surface overflow-hidden text-left" style={{ boxShadow: "var(--shadow-lg)" }}>
              <div className="flex items-center justify-between border-b bg-secondary/50 px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                </div>
                <span className="text-xs text-muted-foreground">app.ferry.io / dashboard</span>
                <span className="w-12" />
              </div>
              <div className="grid grid-cols-[180px_1fr] bg-background">
                <div className="border-r p-3 text-xs">
                  <div className="mb-2 flex items-center gap-2"><FerryLogo size={20} /><span className="font-medium">Ferry</span></div>
                  <div className="mt-3 space-y-0.5">
                    <div className="rounded-md bg-primary px-2.5 py-1.5 text-primary-foreground">Documents</div>
                    <div className="px-2.5 py-1.5 text-muted-foreground">Upload</div>
                    <div className="px-2.5 py-1.5 text-muted-foreground">Shared</div>
                    <div className="px-2.5 py-1.5 text-muted-foreground">Trash</div>
                  </div>
                </div>
                <div className="p-5">
                  <div className="text-sm font-semibold">Documents</div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      { n: "Q4 Report.pdf", c: "bg-[#ef4444]/10 text-[#ef4444]" },
                      { n: "Contract.docx", c: "bg-[#3b82f6]/10 text-[#3b82f6]" },
                      { n: "Budget.xlsx", c: "bg-[#10b981]/10 text-[#10b981]" },
                      { n: "Logo.png", c: "bg-[#8b5cf6]/10 text-[#8b5cf6]" },
                      { n: "Pitch.key", c: "bg-[#f59e0b]/10 text-[#f59e0b]" },
                      { n: "Notes.md", c: "bg-foreground/5 text-foreground" },
                    ].map((f) => (
                      <div key={f.n} className="rounded-lg border p-2.5">
                        <div className={`flex h-7 w-7 items-center justify-center rounded ${f.c}`}>
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                        <div className="mt-2 truncate text-[11px] font-medium">{f.n}</div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">2.4 MB</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos / trust */}
      <section className="border-y bg-secondary/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 py-6 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <span>Trusted by teams at</span>
          {["Northwind", "Acme Co", "Lattice", "Vector", "Helix", "Form"].map((n) => (
            <span key={n} className="text-foreground/60">{n}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-accent">Built for teams</p>
          <h2 className="font-display mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
            Everything you need to manage documents
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Powerful features wrapped in a calm, focused interface. No clutter, no learning curve.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            { icon: Lock, title: "Encrypted by default", body: "Files are encrypted at rest. Download links are signed and expire in seconds." },
            { icon: Zap, title: "Fast as it should be", body: "Drag, drop, done. Search by name, tag, or type — instant, no spinners." },
            { icon: Users, title: "Team-ready controls", body: "Roles, permissions, and a full activity log out of the box. Own your data." },
          ].map((f) => (
            <div key={f.title} className="surface-lift p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t bg-secondary/30">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-accent">How it works</p>
            <h2 className="font-display mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
              Set up in under a minute
            </h2>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              { step: "01", title: "Create your account", body: "Sign up with email and password. No credit card required." },
              { step: "02", title: "Upload your files", body: "Drag and drop, or browse. Add tags and a description as you go." },
              { step: "03", title: "Find anything, instantly", body: "Search, share, and download with one click — anytime, from anywhere." },
            ].map((s) => (
              <div key={s.step} className="surface p-6">
                <div className="text-xs font-semibold tracking-widest text-accent">{s.step}</div>
                <h3 className="mt-2 text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <div className="flex justify-center gap-1 text-accent">
          {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
        </div>
        <p className="font-display mt-6 text-2xl font-medium leading-snug tracking-tight text-foreground md:text-3xl">
          “Ferry replaced three different tools for us. The interface is so clean
          our team actually files things now.”
        </p>
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <div className="h-9 w-9 rounded-full bg-foreground" />
          <div className="text-left">
            <div className="font-medium text-foreground">Maya Chen</div>
            <div className="text-xs text-muted-foreground">Head of Operations, Northwind</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="border-t">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Ready when you are.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">
            Free forever for individuals. Upgrade when your team grows.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link to={user ? "/dashboard" : "/register"}>
                {user ? "Open your workspace" : "Create your account"}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-6 text-base">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <FerryLogo size={22} />
            <span>© 2026 Ferry. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
