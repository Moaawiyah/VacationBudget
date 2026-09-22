import { z } from "zod";
import type { VacationBudgetSDK } from "@/lib/sdk/sdk";
import type { ToolDefinition } from "@/lib/ai/provider";

/** Every tool runs as this signed-in user, through their own request-scoped
 * SDK — the same RLS-backed client every page and Server Action uses. There
 * is no admin/service-role access anywhere in lib/ai. */
export type ToolContext = { sdk: VacationBudgetSDK; userId: string };

export type ToolErrorCode = "not_found" | "forbidden" | "invalid_input";

export class ToolError extends Error {
  constructor(
    readonly code: ToolErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/**
 * One typed, authorization-checked capability. `inputSchema` is the single
 * source of truth for both what the model is told it may pass (converted to
 * JSON Schema for the provider) and what's actually validated before `run`
 * ever executes — model-supplied arguments are untrusted input, parsed the
 * same way a Server Action parses a form.
 */
export type Tool<Input, Output> = {
  name: string;
  description: string;
  inputSchema: z.ZodType<Input>;
  run: (ctx: ToolContext, input: Input) => Promise<Output>;
};

export function defineTool<Input, Output>(tool: Tool<Input, Output>): Tool<Input, Output> {
  return tool;
}

/** The provider-facing shape (JSON Schema derived from the same Zod schema). */
export function toToolDefinition<Input, Output>(tool: Tool<Input, Output>): ToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    parameters: z.toJSONSchema(tool.inputSchema as z.ZodType),
  };
}

/**
 * Parses and validates raw (model-supplied) JSON arguments against the
 * tool's own schema, then runs it. Never trusts the shape or values coming
 * from the model — a malformed or out-of-range argument is rejected here,
 * before any SDK call.
 */
export async function invokeTool<Input, Output>(
  tool: Tool<Input, Output>,
  ctx: ToolContext,
  rawArguments: string,
): Promise<Output> {
  let json: unknown;
  try {
    json = rawArguments.trim() ? JSON.parse(rawArguments) : {};
  } catch {
    throw new ToolError("invalid_input", "Arguments were not valid JSON");
  }
  const parsed = tool.inputSchema.safeParse(json);
  if (!parsed.success) {
    throw new ToolError("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  return tool.run(ctx, parsed.data);
}
