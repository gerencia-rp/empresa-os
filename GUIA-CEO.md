# Guía rápida — Empresa OS (para el CEO)

**Dónde entrar:** https://empresa-os.vercel.app (un solo sistema, un solo dominio).
Entrás con tu email `gerencia@rentalprofitss.com` (magic link o contraseña).

---

## El menú de la izquierda — qué es cada cosa (una frase)

| Sección | Para qué sirve |
|---|---|
| **Inicio** | Tu tablero del día: 4 números clave (caja del mes, caja atrapada, ocupación, lo que te deben) + la **Directiva del día** del Cerebro. Empezá acá cada mañana. |
| **Casas** | Todas las propiedades juntas (Rentas + Fix&Flip + Remodelación). Clic en una → su ficha 360°. |
| **Rentas** | Cómo van los alquileres: ocupación, unidades, ingresos e informes. |
| **Remodelación** | Estado de las obras en curso: avance real, atrasos y presupuesto. |
| **Fix & Flip** | Las casas que compramos, arreglamos y vendemos/refinanciamos: valor, deuda y caja atrapada. |
| **Cobros y pagos** | Quién te debe y cuánto (cartera vencida) + recordatorios de cobranza. |
| **Inversionistas** | Portal y panel de los socios: su capital, sus casas y sus distribuciones. |
| **Cerebro (Asistente)** | El botón 🧠 flotante. Preguntale cualquier cosa del negocio en palabras simples. |
| **Decisiones por aprobar** | La cola de cosas que necesitan tu "sí" (cobranzas, obras, propuestas de los agentes). |
| **Reportes** | Números consolidados del holding, contable y operación. |

---

## Cómo usar el Cerebro (el asistente)
1. Tocá el botón **🧠** (abajo a la derecha, aparece en cualquier pantalla).
2. Escribí tu pregunta como se la harías a una persona: *"¿cuánta caja atrapada hay?"*, *"¿cómo viene la obra de Charles?"*, *"¿quién me debe?"*.
3. Te responde con los números reales del sistema, en simple. Si es de un área, consulta al agente de esa área y te cita la fuente.
4. **El Cerebro solo lee y sugiere — nunca paga ni ejecuta nada solo.** Toda acción con plata la aprobás vos.

## Cómo aprobar una decisión
1. Entrá a **Decisiones por aprobar** (o mirá la tarjeta "Decisiones que necesitan tu sí" en Inicio).
2. Cada tarjeta dice qué es, de dónde sale el número y qué pasaría si aprobás.
3. Revisás → aprobás o descartás. Nada se ejecuta hasta que vos confirmás.

## Cómo saber que ves la última versión
- Abajo del menú hay un **badge de versión** (ej. `v e6b90ef`). Ese es el build que estás viendo.
- Si sale una versión nueva mientras tenés la pestaña abierta, aparece solo un aviso **"🔄 Hay una versión nueva — Actualizar"**. Tocás **Actualizar** y listo. **Ya no hace falta limpiar caché a mano.**

---

## Números de referencia (verificados hoy, 23-ago-2026)
- **Caja atrapada (déficit):** $302,104.60 en 13 casas (se recupera al refinanciar/vender). *(Σ del dato de Airtable en todas las casas activas = $297,690.36.)*
- **Te deben vencido (cartera):** $18,636.01 — 15 inquilinos morosos.
- **Ocupación:** 36 de 51 unidades ocupadas = 70.59%.

Regla del sistema: **un dato, una fuente** (Airtable manda; la app no reinventa números).

---

## Lo que NINGÚN software hace solo — necesita al equipo
- **Método de pago** (quién recibió cada cobro): falta el campo en Airtable → cargarlo para que la app lo muestre. *(Carlos / equipo.)*
- **Unidades dudosas** (47 activas en base vs 51 del informe real): reconciliar en Airtable para que ocupación cuadre exacto. *(Carlos.)*

*Última verificación en vivo: empresa-os.vercel.app · build cfaa634eea53 · commit e6b90ef.*
