export function logAccountLoadError(scope: string, error: unknown) {
  const errorName = error instanceof Error && error.name ? error.name : "UnknownError";
  console.error(`ColdPower: ${scope}`, { errorName });
}
