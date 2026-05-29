// ============================================================
// S5-G9 · Edge Function: Claude IA agente para Remodel Pro
// Proxy a Anthropic con tools que el frontend ejecuta.
//
// Deploy:
//   cd ~/Desktop/CLAUDE\ CODE/empresa-os
//   supabase functions deploy remodel-ai --no-verify-jwt --use-api
//
// Secrets requeridos (set una vez):
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx
//
// Pattern:
//  - Frontend POSTea {messages, project_context, tool_results?}
//  - Edge llama a Claude con tools declarados
//  - Claude responde con texto O con tool_use
//  - Si tool_use: frontend ejecuta la tool y reposta con tool_results
// ============================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization'
};

// Tools que Claude puede invocar (ejecutadas en el frontend)
const TOOLS = [
  {
    name: 'add_activity_to_project',
    description: 'Agrega una actividad del catálogo al proyecto actual con cantidad específica. Usar cuando el usuario pide agregar trabajo o cuando recomendás algo concreto y querés que se aplique.',
    input_schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Activity code del catálogo (ej: 5.4.2, 1.1.3)' },
        qty: { type: 'number', description: 'Cantidad en la unidad de la actividad (ej: 35 para sqft de countertops)' },
        vu_override: { type: 'number', description: 'Precio unitario opcional. Si no se pasa, usa el default del catálogo.' }
      },
      required: ['code', 'qty']
    }
  },
  {
    name: 'update_activity_qty',
    description: 'Modifica la cantidad de una actividad ya agregada al proyecto. Usar cuando el usuario quiere ajustar (ej: "subí los baños a 3").',
    input_schema: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        qty: { type: 'number' }
      },
      required: ['code', 'qty']
    }
  },
  {
    name: 'remove_activity',
    description: 'Saca una actividad del proyecto.',
    input_schema: {
      type: 'object',
      properties: { code: { type: 'string' } },
      required: ['code']
    }
  },
  {
    name: 'suggest_supplier_for_code',
    description: 'Devuelve sugerencia de supplier y precio para un activity_code, consultando la base de suppliers preferidos. Usar para responder "dónde compro X?" o "cuánto sale X?".',
    input_schema: {
      type: 'object',
      properties: { code: { type: 'string' } },
      required: ['code']
    }
  },
  {
    name: 'generate_sow_description',
    description: 'Genera una descripción narrativa profesional del scope del proyecto, lista para incluir en el SOW del lender o en la propuesta cliente.',
    input_schema: {
      type: 'object',
      properties: {
        tone: { type: 'string', enum: ['lender', 'cliente', 'tecnico'], description: 'lender = formal/numérico, cliente = persuasivo/beneficios, tecnico = detallado' }
      },
      required: ['tone']
    }
  }
];

const SYSTEM_PROMPT = `Sos un agente IA especializado en remodelaciones residenciales para Rental Profitss (empresa de fix & flip en Austin TX).

Tenés acceso al estado del proyecto que el usuario está editando (catálogo, actividades, pricing, suppliers, casas calibradoras reales).

REGLAS:
- Respondés en español rioplatense (vos, ché, dale)
- Sos PRÁCTICO y CONCRETO: si sugerís algo, usá tools para aplicarlo en vez de solo describirlo
- Si te preguntan precios, primero usá suggest_supplier_for_code para datos reales
- Cuando agregás actividades, validá que el code exista en el catálogo (te lo pasan en project_context.catalog)
- Usás los benchmarks históricos (5 casas reales: Virginia, Picnic, Idlewood, Arcadia, Ramble) cuando ayuda
- Si el usuario pide cosas que NO tienen sentido (ej: cocina sin pisos antes), avisás
- Pricing: industria 18-25% margen. Si ves márgenes bajos, alertás
- Sé conciso. Sin emojis salvo que el contexto lo pida.`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const body = await req.json();
    const { messages, project_context } = body;
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurado en Supabase secrets' }), {
        status: 500, headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    // Inyectar contexto del proyecto en el primer mensaje del usuario
    const contextStr = JSON.stringify(project_context || {}, null, 2);
    const enrichedMessages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: `<project_context>\n${contextStr}\n</project_context>\n\n` + (messages[0]?.content?.[0]?.text || messages[0]?.content || '') }
        ]
      },
      ...messages.slice(1)
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: enrichedMessages
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: 'Anthropic error: ' + errText }), {
        status: response.status, headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...CORS, 'content-type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }
});
