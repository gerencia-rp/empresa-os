// Fetch acotado para funciones Vercel. Ninguna dependencia externa puede dejar una
// ejecución esperando indefinidamente. Los reintentos son opt-in y solo deben usarse
// en lecturas idempotentes.
export async function fetchWithTimeout(url, options = {}, timeoutMs = 12000, retries = 0) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const signal = options.signal || AbortSignal.timeout(timeoutMs);
      return await fetch(url, { ...options, signal });
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, attempt) + Math.random() * 100));
    }
  }
  const reason = lastError?.name === 'TimeoutError' || lastError?.name === 'AbortError'
    ? `timeout después de ${timeoutMs}ms`
    : (lastError?.message || String(lastError));
  throw new Error(`Dependencia no disponible: ${reason}`, { cause: lastError });
}

