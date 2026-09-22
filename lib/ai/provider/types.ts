/** A model-requested call to one of our tools — arguments arrive as a raw
 * JSON string, exactly as the model wrote it, and must be parsed and
 * validated by the caller before ever being used (see lib/ai/tools). */
export type ToolCall = { id: string; name: string; arguments: string };

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; toolCalls?: ToolCall[] }
  | { role: "tool"; toolCallId: string; content: string };

/** A JSON-Schema object describing one tool's parameters. */
export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type ChatResult = { content: string | null; toolCalls: ToolCall[] };

export type ChatOptions = {
  tools?: ToolDefinition[];
  /** Forces valid JSON output — used for single-shot structured tasks (the
   * budget planner, insight explanations) that make no tool calls. */
  jsonResponse?: boolean;
  temperature?: number;
};

/**
 * Abstraction over chat-completion LLM providers. Keeping this behind an
 * interface — rather than calling Groq's API directly from the planner/
 * copilot/insights code — is what makes Groq a swappable implementation
 * instead of something baked into the rest of the app. Mirrors
 * receipt-service's app/llm/provider.py.
 */
export interface AIProvider {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult>;
}
