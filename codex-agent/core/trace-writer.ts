import { ExecutionTrace } from "../types/trace.js";
export class TraceWriter {
  private traces: ExecutionTrace[] = [];
  add(t: ExecutionTrace) { this.traces.push(t); }
  getAll(): ExecutionTrace[] { return [...this.traces]; }
  clear() { this.traces = []; }
}
