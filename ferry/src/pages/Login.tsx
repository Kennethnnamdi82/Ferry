import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth, getApiErrorMessage } from "@/context/AuthContext";
import { authApi } from "@/services/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { FerryLogo } from "@/components/FerryLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Login({ adminLogin = false }: { adminLogin?: boolean }) {
  const { login } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resending, setResending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      if (adminLogin && u.role !== "admin") {
        toast.error("Admin access required");
        return;
      }
      toast.success("Welcome back");
      const destination = adminLogin
        ? from && from.startsWith("/admin") && from !== "/admin/login" ? from : "/admin"
        : from || (u.role === "admin" ? "/admin" : "/dashboard");
      nav(destination, { replace: true });
    } catch (err) {
      const code = (err as { response?: { data?: { code?: string } } })
        ?.response?.data?.code;
      if (code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(email);
      }
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    if (!unverifiedEmail) return;
    setResending(true);
    try {
      const { data } = await authApi.resendVerification({
        email: unverifiedEmail,
      });
      toast.success(data.message);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Left: form */}
      <div className="relative flex flex-col px-6 py-8 md:px-12">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex w-fit">
            <FerryLogo size={30} withWordmark />
          </Link>
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {adminLogin ? "Admin sign in" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {adminLogin ? "Sign in with an administrator account." : "Sign in to your Ferry workspace."}
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            {unverifiedEmail && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="font-medium">Verify your email to sign in.</p>
                <p className="mt-1 text-muted-foreground">
                  We can send a fresh verification link to {unverifiedEmail}.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 h-9"
                  disabled={resending}
                  onClick={resendVerification}
                >
                  {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Resend verification
                </Button>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[13px] font-medium">Password</Label>
                <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">Forgot?</Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="h-11 w-full text-[15px]" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Signing in…" : "Sign in"}
              {!loading && <ArrowRight className="ml-1.5 h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
              Create one
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">© 2026 Ferry</p>
      </div>

      {/* Right: visual */}
      <div className="relative hidden overflow-hidden bg-primary md:block">
        <div className="absolute inset-0 bg-grid opacity-[0.06]" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-accent/30" />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <FerryLogo size={32} />
          <blockquote>
            <p className="font-display text-2xl font-medium leading-snug tracking-tight">
              "Ferry feels like the document tool we always wished we had —
              fast, calm, and out of the way."
            </p>
            <footer className="mt-5 text-sm text-primary-foreground/70">
              Maya Chen · Head of Operations, Northwind
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
