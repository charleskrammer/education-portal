import React from "react";
import { render, screen, act } from "@testing-library/react";
import AuthGate from "./AuthGate";
import { useAuth } from "./AuthProvider";

jest.mock("./AuthProvider", () => ({
  useAuth: jest.fn(),
}));

// jest.mock factories are hoisted before ALL variable declarations in the file
// (including var/const/let), so referencing any outer variable causes a TDZ error.
// The only safe approach is to create all mocks INSIDE the factory itself and
// expose them via the mock module, then import them afterwards.
jest.mock("next/navigation", () => {
  const replace = jest.fn();
  return {
    usePathname: jest.fn(),
    useRouter: jest.fn().mockReturnValue({ replace }),
    // Expose the replace fn so tests can import and assert on it
    __replaceMock: replace,
  };
});

import { usePathname, useRouter } from "next/navigation";

const mockUseAuth = useAuth as jest.Mock;
const mockUsePathname = usePathname as jest.Mock;

// Retrieve the shared replace mock that was created inside the factory
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockReplace = (require("next/navigation") as any).__replaceMock as jest.Mock;

afterEach(() => {
  jest.clearAllMocks();
  mockReplace.mockClear();
});

const Child = () => <div data-testid="child">Protected Content</div>;

describe("AuthGate", () => {
  it("renders children on public route /login regardless of auth state", () => {
    mockUsePathname.mockReturnValue("/login");
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    render(<AuthGate><Child /></AuthGate>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders children on public route / regardless of auth state", () => {
    mockUsePathname.mockReturnValue("/");
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    render(<AuthGate><Child /></AuthGate>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("shows checking session message while loading on protected route", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });
    render(<AuthGate><Child /></AuthGate>);
    expect(screen.getByText(/checking your session/i)).toBeInTheDocument();
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
  });

  it("shows checking session message when not authenticated on protected route", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    render(<AuthGate><Child /></AuthGate>);
    expect(screen.getByText(/checking your session/i)).toBeInTheDocument();
  });

  it("redirects to / when not authenticated and not loading on protected route", async () => {
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    await act(async () => {
      render(<AuthGate><Child /></AuthGate>);
    });
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("does not redirect when still loading", async () => {
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });
    await act(async () => {
      render(<AuthGate><Child /></AuthGate>);
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("renders children when authenticated on protected route", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseAuth.mockReturnValue({
      user: { id: "alex", internalId: "c1", name: "Alex", role: "learner", teamId: "alpha" },
      isLoading: false,
    });
    render(<AuthGate><Child /></AuthGate>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
