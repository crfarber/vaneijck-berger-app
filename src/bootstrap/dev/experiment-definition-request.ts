/** Same path as `ENDPOINT_PATH` in `read-experiment-definitions.cjs`. */
export const EXPERIMENT_DEFINITIONS_PATH = '/experiment-service-definitions';

/** Metro bundle URL with the experiment-definition route, without the bundle query. */
export function experimentDefinitionsUrl(scriptUrl: string): string {
  const url = new URL(scriptUrl);
  url.pathname = EXPERIMENT_DEFINITIONS_PATH;
  url.search = '';
  url.hash = '';
  return url.toString();
}

export async function fetchExperimentServiceDefinitions(
  fetchImpl: typeof fetch,
  scriptUrl: string,
): Promise<readonly unknown[]> {
  const response = await fetchImpl(experimentDefinitionsUrl(scriptUrl), {
    headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
  });
  if (!response.ok) {
    throw new Error('Experiment definition reload failed');
  }
  const body: unknown = await response.json();
  if (!isDefinitionPayload(body)) {
    throw new Error('Experiment definition reload failed');
  }
  return body.definitions;
}

function isDefinitionPayload(body: unknown): body is { definitions: unknown[] } {
  return (
    typeof body === 'object' &&
    body !== null &&
    Array.isArray((body as { definitions?: unknown }).definitions)
  );
}
