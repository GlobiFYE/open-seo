import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  createOpenRouter,
  type LanguageModelV3,
} from "@openrouter/ai-sdk-provider";
import { wrapLanguageModel } from "ai";
import { getEnvValueSync, getOptionalEnvValue } from "@/server/lib/runtime-env";

// OpenRouter model slug used for the in-app chat agents (onboarding + SAM).
// Override with OPENROUTER_MODEL to swap models without a code change.
// Flash's current gateway endpoint is not verified for our ZDR routing policy.
const DEFAULT_CHAT_AGENT_MODEL = "minimax/minimax-m3";
const DEFAULT_MINIMAX_MODEL = "MiniMax-M3.1-Flash";
const MINIMAX_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;

export const MINIMAX_M3_PROFILE = {
  modelId: "MiniMax-M3",
  contextWindow: 1_000_000,
  pricingUsdPerMillionTokens: {
    input: 0.3,
    output: 1.2,
    cacheRead: 0.06,
    cacheWrite: null,
    above512k: { input: 0.6, output: 2.4, cacheRead: 0.12 },
    priorityMultiplier: 1.5,
  },
  inputModalities: ["text", "image", "video"],
  thinkingModes: ["adaptive", "disabled"],
  endpoints: {
    global: {
      openai: "https://api.minimax.io/v1",
      anthropic: "https://api.minimax.io/anthropic",
    },
    cn: {
      openai: "https://api.minimaxi.com/v1",
      anthropic: "https://api.minimaxi.com/anthropic",
    },
  },
} as const;

export const MINIMAX_FLASH_PROFILE = {
  modelId: DEFAULT_MINIMAX_MODEL,
  contextWindow: 1_000_000,
  maxOutputTokens: 524_288,
  pricingUsdPerMillionTokens: {
    input: 0.15,
    output: 0.6,
    cacheRead: 0.015,
    cacheWrite: null,
  },
  inputModalities: ["text", "image", "video"],
  thinkingModes: ["adaptive"],
} as const;

type MiniMaxRegion = keyof typeof MINIMAX_M3_PROFILE.endpoints;
type MiniMaxApiFormat = keyof (typeof MINIMAX_M3_PROFILE.endpoints)["global"];
type MiniMaxThinking = (typeof MINIMAX_M3_PROFILE.thinkingModes)[number];

export type ChatAgentConfig =
  | { kind: "routed"; apiKey: string; modelId: string }
  | {
      kind: "minimax";
      apiKey: string;
      region: MiniMaxRegion;
      apiFormat: MiniMaxApiFormat;
      modelId: string;
      thinking: MiniMaxThinking;
      effort?: (typeof MINIMAX_EFFORTS)[number];
    };

const CHAT_ENV_NAMES = [
  "MINIMAX_API_KEY",
  "MINIMAX_REGION",
  "MINIMAX_API_FORMAT",
  "MINIMAX_THINKING",
  "MINIMAX_MODEL",
  "MINIMAX_REASONING_EFFORT",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODEL",
] as const;

function isChoice<T extends string>(
  value: string,
  values: readonly T[],
): value is T {
  return values.some((candidate) => candidate === value);
}

function choice<T extends string>(
  name: string,
  value: string | undefined,
  values: readonly T[],
  fallback: T,
): T {
  if (!value) return fallback;
  if (isChoice(value, values)) return value;
  throw new Error(`${name} must be one of: ${values.join(", ")}`);
}

export function resolveChatAgentConfig(env: object): ChatAgentConfig | null {
  const read = (name: string) => getEnvValueSync(env, name);
  const minimaxApiKey = read("MINIMAX_API_KEY");
  if (minimaxApiKey) {
    const modelId = read("MINIMAX_MODEL") ?? DEFAULT_MINIMAX_MODEL;
    const apiFormat = choice(
      "MINIMAX_API_FORMAT",
      read("MINIMAX_API_FORMAT"),
      ["anthropic", "openai"],
      "anthropic",
    );
    const thinking = choice(
      "MINIMAX_THINKING",
      read("MINIMAX_THINKING"),
      MINIMAX_M3_PROFILE.thinkingModes,
      modelId === "MiniMax-M3" && apiFormat === "anthropic"
        ? "disabled"
        : "adaptive",
    );
    if (modelId === DEFAULT_MINIMAX_MODEL && thinking === "disabled") {
      throw new Error(
        "MiniMax-M3.1-Flash requires adaptive thinking; select MiniMax-M3 to disable thinking",
      );
    }
    return {
      kind: "minimax",
      apiKey: minimaxApiKey,
      modelId,
      thinking,
      ...(modelId === DEFAULT_MINIMAX_MODEL
        ? {
            effort: choice(
              "MINIMAX_REASONING_EFFORT",
              read("MINIMAX_REASONING_EFFORT"),
              MINIMAX_EFFORTS,
              "max",
            ),
          }
        : {}),
      region: choice(
        "MINIMAX_REGION",
        read("MINIMAX_REGION"),
        ["global", "cn"],
        "global",
      ),
      apiFormat,
    };
  }

  const routedApiKey = read("OPENROUTER_API_KEY");
  if (!routedApiKey) return null;
  return {
    kind: "routed",
    apiKey: routedApiKey,
    modelId: read("OPENROUTER_MODEL") ?? DEFAULT_CHAT_AGENT_MODEL,
  };
}

