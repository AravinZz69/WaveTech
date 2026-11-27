import { afterEach, describe, expect, it, vi } from "vitest";
import type { GoogleGenAI } from "@google/genai";
import {
  DEFAULT_GEMINI_MODEL,
  FALLBACK_GEMINI_MODEL,
  getGeminiApiKeys,
  getGeminiFailoverTargets,
  isRetryableGeminiError,
  withGeminiFailover,
} from "../lib/ai";

describe("Gemini API key & model failover", () => {
  const origPrimary = process.env.GEMINI_API_KEY;
  const origFallback = process.env.GEMINI_API_KEY_FALLBACK;
  const origAlt = process.env.GEMINI_API_KEY_2;

  afterEach(() => {
    process.env.GEMINI_API_KEY = origPrimary;
    process.env.GEMINI_API_KEY_FALLBACK = origFallback;
    process.env.GEMINI_API_KEY_2 = origAlt;
  });

  it("deduplicates primary and fallback Gemini API keys and builds failover order", () => {
    process.env.GEMINI_API_KEY = "key-one";
    process.env.GEMINI_API_KEY_FALLBACK = "key-two";
    process.env.GEMINI_API_KEY_2 = "key-one";
    expect(getGeminiApiKeys()).toEqual(["key-one", "key-two"]);

    const targets = getGeminiFailoverTargets();
    expect(targets[0]).toEqual({ slot: 1, apiKey: "key-one", model: DEFAULT_GEMINI_MODEL });
    expect(targets[1]).toEqual({ slot: 2, apiKey: "key-two", model: FALLBACK_GEMINI_MODEL });
  });

  it("recognizes high-demand, rate-limit, deprecated model 404, and timeout errors as retryable", () => {
    expect(isRetryableGeminiError(new Error("503 Service Unavailable: high demand"))).toBe(true);
    expect(isRetryableGeminiError(new Error("429 RESOURCE_EXHAUSTED quota exceeded"))).toBe(true);
    expect(isRetryableGeminiError(new Error("404 model no longer available to new users"))).toBe(true);
    expect(isRetryableGeminiError(new Error("Request timed out"))).toBe(true);
    expect(isRetryableGeminiError(new Error("Invalid JSON argument"))).toBe(false);
  });

  it("fails over to the second Gemini key + model when primary goes down with high demand", async () => {
    const primaryOp = vi.fn().mockRejectedValue(new Error("503 Service Unavailable due to high demand"));
    const secondaryOp = vi.fn().mockResolvedValue("ok-from-key-2");

    const client1 = { id: 1 } as unknown as GoogleGenAI;
    const client2 = { id: 2 } as unknown as GoogleGenAI;

    const result = await withGeminiFailover(
      async (client, model, slot) => (slot === 1 ? primaryOp(client, model) : secondaryOp(client, model)),
      [
        { client: client1, model: DEFAULT_GEMINI_MODEL, slot: 1 },
        { client: client2, model: FALLBACK_GEMINI_MODEL, slot: 2 },
      ]
    );

    expect(result).toBe("ok-from-key-2");
    expect(primaryOp).toHaveBeenCalledWith(client1, DEFAULT_GEMINI_MODEL);
    expect(secondaryOp).toHaveBeenCalledWith(client2, FALLBACK_GEMINI_MODEL);
  });
});
