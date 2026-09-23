"use client";

import { useSyncExternalStore } from "react";
import { askCopilot } from "@/app/trip/[id]/copilot/actions";
import type { CopilotTurn } from "@/lib/ai/copilot/orchestrate";

export type CopilotMessage = CopilotTurn & { id: number; error?: boolean; toolsUsed?: string[] };
export type Conversation = { messages: CopilotMessage[]; pending: boolean };

/**
 * One conversation per trip, in this tab's memory only — shared by every
 * "Ask AI" entry point (dashboard, nav) and kept while the panel is closed
 * or the user moves between the trip's pages. Nothing is persisted: a
 * reload starts fresh, and every send is still its own read-only askCopilot.
 */
const EMPTY: Conversation = { messages: [], pending: false };
const conversations = new Map<string, Conversation>();
const listeners = new Set<() => void>();
let nextId = 1;

function read(tripId: string): Conversation {
  return conversations.get(tripId) ?? EMPTY;
}

function write(tripId: string, update: (c: Conversation) => Conversation): void {
  conversations.set(tripId, update(read(tripId)));
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Current snapshot, outside React (tests, event handlers). */
export const getConversation = read;

export function useConversation(tripId: string): Conversation {
  return useSyncExternalStore(subscribe, () => read(tripId), () => EMPTY);
}

export function resetConversation(tripId: string): void {
  if (read(tripId).pending) return;
  write(tripId, () => EMPTY);
}

/**
 * Appends the question, asks the server, appends the answer (or a clear
 * error). Ignored while an answer is already on its way, so a double tap
 * can't send the same question twice.
 */
export async function sendMessage(
  tripId: string,
  text: string,
  fallback: { generic: string; offline: string },
): Promise<void> {
  const question = text.trim();
  const current = read(tripId);
  if (!question || current.pending) return;

  const history: CopilotTurn[] = current.messages
    .filter((m) => !m.error)
    .map(({ role, content }) => ({ role, content }));
  write(tripId, (c) => ({
    pending: true,
    messages: [...c.messages, { id: nextId++, role: "user", content: question }],
  }));

  let reply: CopilotMessage;
  try {
    const result = await askCopilot(tripId, { history, message: question });
    reply =
      "error" in result
        ? { id: nextId++, role: "assistant", content: result.error, error: true }
        : { id: nextId++, role: "assistant", content: result.reply, toolsUsed: result.toolsUsed };
  } catch {
    // The request never reached the server, or its answer never came back.
    const content = navigator.onLine ? fallback.generic : fallback.offline;
    reply = { id: nextId++, role: "assistant", content, error: true };
  }
  write(tripId, (c) => ({ pending: false, messages: [...c.messages, reply] }));
}
