import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/lib/i18n/dictionaries/en";

const ask = vi.hoisted(() => vi.fn());
vi.mock("@/app/trip/[id]/copilot/actions", () => ({ askCopilot: ask }));
vi.stubGlobal("React", React);

const { getConversation, resetConversation, sendMessage } = await import("@/components/copilot/copilot-store");
const { CopilotComposer } = await import("@/components/copilot/copilot-composer");

const fallback = { generic: "generic", offline: "offline" };

beforeEach(() => {
  ask.mockReset();
  resetConversation("t1");
  resetConversation("t2");
});

describe("copilot conversation store", () => {
  it("keeps one conversation per trip, shared by every entry point", async () => {
    ask.mockResolvedValue({ reply: "On track.", toolsUsed: ["getBudgetForecast"] });
    await sendMessage("t1", "How are we doing?", fallback);
    expect(getConversation("t1").messages.map((m) => m.content)).toEqual(["How are we doing?", "On track."]);
    expect(getConversation("t1").messages[1].toolsUsed).toEqual(["getBudgetForecast"]);
    expect(getConversation("t2").messages).toEqual([]);
  });

  it("sends earlier turns as history, but never earlier error messages", async () => {
    ask.mockResolvedValueOnce({ error: "Assistant temporarily unavailable." });
    await sendMessage("t1", "first", fallback);
    ask.mockResolvedValueOnce({ reply: "ok", toolsUsed: [] });
    await sendMessage("t1", "second", fallback);
    expect(ask.mock.calls[1][1]).toEqual({ history: [{ role: "user", content: "first" }], message: "second" });
  });

  it("ignores a second send while an answer is on its way (no double submit)", async () => {
    let resolve!: (v: unknown) => void;
    ask.mockReturnValue(new Promise((r) => (resolve = r)));
    const first = sendMessage("t1", "one", fallback);
    await sendMessage("t1", "two", fallback);
    resolve({ reply: "done", toolsUsed: [] });
    await first;
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it("shows the offline message when the request never reaches the server", async () => {
    ask.mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("navigator", { onLine: false });
    await sendMessage("t1", "hi", fallback);
    expect(getConversation("t1").messages[1]).toMatchObject({ content: "offline", error: true });
    expect(getConversation("t1").pending).toBe(false);
  });

  it("New chat clears the trip's conversation", async () => {
    ask.mockResolvedValue({ reply: "x", toolsUsed: [] });
    await sendMessage("t1", "hi", fallback);
    resetConversation("t1");
    expect(getConversation("t1").messages).toEqual([]);
  });
});

describe("CopilotComposer", () => {
  it("uses 16px text, so iOS Safari doesn't zoom the page when it's focused", () => {
    const html = renderToStaticMarkup(
      createElement(CopilotComposer, { dict: en.ai, disabled: false, onSend: () => {} }),
    );
    expect(html).toMatch(/<textarea[^>]*class="[^"]*\btext-base\b/);
    expect(html).not.toMatch(/<textarea[^>]*autofocus/i);
  });
});
