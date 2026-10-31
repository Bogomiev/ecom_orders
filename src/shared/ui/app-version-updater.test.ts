import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_VERSION } from "../config/app-version";
import { AppVersionUpdater } from "./app-version-updater";

const effect = vi.hoisted(() => ({ run: null as null | (() => () => void) }));
vi.mock("react", () => ({ useEffect: (run: () => () => void) => { effect.run = run; } }));

describe("AppVersionUpdater", () => {
  let cleanup: (() => void) | undefined;
  const reload = vi.fn();
  const querySelector = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    querySelector.mockReturnValue(null);
    vi.stubGlobal("window", {
      location: { reload }, setInterval: vi.fn(), clearInterval: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn()
    });
    vi.stubGlobal("document", {
      visibilityState: "visible", querySelector, activeElement: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn()
    });
  });

  afterEach(() => { cleanup?.(); vi.unstubAllGlobals(); });

  async function start(version: string) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ version })));
    AppVersionUpdater();
    cleanup = effect.run!();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  it("reloads when a different version is deployed", async () => {
    await start(`${APP_VERSION}-new`);
    expect(reload).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith("/api/version", expect.objectContaining({ cache: "no-store" }));
  });

  it("keeps the page when the version matches", async () => {
    await start(APP_VERSION);
    expect(reload).not.toHaveBeenCalled();
  });

  it("waits while a dialog or operation is open", async () => {
    querySelector.mockReturnValue({});
    await start(`${APP_VERSION}-new`);
    expect(reload).not.toHaveBeenCalled();
  });

  it("waits while the user edits a field", async () => {
    Object.defineProperty(document, "activeElement", { value: { matches: () => true } });
    await start(`${APP_VERSION}-new`);
    expect(reload).not.toHaveBeenCalled();
  });
});
