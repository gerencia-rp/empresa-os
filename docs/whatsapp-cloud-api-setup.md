# 🚀 Guía completa: WhatsApp Cloud API (Meta) — paso a paso

Esta guía te lleva de cero a tener envío 100% automático de WhatsApp desde Empresa OS sin abrir pestañas. **Tiempo total: ~45 minutos**.

**Costo:** Gratis los primeros 1000 mensajes/mes. Después ~$0.005-$0.015/mensaje según país. Para Rental Profitss con ~40 estudiantes, vas a quedar en el tier gratis.

---

## ⚠️ Pre-requisitos

- Un **número de WhatsApp dedicado** (puede ser un número virtual de Google Voice, Twilio, o uno físico). **No uses tu número personal** — Meta lo va a "asignar" a la app y no podrás usarlo en WhatsApp normal.
- Una **cuenta Facebook personal** (usaremos esa para entrar a Meta Business)
- Acceso a la **terminal** de tu Mac

---

## Paso 1 · Crear Meta Business Account (5 min)

1. Andá a **https://business.facebook.com**
2. Click **"Crear cuenta"**
3. Llená:
   - Nombre del negocio: `Rental Profitss`
   - Tu nombre y email empresarial: `gerencia@rentalprofitss.com`
4. Confirma el email cuando llegue

✅ **Ya tenés Business Manager**

---

## Paso 2 · Crear app de Meta Developers (5 min)

1. Andá a **https://developers.facebook.com/apps**
2. Click **"Create App"** (arriba derecha)
3. Tipo de uso: **"Business"** → Next
4. Detalles:
   - Display name: `Empresa OS WhatsApp`
   - Contact email: `gerencia@rentalprofitss.com`
   - Business Account: seleccioná la que creaste en paso 1
5. Click **"Create app"**

✅ **App creada**

---

## Paso 3 · Agregar producto WhatsApp (2 min)

1. En el dashboard de la app, scrollea hasta **"Add products to your app"**
2. Buscá **WhatsApp** → click **"Set up"**
3. Te lleva a la pantalla de WhatsApp dentro de tu app

✅ **WhatsApp habilitado en la app**

---

## Paso 4 · Conseguir tus credenciales de prueba (3 min)

En la pantalla **WhatsApp > API Setup** vas a ver:

### 🔑 Temporary access token (24 horas)
- Texto largo que empieza con `EAAxxxxxxxxx...`
- **Copialo** — lo vas a usar enseguida para probar

### 📱 Phone number ID
- Un número de 15 dígitos
- **Copialo**

### 🧪 Número de prueba (Meta te da uno gratis)
- Algo como `+1 555-XXX-XXXX`
- Este número manda mensajes en nombre de tu app **gratis**
- Solo puede mandar a números pre-aprobados (5 max, vos los agregás en la sección "To")

⚠️ Para producción vas a querer **conectar tu propio número** en el Paso 7. Pero primero probemos.

---

## Paso 5 · Probar el envío manual desde Meta (2 min)

En la misma pantalla **API Setup**:

1. **"To"** → agregá tu propio número personal con código país (ej. `+15551234567`)
2. Vas a recibir un código de 6 dígitos en WhatsApp — ingresalo
3. Tu número queda como "destinatario de prueba"
4. Scrolleá hasta **"Send messages with the API"**
5. Verás un comando `curl` listo para copiar — abrí terminal y pegalo
6. Vas a recibir un mensaje "Hello World" en tu WhatsApp ✅

✅ **Si recibiste el mensaje, tu Cloud API funciona.**

---

## Paso 6 · Guardar credenciales en Supabase (5 min)

Abrí terminal en la carpeta del proyecto:

```bash
cd "/Users/nicolara/Desktop/CLAUDE CODE/empresa-os"
```

Si nunca usaste `supabase` CLI:

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref <tu-project-ref>
```

(Tu `project-ref` está en la URL de tu dashboard Supabase: `https://supabase.com/dashboard/project/XXXXXX`)

Ahora guardá los secretos:

```bash
supabase secrets set META_WHATSAPP_PHONE_ID="EL_PHONE_ID_DEL_PASO_4"
supabase secrets set META_WHATSAPP_TOKEN="EL_TOKEN_TEMPORARY_DEL_PASO_4"
```

✅ **Credenciales guardadas**

---

## Paso 7 · Deploy de la edge function (1 min)

```bash
supabase functions deploy edu-whatsapp-send-cloud --no-verify-jwt
```

Vas a ver:

```
Deploying edu-whatsapp-send-cloud (project ref: XXXXXX)
...
Deployed Functions on project XXXXXX: edu-whatsapp-send-cloud
```

✅ **Edge function deployada**

---

## Paso 8 · Primer envío real desde Empresa OS (1 min)

1. Abrí Empresa OS → Educación → WhatsApp Masivo
2. Click el botón verde **"📤 Empezar"** (Modo rápido)
3. Elegí plantilla
4. Click **🧪 Crear 1 mensaje de prueba** (con tu número en el modo prueba)
5. En la lista que aparece, click el botón **🚀 Enviar todos** del hero azul
6. Confirmá

Vas a recibir el mensaje **directo en tu WhatsApp** sin abrir ninguna pestaña ✅

