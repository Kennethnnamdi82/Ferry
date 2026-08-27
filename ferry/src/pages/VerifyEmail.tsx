import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { authApi, getApiErrorMessage } from "@/services/api";

type VerificationState = "loading" | "success" | "error";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();

  const [state, setState] = useState<VerificationState>("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setState("error");
      setMessage("This verification link is invalid.");
      return;
    }

    const verify = async () => {
      try {
        const response = await authApi.verifyEmail(token);

        setState("success");
        setMessage(response.data.message);
      } catch (error) {
        setState("error");
        setMessage(getApiErrorMessage(error));
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        {state === "loading" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin" />

            <h1 className="mt-6 text-2xl font-semibold">
              Verifying your email
            </h1>

            <p className="mt-2 text-muted-foreground">
              Please wait while we verify your Ferry account.
            </p>
          </>
        )}

        {state === "success" && (
          <>
            <CheckCircle2 className="mx-auto h-16 w-16" />

            <h1 className="mt-6 text-2xl font-semibold">Email verified!</h1>

            <p className="mt-2 text-muted-foreground">{message}</p>

            <Link
              to="/login"
              className="inline-flex mt-6 rounded-lg bg-primary px-5 py-3 text-primary-foreground hover:opacity-90 transition"
            >
              Continue to Ferry
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <XCircle className="mx-auto h-16 w-16" />

            <h1 className="mt-6 text-2xl font-semibold">Verification failed</h1>

            <p className="mt-2 text-muted-foreground">{message}</p>

            <Link
              to="/login"
              className="inline-flex mt-6 rounded-lg border px-5 py-3 hover:bg-muted transition"
            >
              Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
