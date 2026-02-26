import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Quiz from "./Quiz";

const QUESTIONS = [
  { id: "q1", question: "What is Claude?", choices: ["An AI", "A tool", "A game", "A car"], answerIndex: 0, explanation: "Claude is an AI." },
  { id: "q2", question: "Who made Claude?", choices: ["OpenAI", "Anthropic", "Google", "Meta"], answerIndex: 1, explanation: "Anthropic made Claude." },
];

describe("Quiz", () => {
  it("renders all questions and their choices", () => {
    render(<Quiz questions={QUESTIONS} />);
    expect(screen.getByText("1. What is Claude?")).toBeInTheDocument();
    expect(screen.getByText("2. Who made Claude?")).toBeInTheDocument();
    expect(screen.getByText("An AI")).toBeInTheDocument();
    expect(screen.getByText("Anthropic")).toBeInTheDocument();
  });

  it("shows submit button as disabled when no answers selected", () => {
    render(<Quiz questions={QUESTIONS} />);
    expect(screen.getByRole("button", { name: /answer all 2 questions/i })).toBeDisabled();
  });

  it("shows submit button as disabled until ALL questions answered", async () => {
    render(<Quiz questions={QUESTIONS} />);
    // Answer only q1
    await userEvent.click(screen.getByText("An AI"));
    expect(screen.getByRole("button", { name: /answer all 2 questions/i })).toBeDisabled();
  });

  it("enables submit once all questions are answered", async () => {
    render(<Quiz questions={QUESTIONS} />);
    await userEvent.click(screen.getByText("An AI"));
    await userEvent.click(screen.getByText("Anthropic"));
    expect(screen.getByRole("button", { name: /submit quiz/i })).not.toBeDisabled();
  });

  it("shows correct/incorrect feedback and explanations after submitting", async () => {
    render(<Quiz questions={QUESTIONS} />);
    await userEvent.click(screen.getByText("An AI"));      // correct for q1
    await userEvent.click(screen.getByText("Anthropic"));  // correct for q2
    await userEvent.click(screen.getByRole("button", { name: /submit quiz/i }));

    expect(screen.getAllByText("✓ Correct").length).toBeGreaterThan(0);
    expect(screen.getByText("Claude is an AI.")).toBeInTheDocument();
    expect(screen.getByText("Anthropic made Claude.")).toBeInTheDocument();
  });

  it("shows score after submitting", async () => {
    render(<Quiz questions={QUESTIONS} />);
    await userEvent.click(screen.getByText("An AI"));
    await userEvent.click(screen.getByText("Anthropic"));
    await userEvent.click(screen.getByRole("button", { name: /submit quiz/i }));
    expect(screen.getByText(/Score:/i)).toBeInTheDocument();
  });

  it("calls onComplete with result when submitted", async () => {
    const onComplete = jest.fn();
    render(<Quiz questions={QUESTIONS} onComplete={onComplete} />);
    await userEvent.click(screen.getByText("An AI"));
    await userEvent.click(screen.getByText("Anthropic"));
    await userEvent.click(screen.getByRole("button", { name: /submit quiz/i }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ totalQuestions: 2, correctAnswers: 2 })
    );
  });

  it("retry resets quiz state", async () => {
    render(<Quiz questions={QUESTIONS} />);
    await userEvent.click(screen.getByText("An AI"));
    await userEvent.click(screen.getByText("Anthropic"));
    await userEvent.click(screen.getByRole("button", { name: /submit quiz/i }));

    await userEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(screen.getByRole("button", { name: /answer all 2 questions/i })).toBeDisabled();
    expect(screen.queryByText("Claude is an AI.")).not.toBeInTheDocument();
  });

  it("shows +15 pts label on first attempt correct answers", async () => {
    render(<Quiz questions={QUESTIONS} isFirstAttempt={true} />);
    await userEvent.click(screen.getByText("An AI"));
    await userEvent.click(screen.getByText("Anthropic"));
    await userEvent.click(screen.getByRole("button", { name: /submit quiz/i }));
    expect(screen.getAllByText("+15 pts")).toHaveLength(2);
  });

  it("shows +10 pts label on subsequent attempts (no first-try bonus)", async () => {
    render(<Quiz questions={QUESTIONS} isFirstAttempt={false} />);
    await userEvent.click(screen.getByText("An AI"));
    await userEvent.click(screen.getByText("Anthropic"));
    await userEvent.click(screen.getByRole("button", { name: /submit quiz/i }));
    expect(screen.queryByText("+15 pts")).not.toBeInTheDocument();
    expect(screen.getAllByText("+10 pts")).toHaveLength(2);
  });

  it("shows 0 pts for incorrect answers", async () => {
    render(<Quiz questions={QUESTIONS} />);
    await userEvent.click(screen.getByText("A tool"));     // wrong for q1
    await userEvent.click(screen.getByText("Anthropic"));  // correct for q2
    await userEvent.click(screen.getByRole("button", { name: /submit quiz/i }));
    expect(screen.getByText("0 pts")).toBeInTheDocument();
  });

  it("prevents changing answer after submission", async () => {
    render(<Quiz questions={QUESTIONS} />);
    await userEvent.click(screen.getByText("An AI"));
    await userEvent.click(screen.getByText("Anthropic"));
    await userEvent.click(screen.getByRole("button", { name: /submit quiz/i }));

    // Buttons are disabled after submit
    const choiceBtn = screen.getByRole("button", { name: /A tool/ });
    expect(choiceBtn).toBeDisabled();
  });
});
