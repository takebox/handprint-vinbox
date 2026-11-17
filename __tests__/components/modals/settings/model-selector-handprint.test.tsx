import { describe, expect, it, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModelSelector } from "#/components/shared/modals/settings/model-selector";
import type { LLMModel } from "#/api/config-service/config-service.types";
import { server } from "#/mocks/node";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: { ids?: string }) =>
      key === "SETTINGS$HANDPRINT_FREE_MODELS_NOTE"
        ? `Free Handprint models: ${values?.ids}. Other provider endpoints with similar model names may require separate billing.`
        : key,
  }),
}));

// The "Free" badge is DB-driven: the backend model list carries a `free` flag
// per item (the same channel as `verified`). These tests drive the selector
// through the model list rather than the (free-less) local /api/llm channel.
const HANDPRINT_MODELS: LLMModel[] = [
  {
    provider: "handprint",
    name: "haijun-kamsa",
    verified: true,
    free: false,
    default: false,
  },
  {
    provider: "handprint",
    name: "glm-5.2",
    verified: true,
    free: true,
    default: true,
  },
  {
    provider: "handprint",
    name: "deepseek-v4-flash",
    verified: true,
    free: true,
    default: false,
  },
  {
    provider: "handprint",
    name: "minimax-m2.7",
    verified: true,
    free: true,
    default: false,
  },
];

vi.mock("#/hooks/query/use-provider-models", () => ({
  useProviderModels: (provider: string | null) => ({
    data: provider === "handprint" ? HANDPRINT_MODELS : [],
    isLoading: false,
    error: null,
  }),
}));

describe("ModelSelector — Handprint provider display", () => {
  beforeEach(() => {
    // Use "*" prefix to match both relative paths and absolute URLs (e.g.,
    // http://127.0.0.1:8000/api/...) when VITE_BACKEND_BASE_URL is configured.
    server.use(
      http.get("*/api/llm/providers", () =>
        HttpResponse.json({
          providers: ["handprint", "juglow", "openai"],
        }),
      ),
      http.get("*/api/llm/models/verified", () =>
        HttpResponse.json({
          models: {
            handprint: [
              "haijun-kamsa",
              "glm-5.2",
              "deepseek-v4-flash",
              "minimax-m2.7",
            ],
            juglow: ["haijun-kamsa"],
          },
        }),
      ),
      http.get("*/api/llm/models", () => HttpResponse.json({ models: [] })),
    );
  });

  function renderWithQuery(ui: React.ReactElement) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    );
  }

  it("shows Handprint immediately for current handprint/<m> settings", async () => {
    renderWithQuery(<ModelSelector currentModel="handprint/haijun-kamsa" />);

    await waitFor(() => {
      expect(screen.getByLabelText("LLM$PROVIDER")).toHaveValue("Handprint");
    });
  });

  it("makes clear which Handprint models are free", async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <ModelSelector currentModel="handprint/deepseek-v4-flash" />,
    );

    await waitFor(() => {});
    expect(screen.getByTestId("handprint-free-models-note")).toHaveTextContent(
      "handprint/deepseek-v4-flash",
    );
    expect(screen.getByTestId("selected-free-model-badge")).toHaveTextContent(
      "Free",
    );

    await user.click(screen.getByLabelText("LLM$MODEL"));

    // Three DB-flagged free models render a "Free" badge in the dropdown; the
    // selected-model badge adds a fourth occurrence.
    expect(screen.getAllByText("Free")).toHaveLength(4);
    expect(screen.getByLabelText("LLM$MODEL")).toHaveValue("deepseek-v4-flash");

    await user.click(screen.getByRole("option", { name: /deepseek-v4-flash/ }));

    expect(screen.getByLabelText("LLM$MODEL")).toHaveValue("deepseek-v4-flash");
    expect(screen.getByTestId("selected-free-model-badge")).toHaveTextContent(
      "Free",
    );
  });
});
