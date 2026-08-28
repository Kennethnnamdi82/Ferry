import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { FerryLogo } from "@/components/FerryLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, getApiErrorMessage } from "@/services/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      toast.error("This reset link is invalid.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.resetPassword({ token, password });
      toast.success(data.message);
      nav("/login", { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative flex flex-col px-6 py-8 md:px-12">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex w-fit">
            <FerryLogo size={30} withWordmark />
          </Link>
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Choose a new password
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your reset link can only be used once.
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px] font-medium">
                New password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
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
            <Button type="submit" className="h-11 w-full" disabled={loading || !token}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Saving..." : "Reset password"}
              {!loading && <ArrowRight className="ml-1.5 h-4 w-4" />}
            </Button>
          </form>

          {!token && (
            <p className="mt-4 text-sm text-destructive">
              This reset link is invalid. Request a new one.
            </p>
          )}
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-primary md:block">
        <div className="absolute inset-0 bg-grid opacity-[0.06]" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-accent/30" />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <FerryLogo size={32} />
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Back to your Ferry workspace in a moment.
          </h2>
        </div>
      </div>
    </div>
  );
}
