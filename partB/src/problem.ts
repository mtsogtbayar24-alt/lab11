import { Response } from 'express';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
}

export function sendProblem(response: Response, problem: ProblemDetails): void {
  response
    .status(problem.status)
    .type('application/problem+json')
    .json(problem);
}

export function problem(status: number, title: string, detail: string, instance?: string): ProblemDetails {
  return {
    type: `https://httpstatuses.com/${status}`,
    title,
    status,
    detail,
    instance
  };
}
