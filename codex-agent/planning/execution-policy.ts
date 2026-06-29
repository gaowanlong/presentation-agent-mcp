export class ExecutionPolicy {
  shouldReplan(result: any): boolean {
    if (!result) return false;
    if (result.error) return true;
    if (result.score !== undefined && result.score < 60) return true;
    if (result.issues && result.issues.length > 5) return true;
    return false;
  }
  shouldInjectStep(result: any): boolean {
    if (!result) return false;
    if (result.missing_types && result.missing_types.length > 0) return true;
    return false;
  }
  shouldRetry(step: any, attempts: number): boolean {
    return attempts < (step.retry_policy?.max_retry || 1);
  }
}

