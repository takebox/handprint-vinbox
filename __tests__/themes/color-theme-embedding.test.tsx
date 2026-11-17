import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { AgentServerUIRoot } from "#/components/providers/agent-server-ui-root";

it("does not apply a stored Vinbox preference to an uninitialized library root", () => {
  localStorage.setItem("handprint-color-theme", "light-plus");
  try {
    render(
      <AgentServerUIRoot data-testid="embedded">
        Embedded Vinbox
      </AgentServerUIRoot>,
    );
    expect(screen.getByTestId("embedded").firstElementChild).toHaveAttribute(
      "data-theme",
      "dark",
    );
  } finally {
    localStorage.removeItem("handprint-color-theme");
  }
});
