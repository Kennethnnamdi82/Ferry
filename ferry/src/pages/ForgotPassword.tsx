import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { FerryLogo } from "@/components/FerryLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, getApiErrorMessage } from "@/services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.forgotPassword({ email });
      setSent(true);
      toast.success(data.message);
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
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Mail className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mt-7 font-display text-3xl font-semibold tracking-tight">
            Reset your password
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Enter your email and we will send a reset link if the account can use one.
          </p>

          {sent ? (
            <div className="mt-8 rounded-lg border bg-muted/40 p-4 text-sm">
              <p className="font-medium">Check your email</p>
              <p className="mt-1 text-muted-foreground">
                If an account exists for {email}, a reset link is on the way.
              </p>
              <Button asChild className="mt-5 h-10 w-full">
                <Link to="/login">Back to login</Link>
              </Button>
            </div>
          ) : (
            <form className="mt-8 space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[13px] font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? "Sending..." : "Send reset link"}
                {!loading && <ArrowRight className="ml-1.5 h-4 w-4" />}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-primary md:block">
        <div className="absolute inset-0 bg-grid opacity-[0.06]" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-accent/30" />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <FerryLogo size={32} />
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Secure access for every important file.
          </h2>
        </div>
      </div>
    </div>
  );
}
