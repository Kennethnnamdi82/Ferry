import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, getApiErrorMessage } from "@/context/AuthContext";
import { authApi } from "@/services/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { FerryLogo } from "@/components/FerryLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

export default function Register() {
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = schema.safeParse(form);

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);

    try {
      const result = await register(
        parsed.data.name,
        parsed.data.email,
        parsed.data.password,
      );

      setRegisteredEmail(parsed.data.email);

      toast.success("Account created. Check your email.");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    if (!registeredEmail) return;
    setResending(true);
    try {
      const { data } = await authApi.resendVerification({
        email: registeredEmail,
      });
      toast.success(data.message);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  /*
   * Email verification screen
   *
   * This is shown immediately after successful registration.
   * The user is NOT authenticated yet.
   */
  if (registeredEmail) {
    return (
      <div className="grid min-h-screen md:grid-cols-2">
        {/* Left */}
        <div className="relative flex flex-col px-6 py-8 md:px-12">
          <div className="flex items-center justify-between">
            <Link to="/" className="inline-flex w-fit">
              <FerryLogo size={30} withWordmark />
            </Link>

            <ThemeToggle />
          </div>

          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>

            <h1 className="mt-7 font-display text-3xl font-semibold tracking-tight">
              Check your email
            </h1>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              We've sent a verification link to:
            </p>

            <p className="mt-2 break-all font-medium text-foreground">
              {registeredEmail}
            </p>

            <div className="mt-7 rounded-xl border bg-muted/40 p-4">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

                <div>
                  <p className="text-sm font-medium">
                    Verify your email to continue
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Open the email from Ferry and click the verification button.
                    After verification, return here and sign in.
                  </p>
                </div>
              </div>
            </div>

            <Button asChild className="mt-7 h-11 w-full">
              <Link to="/login">
                Go to login
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              Didn't receive the email?{" "}
              <button
                type="button"
                disabled={resending}
                className="font-medium text-foreground underline-offset-4 hover:underline"
                onClick={resendVerification}
              >
                {resending ? "Sending..." : "Resend verification"}
              </button>
            </p>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              © 2026 Ferry
            </p>
          </div>
        </div>

        {/* Right: visual */}
        <div className="relative hidden overflow-hidden bg-primary md:block">
          <div className="absolute inset-0 bg-grid opacity-[0.06]" />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-accent/30" />

          <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
            <FerryLogo size={32} />

            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight">
                Your files deserve a secure home.
              </h2>

              <ul className="mt-7 space-y-3 text-[15px] text-primary-foreground/85">
                {[
                  "Encrypted at rest, every file",
                  "Drag-and-drop uploads with tags",
                  "Search by name, type, or tag",
                  "Free forever for individuals",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
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
            Create your account
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Start organizing your documents in under a minute.
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[13px] font-medium">
                Full name
              </Label>

              <Input
                id="name"
                placeholder="Jane Doe"
                required
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-medium">
                Email
              </Label>

              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                required
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value,
                  })
                }
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px] font-medium">
                Password
              </Label>

              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  placeholder="At least 8 characters"
                  required
                  value={form.password}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      password: e.target.value,
                    })
                  }
                  className="h-11 pr-10"
                />

                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters.
              </p>
            </div>

            <Button
              type="submit"
              className="h-11 w-full text-[15px]"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}

              {loading ? "Creating account…" : "Create account"}

              {!loading && <ArrowRight className="ml-1.5 h-4 w-4" />}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              By creating an account, you agree to our Terms and Privacy Policy.
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          © 2026 Ferry
        </p>
      </div>

      {/* Right: visual */}
      <div className="relative hidden overflow-hidden bg-primary md:block">
        <div className="absolute inset-0 bg-grid opacity-[0.06]" />

        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-accent/30" />

        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <FerryLogo size={32} />

          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight">
              A calmer home for your important files.
            </h2>

            <ul className="mt-7 space-y-3 text-[15px] text-primary-foreground/85">
              {[
                "Encrypted at rest, every file",
                "Drag-and-drop uploads with tags",
                "Search by name, type, or tag",
                "Free forever for individuals",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
