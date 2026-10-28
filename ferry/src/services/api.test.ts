import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios, { AxiosError, AxiosAdapter } from "axios";
import { api, authApi, tokenStore } from "./api";

const originalAdapter = api.defaults.adapter;
beforeEach(() => localStorage.clear());
afterEach(() => { api.defaults.adapter = originalAdapter; vi.restoreAllMocks(); });

function unauthorizedAdapter(): AxiosAdapter {
  return async (config) => {
    throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined,
      { status: 401, statusText: "Unauthorized", data: { message: "Invalid credentials" }, headers: {}, config });
  };
}

describe("session recovery", () => {
  it("wrong login credentials do not trigger token refresh or disturb an existing session", async () => {
    tokenStore.setTokens("old-access", "old-refresh");
    api.defaults.adapter = unauthorizedAdapter();
    const refresh = vi.spyOn(axios, "post");
    await expect(authApi.login({ email: "external@example.net", password: "wrong-password" })).rejects.toMatchObject({ response: { status: 401 } });
    expect(refresh).not.toHaveBeenCalled();
    expect(tokenStore.refresh).toBe("old-refresh");
  });

  it("concurrent expired requests share one refresh and retry with the new token", async () => {
    tokenStore.setTokens("expired-access", "valid-refresh");
    const refresh = vi.spyOn(axios, "post").mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { data: { accessToken: "new-access", refreshToken: "new-refresh" } };
    });
    api.defaults.adapter = async (config) => {
      if (config.headers.get("Authorization") !== "Bearer new-access") return unauthorizedAdapter()(config);
      return { status: 200, statusText: "OK", data: { ok: true }, headers: {}, config };
    };
    await expect(Promise.all([api.get("/vaults"), api.get("/documents")])).resolves.toHaveLength(2);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(tokenStore.access).toBe("new-access");
  });

  it("corrupt cached user data does not crash the application", () => {
    localStorage.setItem("vault_user", "{invalid-json");
    expect(tokenStore.getUser()).toBeNull();
  });
});
