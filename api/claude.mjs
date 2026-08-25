// Proxy serverless para la API de Anthropic.
// La API key vive SOLO en el servidor (variable de entorno ANTHROPIC_API_KEY),
// nunca se expone al navegador. El frontend (viral.js) llama a /api/claude.
//
// Configuración (una sola vez, en Vercel → Project Settings → Environment Variables):
//   ANTHROPIC_API_KEY = sk-ant-...            (obligatorio)
//   VIRAL_PASSWORD     = una-clave-tuya       (opcional, protege el endpoint)
import { fetchWithTimeout } from './_fetch.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'Falta ANTHROPIC_API_KEY en el servidor. Configúrala en Vercel → Settings → Environment Variables y redeploy.' });
    return;
  }
  // Protección opcional por contraseña (solo si VIRAL_PASSWORD está configurada).
  const pass = process.env.VIRAL_PASSWORD;
  if (pass && (req.headers['x-viral-pass'] || '') !== pass) {
    res.status(401).json({ error: 'No autorizado: contraseña de acceso incorrecta o faltante (ponla en ⚙ Ajustes).' });
    return;
  }

  // El cuerpo ya viene parseado por Vercel cuando el content-type es JSON.
  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});

  try {
    const r = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body,
    }, 45000);
    const text = await r.text();
    res.status(r.status).setHeader('content-type', 'application/json');
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: 'Proxy error: ' + e.message });
  }
}
