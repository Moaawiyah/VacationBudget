import { AIError, AIRateLimited, AIRejected, AITimeout, AIUnavailable } from "./errors";
import type { AIProvider, ChatMessage, ChatOptions, ChatResult, ToolCall } from "./types";

// Chat replies are short explanations, not receipts — but still capped, so
// a runaway or injected response has a bounded cost.
const MAX_COMPLETION_TOKENS = 1024;

type GroqMessage = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

function toGroqMessages(messages: ChatMessage[]): GroqMessage[] {
  return messages.map((m) => {
    if (m.role === "assistant") {
      return {
        role: "assistant",
        content: m.content,
        tool_calls: m.toolCalls?.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      };
    }
    if (m.role === "tool") {
      return { role: "tool", content: m.content, tool_call_id: m.toolCallId };
    }
    return { role: m.role, content: m.content };
  });
}

function fromGroqToolCalls(raw: GroqMessage["tool_calls"]): ToolCall[] {
  return (raw ?? []).map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: tc.function.arguments,
  }));
}

/** Groq chat-completions provider (OpenAI-compatible /chat/completions API). */
export class GroqProvider implements AIProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
  ) {
    if (!apiKey) throw new AIRejected("GROQ_API_KEY is not configured");
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: toGroqMessages(messages),
      temperature: options.temperature ?? 0.2,
      max_completion_tokens: MAX_COMPLETION_TOKENS,
    };
    if (options.tools?.length) {
      body.tools = options.tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
      body.tool_choice = "auto";
    }
    if (options.jsonResponse) body.response_format = { type: "json_object" };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new AITimeout(`Groq timed out after ${this.timeoutMs}ms`);
      }
      throw new AIUnavailable(`Groq unreachable: ${(error as Error).message}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) throw await this.errorFor(response);

    const json = (await response.json().catch(() => null)) as {
      choices?: { message?: GroqMessage }[];
    } | null;
    const message = json?.choices?.[0]?.message;
    if (!message) throw new AIUnavailable("Groq response missing completion content");
    return { content: message.content ?? null, toolCalls: fromGroqToolCalls(message.tool_calls) };
  }

  private async errorFor(response: Response): Promise<AIError> {
    const { code, message } = await summarizeError(response);
    const detail = `model=${this.model}: ${response.status} ${code}: ${message}`;
    if (response.status === 429) {
      return new AIRateLimited(detail, retryAfterSeconds(response));
    }
    if (response.status >= 500) return new AIUnavailable(detail);
    return new AIRejected(detail);
  }
}

/** Groq's error code/message only — never the whole body, which for a
 * malformed-generation error includes the model's raw output. */
async function summarizeError(response: Response): Promise<{ code: string; message: string }> {
  try {
    const body = (await response.json()) as { error?: { code?: string; type?: string; message?: string } };
    const error = body.error ?? {};
    return { code: String(error.code ?? error.type ?? "unknown"), message: String(error.message ?? "").slice(0, 300) };
  } catch {
    return { code: "non_json", message: "" };
  }
}

function retryAfterSeconds(response: Response): number | undefined {
  const header = response.headers.get("retry-after");
  const value = header ? Number(header) : NaN;
  return Number.isFinite(value) ? Math.max(0, value) : undefined;
}