/**
 * Returns the AI SDK LanguageModel for the chat agents. `usage: { include: true }`
 * turns on OpenRouter usage accounting so each response carries its real USD
 * cost (providerMetadata.openrouter.usage.cost) — which we meter against the
 * shared usage-credit pool. `provider.order` prefers Together, then Atlas
 * Cloud (fp8); `zdr: true` restricts routing to Zero-Data-Retention endpoints
 * (prompts are never retained), which is the actual constraint — it excludes
 * MiniMax first-party without a hand-maintained allowlist. The account also
 * enforces this ("Non-frontier requires ZDR" data policy); the request-level
 * flag is belt-and-braces so the constraint survives a dashboard change.
 * Fallbacks stay on within the ZDR set because pinning providers caused a
 * prod outage (Jul 2026: Together upstream-rate-limited m3 and every chat
 * turn 429'd); as of Jul 2026 the ZDR set for m3 is Together/AtlasCloud/
 * Novita/Parasail at the same price plus Morph at 2x output as a last resort.
 *
 * `reasoning` turns on OpenRouter's reasoning-token channel so the model's
 * chain-of-thought comes back as a separate reasoning stream instead of
 * leaking into the visible answer text (MiniMax M3 otherwise dumps its
 * `<think>` trace inline). `effort: "medium"` is OpenRouter's default —
 * stated explicitly only because the SDK type requires one once the channel
 * is configured.
 */
export async function getChatAgentModel(): Promise<LanguageModelV3> {
  const values = Object.fromEntries(
    await Promise.all(
      CHAT_ENV_NAMES.map(
        async (name) => [name, await getOptionalEnvValue(name)] as const,
      ),
    ),
  );
  const config = resolveChatAgentConfig(values);
  if (!config) throw new Error("A chat provider API key is required");
  return buildChatAgentModel(config);
}

/**
 * Synchronous variant for callers that already hold the env values. Think's
 * `getModel()` hook is sync and runs on every turn, so the SAM agent reads the
 * key/model from its DO env and builds the model here.
 */
export function buildChatAgentModel(config: ChatAgentConfig): LanguageModelV3 {
  if (config.kind === "minimax") {
    if (
      config.modelId === DEFAULT_MINIMAX_MODEL &&
      config.thinking === "disabled"
    ) {
      throw new Error("MiniMax-M3.1-Flash requires adaptive thinking");
    }
    const endpoints = MINIMAX_M3_PROFILE.endpoints[config.region];
    if (config.apiFormat === "openai") {
      return createOpenAICompatible({
        name: "minimax",
        apiKey: config.apiKey,
        baseURL: endpoints.openai,
        includeUsage: true,
        transformRequestBody: (body) => ({
          ...body,
          thinking: { type: config.thinking },
          reasoning_split: true,
          ...(config.modelId === DEFAULT_MINIMAX_MODEL
            ? { reasoning_effort: config.effort ?? "max" }
            : {}),
        }),
      }).chatModel(config.modelId);
    }

    const model = createAnthropic({
      authToken: config.apiKey,
      baseURL: `${endpoints.anthropic}/v1`,
      name: "minimax.anthropic",
    })(config.modelId);
    return wrapLanguageModel({
      model,
      middleware: {
        specificationVersion: "v3",
        transformParams: async ({ params }) => ({
          ...params,
          providerOptions: {
            ...params.providerOptions,
            anthropic: {
              ...params.providerOptions?.anthropic,
              thinking: { type: config.thinking },
              ...(config.modelId === DEFAULT_MINIMAX_MODEL
                ? { effort: config.effort ?? "max" }
                : {}),
              cacheControl: { type: "ephemeral" },
            },
          },
        }),
      },
    });
  }

  return createOpenRouter({ apiKey: config.apiKey })(config.modelId, {
    usage: { include: true },
    reasoning: { effort: "medium" },
    provider: {
      order: ["together", "atlas-cloud/fp8"],
      zdr: true,
      allow_fallbacks: true,
    },
  });
}
