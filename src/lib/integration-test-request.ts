import { apiErrorMessage } from "@/lib/api-error-message";

export async function requestIntegrationTest(integrationKey?: string, fetcher: typeof fetch = fetch) {
  const url = integrationKey ? `/api/admin/configuracion/integraciones/${encodeURIComponent(integrationKey)}/probar` : "/api/admin/configuracion/integraciones/probar";
  let response: Response;
  try { response = await fetcher(url, { method: "POST" }); }
  catch { throw new Error("No se pudo conectar para probar la integración."); }
  const result = await response.json().catch(() => null) as { error?: unknown; errorObject?: unknown } | null;
  if (!response.ok) throw new Error(apiErrorMessage(result?.error, apiErrorMessage(result?.errorObject, "No se pudo probar la integración.")));
  if (!result || typeof result !== "object") throw new Error("La prueba devolvió una respuesta no válida. Vuelve a consultar el estado de la integración.");
}
