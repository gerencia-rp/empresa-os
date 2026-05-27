import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const EXTRACTION_PROMPT = `You are an expert reading US residential property appraisal reports (typically URAR Form 1004). Extract structured data from this appraisal PDF and return ONLY valid JSON, no other text or markdown.

Schema (use null for missing fields):
{
  "property_address": "street address only",
  "city": "city",
  "state": "2-letter code",
  "zip": "5-digit",
  "county": "county name",
  "appraised_value": <number, the final opinion of value>,
  "effective_date": "YYYY-MM-DD",
  "gla_sqft": <number, Gross Living Area>,
  "lot_size_sqft": <number, convert acres to sqft if needed (1 acre = 43560 sqft)>,
  "year_built": <number>,
  "bedrooms": <number>,
  "bathrooms": <number, use decimals e.g. 2.5>,
  "garage_spaces": <number>,
  "stories": <number>,
  "condition_rating": "C1"|"C2"|"C3"|"C4"|"C5"|"C6",
  "quality_rating": "Q1"|"Q2"|"Q3"|"Q4"|"Q5"|"Q6",
  "comparables": [
    {"address": "...", "sale_price": <num>, "sale_date": "YYYY-MM-DD", "gla_sqft": <num>, "adjusted_price": <num>, "distance_miles": <num>}
  ],
  "notes": "key observations affecting value: condition, upgrades, location factors, market conditions"
}

Return ONLY the JSON object, no markdown fences.`;

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  let appraisalId: string | undefined;
  try {
    const body = await req.json();
    appraisalId = body.appraisalId;
    if (!appraisalId) throw new Error("appraisalId required");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: appraisal, error: getErr } = await supabase
      .from("appraisals").select("*").eq("id", appraisalId).single();
    if (getErr || !appraisal) throw new Error("Appraisal not found");

    await supabase.from("appraisals").update({ status: "processing" }).eq("id", appraisalId);

    const { data: pdfBlob, error: dlErr } = await supabase.storage
      .from("appraisals").download(appraisal.pdf_path);
    if (dlErr || !pdfBlob) throw new Error("PDF download failed: " + dlErr?.message);

    const buf = await pdfBlob.arrayBuffer();
    // chunked base64 encode to avoid stack overflow on large PDFs
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 32768;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const base64 = btoa(binary);

    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
            { type: "text", text: EXTRACTION_PROMPT }
          ]
        }]
      })
    });

    if (!claudeResp.ok) throw new Error("Claude API: " + await claudeResp.text());

    const claudeData = await claudeResp.json();
    let rawText = claudeData.content[0].text.trim();
    if (rawText.startsWith("```")) rawText = rawText.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "").trim();
    const extracted = JSON.parse(rawText);

    await supabase.from("appraisals").update({
      status: "done",
      processed_at: new Date().toISOString(),
      raw_extracted_data: extracted,
      property_address: extracted.property_address,
      city: extracted.city,
      state: extracted.state,
      zip: extracted.zip,
      county: extracted.county,
      appraised_value: extracted.appraised_value,
      effective_date: extracted.effective_date,
      gla_sqft: extracted.gla_sqft,
      lot_size_sqft: extracted.lot_size_sqft,
      year_built: extracted.year_built,
      bedrooms: extracted.bedrooms,
      bathrooms: extracted.bathrooms,
      garage_spaces: extracted.garage_spaces,
      stories: extracted.stories,
      condition_rating: extracted.condition_rating,
      quality_rating: extracted.quality_rating,
      comparables: extracted.comparables || [],
      notes: extracted.notes
    }).eq("id", appraisalId);

    return new Response(JSON.stringify({ ok: true, extracted }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (appraisalId) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from("appraisals").update({ status: "error", error_message: msg }).eq("id", appraisalId);
      } catch {}
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
