# Pilar 4: Reglas Vivas de Realismo Clínico y Operativo Visual (Chopo)

Este documento forma parte del corpus RAG en **Vertex AI Search** y define las reglas operativas, de equipamiento médico, vestimenta de pacientes y formatos de entrega vigentes en **Laboratorios Médicos El Chopo**.
Su objetivo es evitar errores de realismo visual tanto en imágenes/videos generados por IA (Imagen / Veo) como en materiales producidos por agencias externas.

> **Cómo indexa Vertex AI Search este documento:** Cada sección está separada por encabezados `## Estudio:` para que el buscador semántico recupere únicamente las reglas generales más las del estudio específico de la campaña, evitando ruido de otros servicios.

---

## Estudio: General (Aplica a TODOS los estudios y campañas)

### Regla RLM-001: Entrega de Resultados 100% Digital (Prohibición de Placas Físicas Impresas)
* **Contexto Operativo:** Laboratorios Médicos El Chopo **descontinuó el uso y entrega de placas radiográficas físicas impresas** (acetatos negros/azules vistos a contraluz o en negatoscopios, así como sobres físicos de radiografías). Todos los resultados de imagenología y laboratorio se entregan en formato **100% digital** (App Chopo, portal web `chopo.com.mx`, correo electrónico o visualización en pantalla).
* **Qué SÍ mostrar (Positive Visual Prompt):**
  * Médico o paciente consultando resultados e imágenes diagnósticas en una **tablet moderna, smartphone (App Chopo) o monitor clínico de alta resolución**.
* **Qué NUNCA mostrar (Negative Visual Prompt / Motivo de Rechazo):**
  * **PROHIBIDO** mostrar médicos o pacientes sosteniendo placas físicas de Rayos X o acetatos impresos a contraluz.
  * **PROHIBIDO** mostrar negatoscopios de pared con radiografías colgadas o sobres de papel manila de radiografías.

---

## Estudio: Rayos X (Radiología Digital)

### Regla RLM-002: Vestimenta del Paciente en Rayos X (Bata Clínica Obligatoria)
* **Contexto Operativo:** En los estudios de Rayos X, el paciente no puede ingresar ni posicionarse en el equipo con ropa de calle, botones, cierres ni objetos metálicos que generen artefactos radiológicos.
* **Qué SÍ mostrar (Positive Visual Prompt):**
  * Paciente vistiendo **bata clínica institucional de tela** (azul claro o blanca, limpia y bien ajustada), sin joyería, sin lentes ni objetos metálicos.
  * Técnico radiólogo uniformado asistiendo el posicionamiento con calidez.
* **Qué NUNCA mostrar (Negative Visual Prompt / Motivo de Rechazo):**
  * **PROHIBIDO** mostrar al paciente haciéndose un estudio de Rayos X con ropa de calle (camisas, playeras, jeans, cinturones, collares, aretes o relojes).

### Regla RLM-003A: Equipamiento Correcto para Rayos X
* **Qué SÍ mostrar (Positive Visual Prompt):**
  * Sala de radiología digital moderna con **columna/brazo vertical o soporte de techo con tubo de rayos X y detector plano digital (flat-panel bucky de pared o mesa radiológica abierta)**.
* **Qué NUNCA mostrar (Negative Visual Prompt / Motivo de Rechazo):**
  * **PROHIBIDO** mostrar un equipo de túnel circular cerrado (Resonancia Magnética o Tomógrafo) cuando la campaña anuncia un estudio de **Rayos X**.
  * **PROHIBIDO** mostrar placas físicas impresas (ver `RLM-001`).

---

## Estudio: Resonancia Magnética (RM)

### Regla RLM-003B: Equipamiento y Protocolo Correcto para Resonancia Magnética
* **Contexto Operativo:** La Resonancia Magnética utiliza un campo magnético potente (sin radiación ionizante) dentro de un cilindro/túnel (*gantry*) con camilla motorizada.
* **Qué SÍ mostrar (Positive Visual Prompt):**
  * Equipo de **Resonancia Magnética** (estructura blanca con **túnel cilíndrico amplio e iluminado** y camilla deslizable acolchada).
  * Paciente acostado o preparándose en la camilla vistiendo **bata clínica institucional** (`RLM-002`), sin ningún objeto metálico, con protectores auditivos / audífonos médicos si está en posición de estudio.
* **Qué NUNCA mostrar (Negative Visual Prompt / Motivo de Rechazo):**
  * **PROHIBIDO** mostrar una máquina de brazo abierto de Rayos X o un mastógrafo cuando la campaña es de **Resonancia Magnética**.
  * **PROHIBIDO** mostrar al paciente dentro de la sala del resonador con ropa de calle, relojes, joyería, lentes o dispositivos electrónicos.

---

## Estudio: Tomografía Computarizada (TAC)

### Regla RLM-003C: Equipamiento Correcto para Tomografía
* **Qué SÍ mostrar (Positive Visual Prompt):**
  * Equipo de **Tomografía (anillo o dona más delgada y abierta que el túnel largo de Resonancia Magnética)** con camilla motorizada; paciente en **bata clínica institucional** (`RLM-002`).
* **Qué NUNCA mostrar (Negative Visual Prompt / Motivo de Rechazo):**
  * **PROHIBIDO** mostrar brazo de Rayos X simple o paciente con ropa de calle y objetos metálicos.

---

## Estudio: Ultrasonido y Mastografía

### Regla RLM-003D: Equipamiento y Protocolo en Ultrasonido y Mastografía
* **Qué SÍ mostrar (Positive Visual Prompt):**
  * **Ultrasonido:** Médica o técnico especialista utilizando consola de ultrasonido con monitor digital y transductor de mano; paciente en camilla con bata clínica en ambiente privado y cálido.
  * **Mastografía:** Mastógrafo digital vertical con paleta de compresión; paciente mujer vistiendo bata clínica institucional abierta al frente en un entorno empático y privado.
* **Qué NUNCA mostrar (Negative Visual Prompt / Motivo de Rechazo):**
  * **PROHIBIDO** confundir el mastógrafo o el ultrasonido con equipos de Rayos X de tórax o Resonancia Magnética.

---

## Estudio: Laboratorio Clínico y Toma de Muestra (Check-up Control Diabetes / Sangre)

### Regla RLM-004: Realismo en Toma de Muestra Sanguínea y Check-ups de Laboratorio
* **Contexto Operativo:** En estudios de laboratorio clínico (como *Check-up Control Diabetes*, *Hemoglobina Glicosilada HbA1c*, *Química Sanguínea*):
  * El paciente **sí acude con ropa casual/cotidiana** (a diferencia de Imagenología, en toma de sangre el paciente no usa bata hospitalaria, sino ropa cómoda con el brazo descubierto).
  * El químico/flebotomista porta **bata blanca institucional limpia con logotipo Chopo y guantes de nitrilo**.
* **Qué SÍ mostrar (Positive Visual Prompt):**
  * Paciente tranquilo en sillón de toma de muestra con ropa cotidiana pulcra (o recibiendo orientación médica / consultando sus resultados digitales de glucosa y HbA1c en su celular o tablet).
* **Qué NUNCA mostrar (Negative Visual Prompt / Motivo de Rechazo):**
  * **PROHIBIDO** mostrar agujas perforando la piel en primer plano o jeringas/tubos con sangre roja explícita (`BRD-004`).
  * **PROHIBIDO** ponerle bata hospitalaria de internamiento a un paciente que solo acude a una toma de muestra de sangre ambulatoria.
