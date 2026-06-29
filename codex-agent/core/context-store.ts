export class ContextStore {
  private store: Record<string, any> = {};
  set(key: string, val: any) { this.store[key] = val; }
  get(key: string): any { return this.store[key]; }
  clear() { this.store = {}; }
}
