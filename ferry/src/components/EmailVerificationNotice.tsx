import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authApi, getApiErrorMessage } from "@/services/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function EmailVerificationNotice() {
  const { user, refresh } = useAuth();
  const [sending, setSending] = useState(false);
  if (!user || user.emailVerified) return null;

  async function send() {
    setSending(true);
    try {
      const { data } = await authApi.resendVerification({ email: user!.email });
      toast.success(data.message);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-secondary/40 p-4">
      <p className="text-sm text-muted-foreground">
        Your account is ready. Verify your email to receive vault invitations.
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={sending} onClick={send}>
          {sending ? "Sending..." : "Verify email"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => refresh().catch((error) => toast.error(getApiErrorMessage(error)))}>
          I've verified
        </Button>
      </div>
    </div>
  );
}
