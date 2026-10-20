import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildChatAgentModel,
  getChatAgentModel,
  MINIMAX_FLASH_PROFILE,
  MINIMAX_M3_PROFILE,
  resolveChatAgentConfig,
} from "./openrouter";

vi.mock("cloudflare:workers", () => ({ env: {} }));

const transport = vi.fn<typeof fetch>();
const prompt = [
  {
    role: "user" as const,
    content: [{ type: "text" as const, text: "Hello" }],
  },
];

beforeEach(() => {
  for (const name of [
    "MINIMAX_API_KEY",
    "MINIMAX_REGION",
    "MINIMAX_API_FORMAT",
    "MINIMAX_MODEL",
    "MINIMAX_THINKING",
    "MINIMAX_REASONING_EFFORT",
    "OPENROUTER_API_KEY",
    "OPENROUTER_MODEL",
  ])
    vi.stubEnv(name, "");
  transport.mockReset();
  transport.mockRejectedValue(new Error("offline request captured"));
  vi.stubGlobal("fetch", transport);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function request() {
  expect(transport).toHaveBeenCalledTimes(1);
  const [url, options] = transport.mock.calls[0];
  return { url: String(url), body: JSON.parse(String(options?.body)) };
}

function configured(env: Record<string, string>) {
  const config = resolveChatAgentConfig({
    MINIMAX_API_KEY: "test-key",
    ...env,
  });
  if (!config) throw new Error("Expected a configured model");
  return buildChatAgentModel(config);
}

describe("chat configuration", () => {
  it("uses Flash with adaptive thinking and max effort by default", () => {
    expect(resolveChatAgentConfig({ MINIMAX_API_KEY: "test-key" })).toEqual({
      kind: "minimax",
      apiKey: "test-key",
      region: "global",
      apiFormat: "anthropic",
      modelId: "MiniMax-M3.1-Flash",
      thinking: "adaptive",
      effort: "max",
    });
  });

  it.each([
    { MINIMAX_REGION: "unsupported" },
    { MINIMAX_API_FORMAT: "unsupported" },
    { MINIMAX_THINKING: "disabled" },
    { MINIMAX_REASONING_EFFORT: "none" },
  ])("rejects invalid Flash settings %j", (settings) => {
    expect(() =>
      resolveChatAgentConfig({ MINIMAX_API_KEY: "test-key", ...settings }),
    ).toThrow();
  });

  it("reports missing keys without creating a model", () => {
    expect(resolveChatAgentConfig({})).toBeNull();
  });

  it("publishes direct API metadata separately from gateway defaults", () => {
    expect(MINIMAX_FLASH_PROFILE).toMatchObject({
      modelId: "MiniMax-M3.1-Flash",
      contextWindow: 1_000_000,
      maxOutputTokens: 524_288,
      thinkingModes: ["adaptive"],
      inputModalities: ["text", "image", "video"],
      pricingUsdPerMillionTokens: {
        input: 0.15,
        output: 0.6,
        cacheRead: 0.015,
        cacheWrite: null,
      },
    });
    expect(MINIMAX_M3_PROFILE.pricingUsdPerMillionTokens).toEqual({
      input: 0.3,
      output: 1.2,
      cacheRead: 0.06,
      cacheWrite: null,
      above512k: { input: 0.6, output: 2.4, cacheRead: 0.12 },
      priorityMultiplier: 1.5,
    });
  });
});

describe.each(["global", "cn"])("serialized %s requests", (region) => {
  describe.each(["openai", "anthropic"])("%s SDK", (apiFormat) => {
    it("sends the default Flash request to the selected endpoint", async () => {
      const model = configured({
        MINIMAX_REGION: region,
        MINIMAX_API_FORMAT: apiFormat,
      });
      await expect(model.doGenerate({ prompt })).rejects.toThrow(
        "offline request captured",
      );
      const { url, body } = request();
      const host = region === "cn" ? "api.minimaxi.com" : "api.minimax.io";
      expect(url).toBe(
        `https://${host}/${apiFormat === "openai" ? "v1/chat/completions" : "anthropic/v1/messages"}`,
      );
      expect(body.model).toBe("MiniMax-M3.1-Flash");
      expect(body.thinking).toEqual({ type: "adaptive" });
      expect(
        apiFormat === "openai"
          ? body.reasoning_effort
          : body.output_config?.effort,
      ).toBe("max");
      expect(body.service_tier).toBeUndefined();
      if (apiFormat === "openai") expect(body.reasoning_split).toBe(true);
    });

    it("uses M3's protocol-specific thinking default", async () => {
      const model = configured({
        MINIMAX_REGION: region,
        MINIMAX_API_FORMAT: apiFormat,
        MINIMAX_MODEL: "MiniMax-M3",
      });
      await expect(model.doGenerate({ prompt })).rejects.toThrow(
        "offline request captured",
      );
      expect(request().body.thinking?.type ?? "disabled").toBe(
        apiFormat === "openai" ? "adaptive" : "disabled",
      );
    });

    it("keeps M3 adaptive thinking without sending Flash effort", async () => {
      const model = configured({
        MINIMAX_REGION: region,
        MINIMAX_API_FORMAT: apiFormat,
        MINIMAX_MODEL: "MiniMax-M3",
        MINIMAX_THINKING: "adaptive",
      });
      await expect(model.doGenerate({ prompt })).rejects.toThrow(
        "offline request captured",
      );
      const { body } = request();
      expect(body.model).toBe("MiniMax-M3");
      expect(body.thinking).toEqual({ type: "adaptive" });
      expect(body.reasoning_effort).toBeUndefined();
      expect(body.output_config?.effort).toBeUndefined();
    });

    it.each(["MiniMax-M3", "MiniMax-M2.7", "custom-model"])(
      "preserves explicit %s and disabled thinking without Flash effort",
      async (modelId) => {
        const model = configured({
          MINIMAX_REGION: region,
          MINIMAX_API_FORMAT: apiFormat,
          MINIMAX_MODEL: modelId,
          MINIMAX_THINKING: "disabled",
          MINIMAX_REASONING_EFFORT: "none",
        });
        await expect(model.doGenerate({ prompt })).rejects.toThrow(
          "offline request captured",
        );
        const { body } = request();
        expect(body.model).toBe(modelId);
        if (apiFormat === "openai") {
          expect(body.thinking).toEqual({ type: "disabled" });
        } else {
          // Omission and an explicit disabled value both mean off in this API.
          expect(body.thinking?.type ?? "disabled").toBe("disabled");
        }
        expect(body.reasoning_effort).toBeUndefined();
        expect(body.output_config?.effort).toBeUndefined();
      },
    );
  });
});

describe.each(["openai", "anthropic"])(
  "%s Flash effort and history",
  (apiFormat) => {
    it.each(["low", "medium", "high", "xhigh", "max"])(
      "serializes %s effort",
      async (effort) => {
        const model = configured({
          MINIMAX_API_FORMAT: apiFormat,
          MINIMAX_REASONING_EFFORT: effort,
        });
        await expect(model.doGenerate({ prompt })).rejects.toThrow(
          "offline request captured",
        );
        const { body } = request();
        expect(
          apiFormat === "openai"
            ? body.reasoning_effort
            : body.output_config?.effort,
        ).toBe(effort);
      },
    );

    it("preserves image and tool history in streaming requests", async () => {
      const model = configured({ MINIMAX_API_FORMAT: apiFormat });
      await expect(
        model.doStream({
          prompt: [
            {
              role: "user",
              content: [
                { type: "text", text: "Inspect this image" },
                {
                  type: "file",
                  data: new URL("https://example.com/image.png"),
                  mediaType: "image/png",
                },
              ],
            },
            {
              role: "assistant",
              content: [
                {
                  type: "reasoning",
                  text: "Inspect the page first",
                  providerOptions: {
                    anthropic: { signature: "test-signature" },
                  },
                },
                {
                  type: "tool-call",
                  toolCallId: "call-1",
                  toolName: "inspect",
                  input: { target: "page" },
                },
              ],
            },
            {
              role: "tool",
              content: [
                {
                  type: "tool-result",
                  toolCallId: "call-1",
                  toolName: "inspect",
                  output: { type: "text", value: "Page inspected" },
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              name: "inspect",
              inputSchema: {
                type: "object",
                properties: { target: { type: "string" } },
              },
            },
          ],
          maxOutputTokens: 2048,
        }),
      ).rejects.toThrow("offline request captured");
      const { body } = request();
      expect(body.stream).toBe(true);
      expect(JSON.stringify(body.messages)).toContain(
        "https://example.com/image.png",
      );
      expect(JSON.stringify(body.messages)).toContain("call-1");
      expect(JSON.stringify(body.messages)).toContain("Page inspected");
      expect(JSON.stringify(body.messages)).toContain("Inspect the page first");
      expect(JSON.stringify(body.tools)).toContain("inspect");
      expect(body.max_tokens).toBe(2048);
    });
  },
);

describe("application entry point", () => {
  it("resolves the async onboarding default through the real SDK", async () => {
    vi.stubEnv("MINIMAX_API_KEY", "test-key");
    const model = await getChatAgentModel();
    await expect(model.doGenerate({ prompt })).rejects.toThrow(
      "offline request captured",
    );
    expect(request().body.model).toBe("MiniMax-M3.1-Flash");
  });

  it.each([
    undefined,
    "minimax/minimax-m3",
    "minimax/minimax-m2.7",
    "custom/model",
  ])("preserves routed override %s", async (override) => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    if (override) vi.stubEnv("OPENROUTER_MODEL", override);
    const model = await getChatAgentModel();
    await expect(model.doGenerate({ prompt })).rejects.toThrow(
      "offline request captured",
    );
    const { url, body } = request();
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(body.model).toBe(override ?? "minimax/minimax-m3");
    expect(body.provider).toMatchObject({ zdr: true, allow_fallbacks: true });
    expect(body.thinking).toBeUndefined();
    expect(body.reasoning_effort).toBeUndefined();
    expect(body.usage).toEqual({ include: true });
  });
});
