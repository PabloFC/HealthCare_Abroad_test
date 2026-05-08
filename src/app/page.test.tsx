import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("renders the triage form", () => {
    render(<HomePage />);

    expect(screen.getByText("Case Triage Assistant")).toBeInTheDocument();
    expect(screen.getByLabelText("Case ID (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Case note")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /run triage analysis/i }),
    ).toBeInTheDocument();
  });
});
