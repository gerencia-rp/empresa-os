// Shared helper: valida el JWT del request y devuelve el user autenticado.
// Resuelve la vulnerabilidad crítica donde varias funciones confiaban en
// requester_id del body (cualquiera con un UUID de admin podía escalar).
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface AuthResult {
  ok: boolean;
  user_id?: string;
  email?: string;
  role?: string;
  error?: string;
  status?: number;
  service?: boolean;
}

/**
 * Lee el header Authorization, valida el JWT con Supabase y devuelve el user.
 * Si requireAdmin=true, también verifica que profiles.role === 'admin'.
 */
export async function requireAuth(req: Request, opts: { requireAdmin?: boolean } = {}): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return { ok: false, error: "Falta Authorization: Bearer <jwt>", status: 401 };
  }
  const token = authHeader.slice(7).trim();
  if (!token) return { ok: false, error: "Token vacío", status: 401 };

  // Los crons y edge functions internas usan exclusivamente la service key.
  // Reconocerla aquí evita relajar cada endpoint por separado y mantiene un
  // único contrato: service role o usuario real con el rol solicitado.
  if (SERVICE_KEY && token === SERVICE_KEY) {
    return { ok: true, role: "service_role", service: true };
  }

  // Usar anon client + token del user para validar
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, error: "Token inválido o expirado: " + (error?.message || "no user"), status: 401 };
  }

  let role: string | undefined;
  if (opts.requireAdmin) {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: profile } = await admin.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    role = profile?.role;
    if (role !== "admin") {
      return { ok: false, error: "Acción permitida solo para admins", status: 403, user_id: data.user.id };
    }
  }

  return { ok: true, user_id: data.user.id, email: data.user.email || undefined, role };
}
