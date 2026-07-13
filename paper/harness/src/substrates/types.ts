/**
 * A grounding substrate = what the agent gets to know about the shared
 * session, and how it acts. The three implementations are the paper's
 * independent variable; the runner treats them identically.
 */
export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface Substrate {
  readonly name: 'map' | 'flat' | 'perception';
  /** System-prompt fragment describing THIS substrate's tool contract (fairness rule 2). */
  contract(): string;
  /** The tool array for this turn. map/flat: fixed for the episode. */
  tools(): ToolDef[];
  /** Route one tool_use; the returned string becomes the tool_result body. */
  dispatch(name: string, input: Record<string, unknown>): Promise<string>;
}

/** Let a fired handler settle (the app reports through the tap on a microtask). */
export const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
