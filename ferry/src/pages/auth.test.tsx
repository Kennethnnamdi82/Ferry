import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { authApi, RegisterResponse, tokenStore, User } from "@/services/api";
import Register from "./Register";
import Login from "./Login";
import { TextEncoder } from "node:util";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const user: User = { id: "test-id", name: "External User", email: "external@example.net",
  role: "user", status: "active", emailVerified: false, storageUsed: 0, createdAt: "2026-10-28" };
const session = { user, accessToken: "test-access", refreshToken: "test-refresh" };

function Dashboard() {
  const auth = useAuth();
  return <div>Dashboard: {auth.user?.email}</div>;
}

function renderAuth(route: string) {
  return render(<MemoryRouter initialEntries={[route]}><AuthProvider><Routes>
    <Route path="/register" element={<Register />} />
    <Route path="/login" element={<Login />} />
    <Route path="/dashboard" element={<Dashboard />} />
  </Routes></AuthProvider></MemoryRouter>);
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("TextEncoder", TextEncoder);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("public account flows", () => {
  it("signup stores the session and opens the dashboard without requiring email delivery", async () => {
    const response: RegisterResponse = { ...session, message: "Account created successfully.",
      verificationRequired: false, verificationEmailSent: false };
    const signup = vi.spyOn(authApi, "register").mockResolvedValue({ data: response } as never);
    renderAuth("/register");
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: user.name } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: user.email } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Strong-password-42" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText(`Dashboard: ${user.email}`)).toBeInTheDocument();
    expect(signup).toHaveBeenCalledWith({ name: user.name, email: user.email, password: "Strong-password-42" });
    expect(tokenStore.access).toBe(session.accessToken);
    expect(tokenStore.refresh).toBe(session.refreshToken);
    expect(tokenStore.getUser()).toEqual(user);
  });

  it("retains the verification screen only when the backend requires verification", async () => {
    vi.spyOn(authApi, "register").mockResolvedValue({ data: { user, message: "Account created. Verification email is currently unavailable.",
      verificationRequired: true, verificationEmailSent: false } } as never);
    renderAuth("/register");
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: user.name } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: user.email } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Strong-password-42" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Account created. Verification email is currently unavailable.")).toBeInTheDocument();
    expect(tokenStore.access).toBeNull();
  });

  it("an unverified user can log in and open the dashboard", async () => {
    vi.spyOn(authApi, "login").mockResolvedValue({ data: session } as never);
    renderAuth("/login");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: user.email } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Strong-password-42" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText(`Dashboard: ${user.email}`)).toBeInTheDocument();
    expect(tokenStore.access).toBe(session.accessToken);
  });

  it("does not authenticate a cached user without tokens", async () => {
    tokenStore.setUser(user);
    renderAuth("/dashboard");
    await waitFor(() => expect(screen.getByText("Dashboard:")).toBeInTheDocument());
    expect(screen.queryByText(`Dashboard: ${user.email}`)).not.toBeInTheDocument();
  });
});
