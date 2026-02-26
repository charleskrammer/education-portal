import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NavBar from "./NavBar";
import { useAuth } from "../auth/AuthProvider";

jest.mock("../auth/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  usePathname: jest.fn().mockReturnValue("/dashboard"),
}));

jest.mock("next/link", () => {
  const Link = ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

const mockUseAuth = useAuth as jest.Mock;

afterEach(() => jest.clearAllMocks());

describe("NavBar", () => {
  it("renders Log in link when no user is logged in", () => {
    mockUseAuth.mockReturnValue({ user: null, logout: jest.fn() });
    render(<NavBar />);
    expect(screen.getByText("Log in")).toBeInTheDocument();
    expect(screen.queryByText("Log out")).not.toBeInTheDocument();
  });

  it("renders user name and role when logged in", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "alex", internalId: "c1", name: "Alex Johnson", role: "learner", teamId: "alpha" },
      logout: jest.fn(),
    });
    render(<NavBar />);
    expect(screen.getByText(/Alex Johnson/)).toBeInTheDocument();
    expect(screen.getByText(/learner/)).toBeInTheDocument();
    expect(screen.getByText("Log out")).toBeInTheDocument();
  });

  it("shows navigation links for authenticated learner", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "alex", internalId: "c1", name: "Alex", role: "learner", teamId: "alpha" },
      logout: jest.fn(),
    });
    render(<NavBar />);
    expect(screen.getByText("My Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Learning path")).toBeInTheDocument();
    expect(screen.queryByText("Manager's Dashboard")).not.toBeInTheDocument();
  });

  it("shows Manager's Dashboard link only for manager role", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "sara", internalId: "c2", name: "Sara", role: "manager", teamId: "alpha" },
      logout: jest.fn(),
    });
    render(<NavBar />);
    expect(screen.getByText("Manager's Dashboard")).toBeInTheDocument();
  });

  it("calls logout when Log out button is clicked", async () => {
    const mockLogout = jest.fn();
    mockUseAuth.mockReturnValue({
      user: { id: "alex", internalId: "c1", name: "Alex", role: "learner", teamId: "alpha" },
      logout: mockLogout,
    });
    render(<NavBar />);
    await userEvent.click(screen.getByText("Log out"));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
