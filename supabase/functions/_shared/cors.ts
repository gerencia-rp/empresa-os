// CORS centralizado. Restringe Origin a los hosts del proyecto + localhost dev.
// Antes "*" permitía que cualquier site llamara las edge functions con el
// JWT del usuario en el navegador.

// ⚠ 06-ago: faltaba empresa-os-admin.vercel.app — el SEGUNDO proyecto Vercel, donde vive
// el trabajo de ramas (portal de inversionistas). Desde ese dominio el navegador BLOQUEABA
// la respuesta de estas funciones porque volvía Allow-Origin: https://empresa-os.vercel.app.
// Para sumar un dominio nuevo sin tocar código: secret EXTRA_ALLOWED_ORIGINS (separado por comas).
const ALLOWED_ORIGINS = [
  "https://empresa-os.vercel.app",
  "https://empresa-os-admin.vercel.app",
  "https://empresa-os-git-main.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5500",
  "http://localhost:8000",
  ...(Deno.env.get("EXTRA_ALLOWED_ORIGINS") || "").split(",").map(s => s.trim()).filter(Boolean)
];

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "3600",
    "Content-Type": "application/json"
  };
}

export function corsResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(req) });
}