✅ **YA ESTÁ LISTO PARA ENVÍO MASIVO AUTOMÁTICO**

---

## Paso 9 (opcional) · Token permanente

El token temporary vence en **24 horas**. Para producción:

1. En la app Meta Developers → **App settings > Basic** → copiá tu App Secret
2. Andá a **App roles > System users** en Business Manager
3. Crear un System User → **"Generate token"**
4. Permisos: `whatsapp_business_messaging`, `whatsapp_business_management`
5. Expira en: **Never** ✅
6. Copialo y actualizá el secret en Supabase:

```bash
supabase secrets set META_WHATSAPP_TOKEN="EL_TOKEN_PERMANENTE"
```

✅ **Token permanente activo**

---

## Paso 10 (opcional) · Tu propio número de WhatsApp

Hasta ahora usás el número de prueba que te dio Meta. Para usar **tu propio número**:

1. En Meta WhatsApp Manager → **"Phone Numbers"** → **"Add phone number"**
2. Ingresá el número que querés usar (Google Voice, Twilio número virtual, o uno físico)
3. Verificación por SMS o call
4. Una vez verificado → copia el nuevo **Phone Number ID**
5. Actualiza:

```bash
supabase secrets set META_WHATSAPP_PHONE_ID="EL_NUEVO_PHONE_ID"
```

⚠️ **El número que conectás NO se puede usar en WhatsApp normal mientras esté en la API.** Si era tu número de la app móvil, vas a perder acceso a esa cuenta.

---

## Paso 11 (recomendado) · Crear plantillas aprobadas

WhatsApp tiene una regla: si el estudiante **no te escribió en las últimas 24h**, solo podés mandarle mensajes a través de **plantillas aprobadas por Meta**.

Para tu caso (seguimiento semanal a inactivos), **vas a necesitar plantillas**.

### Cómo crear una plantilla:

1. En Meta Business Manager → **WhatsApp Manager** → **"Message Templates"**
2. Click **"Create Template"**
3. Categoría: **"Utility"** (para recordatorios, seguimiento)
4. Idioma: **Spanish**
5. Nombre: `seguimiento_semanal` (este es el que pondrás en el secret)
6. Body (con variables `{{1}}`, `{{2}}`):

```
Hola {{1}}, te escribo para hacer seguimiento de tu plan en {{2}}.

{{3}}

¿Cómo vas? Cualquier duda, decime.
```

7. Submit → aprobación tarda **1-24 horas** (es manual de Meta)

Una vez aprobada:

```bash
supabase secrets set META_WHATSAPP_TEMPLATE_NAME="seguimiento_semanal"
supabase functions deploy edu-whatsapp-send-cloud --no-verify-jwt
```

✅ **Ahora podés mandar mensajes "fríos" sin restricción de 24h**

---

## 🚨 Troubleshooting

### "needs_setup: missing_credentials"
- Asegurate de haber corrido `supabase secrets set` con ambos PHONE_ID y TOKEN
- Re-deployar después: `supabase functions deploy edu-whatsapp-send-cloud`

### "needs_setup: function_not_deployed"
- Correr: `supabase functions deploy edu-whatsapp-send-cloud --no-verify-jwt`

### "Recipient phone number not in allowed list"
- El número destinatario no está pre-aprobado en el sandbox de Meta
- En API Setup → "To" agregá los números que querés probar (max 5)
- En producción con tu número propio + template aprobada, esto desaparece

### "Token expired"
- Tu token temporary venció a las 24h → seguí el Paso 9 para crear token permanente

### "Template not found"
- La template `META_WHATSAPP_TEMPLATE_NAME` que pusiste no existe o no está aprobada todavía
- Andá a Meta WhatsApp Manager → Message Templates y validá el status

### Mensajes no se envían pero el dashboard dice "sent"
- Mirá los logs: `supabase functions logs edu-whatsapp-send-cloud`
- Probablemente errores de Meta en el response — la respuesta de Meta dice OK pero el mensaje no llega

---

## 💰 Costos reales

Meta facturación 2024-2026 para conversaciones **Utility/Marketing** (la mayoría de tus seguimientos):

- **USA / Canadá:** $0.0085 por mensaje
- **México:** $0.0398 por mensaje (más caro porque hay regulación específica)
- **Resto LATAM:** $0.015 promedio

**Para 40 estudiantes/semana × 4 semanas = 160 mensajes/mes:**
- USA: $1.36/mes
- México: $6.37/mes

Y los primeros 1000 mensajes de cada categoría son **gratis** cada mes por tier de Meta. Así que probablemente **no pagás nada** hasta llegar a ese volumen.

---

## ¿Y si esto es muy complicado?

Si no querés meterte con Meta directo, opciones:

1. **Twilio** — 10 min de setup, ~$0.005/mensaje desde el inicio (sin tier gratis pero más fácil). [twilio.com/whatsapp](https://www.twilio.com/whatsapp)
2. **Wati** — 0 setup, dashboard amigable, ~$50/mes plan básico. [wati.io](https://www.wati.io/)
3. **Seguir con wa.me manual** — gratis pero requiere abrir pestañas

Decime cuál preferís y armamos esa integración.
