import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineTool, invokeTool, toToolDefinition, ToolError, type ToolContext } from "@/lib/ai/tools/types";

const echoTool = defineTool({
  name: "echo",
  description: "Echoes a bounded number back.",
  inputSchema: z.object({ value: z.number().int().min(0).max(100) }),
  async run(_ctx, input) {
    return { value: input.value };
  },
});

const ctx = {} as ToolContext;

describe("invokeTool", () => {
  it("parses valid JSON arguments and runs the tool", async () => {
    expect(await invokeTool(echoTool, ctx, '{"value": 42}')).toEqual({ value: 42 });
  });

  it("rejects arguments that aren't valid JSON, before ever calling run()", async () => {
    await expect(invokeTool(echoTool, ctx, "{not json")).rejects.toBeInstanceOf(ToolError);
  });

  it("rejects arguments that fail the tool's own schema (model-supplied input is untrusted)", async () => {
    const error = await invokeTool(echoTool, ctx, '{"value": 999}').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ToolError);
    expect((error as ToolError).code).toBe("invalid_input");
  });

  it("rejects a wrong-typed argument rather than coercing it", async () => {
    await expect(invokeTool(echoTool, ctx, '{"value": "forty-two"}')).rejects.toBeInstanceOf(
      ToolError,
    );
  });

  it("treats empty arguments as an empty object", async () => {
    const optionalTool = defineTool({
      name: "noop",
      description: "Takes nothing.",
      inputSchema: z.object({}),
      async run() {
        return { ok: true };
      },
    });
    expect(await invokeTool(optionalTool, ctx, "")).toEqual({ ok: true });
  });
});

describe("toToolDefinition", () => {
  it("derives a JSON Schema from the tool's own Zod schema", () => {
    const definition = toToolDefinition(echoTool);
    expect(definition.name).toBe("echo");
    expect(definition.parameters).toMatchObject({
      type: "object",
      properties: { value: { type: "integer", minimum: 0, maximum: 100 } },
    });
  });
});
