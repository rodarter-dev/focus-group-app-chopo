# Laboratorio Médico del Chopo — Chopo Intelligence Hub (Grupo Diagnóstico Médico PROA)

Plataforma interna de Inteligencia de Marketing Clínico construida con **React 19 + TypeScript**, **Node.js 20 / Express 5 (BFF)**, **Google Cloud Run**, **Vertex AI (Gemini 3)**, **Cloud Firestore**, **Cloud Storage** y **Vertex AI Search (RAG)**.

Diseñada para que los equipos de **Marketing**, **Marca** y **Área Médica** de **Laboratorio Médico del Chopo** diseñen, pre-evalúen y refinen campañas de su Parrilla de Estudios Clínicos con audiencias **100% sintéticas** (**Pacientes B2C**, **Médicos B2D** y **Empresas B2B**) bajo el **Manual de Marca V4** y lineamientos **COFEPRIS**.

---

## 1. Principios Clave de Arquitectura (Lectura Rápida para el Equipo)

- **100% Cero-PII / Cero-PHI:** No se conecta a CRM, LIS/HIS ni expedientes clínicos. Todas las audiencias son simulaciones exploratorias de pre-testeo creativo (*Human-in-the-Loop*).
- **Cero API Keys y Cero MCP / Function Calling:** El contenedor invoca Vertex AI, Firestore, Cloud Storage y Vertex AI Search vía **IAM / ADC** (cuenta dedicada `chopo-hub-sa`). El LLM solo devuelve JSON pasivo (`responseSchema`) sin herramientas ni escritura directa a bases de datos.
- **Arquitectura Híbrida de Conocimiento V4 (Determinístico + RAG):**
  - **Manual de Marca V4 (Determinístico en Firestore — `brand_manual_config/active`):** Almacenado como documento estructurado (~35 KB) e inyectado por flujo mediante cortes exactos ([`services/brandManualUtils.js`](services/brandManualUtils.js)) sin pérdida *Top-K* ni valores hardcodeados en prompts.
  - **Base de Conocimiento Clínica y COFEPRIS (RAG en Vertex AI Search — `chopo-rag-datastore`):** Indexa **exclusivamente los 3 pilares clínicos/regulatorios** (`01_cofepris_lineamientos.md`, `03_catalogo_estudios_diabetes.md`, `04_reglas_realismo_clinico_y_operativo.md` + PDFs curados), filtrados por estudio en backend.
- **Separación Regional GCP:**
  - `us-central1` (`GOOGLE_CLOUD_LOCATION`): Cloud Run, Cloud Firestore Native `(default)` y ambos buckets privados de Cloud Storage (`UBLA` + `Public Access Prevention`, cifrado AES-256 / GMEK).
  - `global` (`VERTEX_AI_LOCATION`): Modelos **Gemini 3** y **Vertex AI Search**.
- **Cero escrituras en disco local (`stateless`):** Las imágenes Base64 se interceptan automáticamente, se suben a `gs://<PROJECT_ID>-chopo-assets/chopo-media/` y se sirven vía proxy autenticado `/api/media/:filename`. Incluye *Circuit Breaker* (60 s) y respaldo automático en GCS (`db/chopo_state.json`).
- **Hardening Backend Integrado ([`services/securityMiddleware.js`](services/securityMiddleware.js)):** Encabezados HTTP (`CSP`, `HSTS`, `X-Frame-Options: DENY`, `nosniff`, `Permissions-Policy`, `COOP`), *Rate Limiting* en 2 niveles (`60 req/min` en IA, `300 req/min` en API), `AUTH_MODE` parametrizable (`none` | `iap` | `login`), **RBAC** (`adminGuard` en los 13 endpoints de escritura administrativa + `GET /api/auth/me`) y partición de corridas por `userId`.

---

## 2. Módulos y Flujo de Trabajo

### Flujo Principal (100% Español Mexicano)
1. **`1. Audiencias`:** Catálogo base en los **3 segmentos oficiales V4** (`Paciente B2C`, `Médico B2D`, `Empresa B2B`), filtros, creador asistido de nuevos perfiles, historial y restauración en 1 clic.
2. **`2. Usuarios Sintéticos`:** Generación por lotes (`1` a `15` participantes simulados) con contexto clínico adicional.
3. **`3. Brief de Marketing`:** Configuración por **Segmento**, **Etapa del Funnel** (`Awareness`, `Consideration`, `Performance`), **Canal y Formatos Soportados** (leídos dinámicamente del Manual V4, incluyendo canales creados con `+ Nuevo Canal`), catálogo de estudios con folios COFEPRIS, vistas previas V4 (`Roboto`) y **Exportación Ejecutiva (PDF / HTML)**.
4. **`4. Focus Group`:** Evaluación de Campaña/Banner (con carga de arte de agencia), Prueba A/B, Mensajes Clave, Promociones, Correos, Compra de Estudios y Entrevista Cualitativa (`Chat` y 1-a-1), con rúbricas ponderadas, selector de **Canal Evaluado** y **Exportación Ejecutiva (PDF / HTML)**.

### Módulos Administrables (sin código, con historial y rollback)
- **`Manual de Marca V4`:** 5 pestañas editables (`Identidad y Voz`, `Fotografía e Imagen`, `Paleta y Contrastes` con vista previa `Aa`, `Diseño Gráfico y Línea Basal` y `Reglas por Canal` + `+ Nuevo Canal`), modo **Solo Lectura** automático vía `/api/auth/me` para usuarios no administradores, protección de colores/canales base, historial con autoría (`updatedBy`) y **Exportación Ejecutiva del Manual (PDF / Texto)**.
- **`Base de Conocimiento (COFEPRIS y Clínico)`:** Edición de los 3 pilares clínicos/regulatorios y carga de documentos `.pdf` / `.txt` con extracción de texto y reindexación incremental automática en Vertex AI Search.

---

## 3. Estructura del Proyecto

```text
focus-group-app-chopo/
├── Dockerfile                        # Build multi-paso Node 20 Alpine (npm install -> vite build -> node server.js)
├── .dockerignore                     # Excluye node_modules, .env, .git del contexto Docker
├── .env.example                      # Plantilla de variables de entorno (GCP, modelos, auth, rate limit)
├── setup_gcp_resources.sh            # Aprovisionamiento idempotente: 9 APIs, Firestore, 2 Buckets privados y SA chopo-hub-sa
├── cloud_run.sh                      # Docker build/push a Artifact Registry + despliegue seguro a Cloud Run
├── start_local.sh                    # Arranque rápido para pruebas locales
├── server.js                         # BFF Express 5 (43 endpoints REST): proxy Vertex AI, Firestore, GCS, RAG, Manual V4 y seguridad
├── App.tsx                           # Enrutador SPA principal (AppMode) y carga inicial
├── config.ts                         # Identidad base Laboratorio Médico del Chopo y paleta oficial V4
├── types.ts                          # Contratos TypeScript (BrandManualConfig, segmentos B2C/B2D/B2B, Funnel, canales, evaluaciones)
├── context/
│   ├── CompanyContext.tsx            # Contexto institucional sincronizado con Firestore
│   └── LanguageContext.tsx           # Interfaz fija en Español Mexicano (es-MX)
├── services/
│   ├── securityMiddleware.js (.d.ts) # Headers HTTP, Rate Limiting dual, AUTH_MODE (none/iap/login), RBAC y partición userId
│   ├── brandManualUtils.js (.d.ts)   # Motor isomórfico V4: buildBrandSlices, canales/formatos dinámicos y exportador de texto
│   ├── reportExporter.ts             # Generador de Reportes Ejecutivos PDF (@media print) / HTML para Brief y Focus Group
│   └── geminiService.ts              # Cliente HTTP hacia /api/*, prompts dinámicos sin hardcodes y responseSchemas
├── components/
│   ├── Navigation.tsx                # Sidebar 1..4 + Manual de Marca V4 + Modal Base de Conocimiento (COFEPRIS y Clínico)
│   ├── Home.tsx                      # Portada Chopo Intelligence Hub + flujo 1..4 + Atajo Agencia + acceso Manual V4
│   ├── BrandManualView.tsx           # Editor de 5 pestañas del Manual V4 + historial/rollback + modo solo lectura + PDF
│   ├── AudienceGenerator.tsx         # Paso 1: Catálogo B2C/B2D/B2B + creador asistido + historial
│   ├── SyntheticUsers.tsx            # Paso 2: Generador batch (1..15)
│   ├── MarketingBrief.tsx            # Paso 3: Brief V4 por Funnel/Canal dinámico + creativos + Exportar Reporte PDF/HTML
│   ├── SyntheticTesting.tsx          # Paso 4: Focus Group (7 pestañas) + A/B Test + Exportar Reporte PDF/HTML
│   ├── SyntheticChat.tsx             # Entrevista cualitativa grupal
│   ├── SyntheticInterview.tsx        # Entrevista 1-a-1
│   ├── HelpGuideModal.tsx            # Centro de Ayuda contextual en Español + FAQ
│   └── __tests__/                    # Tests Vitest de componentes (Home, Navigation, AudienceGenerator, HelpGuideModal)
├── data/
│   ├── simulationData.ts             # Catálogo clínico fallback y utilidades B2C/B2D/B2B
│   └── seeds/                        # Semillas oficiales inmutables (usadas en inicialización y botones de restauración)
│       ├── brand_manual_seed.json    # Manual de Marca V4 completo (5 secciones, 11 filas de contraste, 4 canales base)
│       ├── personas_seed.json        # Perfiles sintéticos iniciales
│       ├── rubrics_seed.json         # 6 criterios ponderados de evaluación
│       ├── use_cases_seed.json       # 5 estudios clínicos con folios COFEPRIS y reglas de ayuno
│       └── rag_docs/                 # Exclusivamente los 3 pilares clínicos y regulatorios
│           ├── 01_cofepris_lineamientos.md
│           ├── 03_catalogo_estudios_diabetes.md
│           └── 04_reglas_realismo_clinico_y_operativo.md
├── public/
│   ├── index.css                     # Estilos globales
│   └── images/chopo-logo.svg         # Logotipo vectorial
└── tests/                            # Suites Vitest (securityMiddleware, brandManual, reportExporter, logo, acquisition)
```

---

## 4. Prerrequisitos y Variables de Entorno

### Prerrequisitos
- **Node.js 20 LTS** y **npm**
- **Google Cloud CLI (`gcloud`)** autenticada en el proyecto GCP destino
- **Docker** *(requerido únicamente para construir/empujar imágenes en despliegue remoto con `cloud_run.sh`)*

### Configuración de `.env` (Desarrollo Local)
Copia la plantilla limpia (nunca subas `.env` a Git):

```bash
cp .env.example .env
```

Variables principales:

| Variable | Default | Descripción |
| :--- | :--- | :--- |
| `GOOGLE_CLOUD_PROJECT` | *(Requerida)* | ID del proyecto GCP (`chopo-argolis` en sandbox / `project-nonprod-gcp-chopo` en PROA). |
| `GOOGLE_CLOUD_LOCATION` | `us-central1` | Región fija de Cloud Run, Firestore y GCS. |
| `VERTEX_AI_LOCATION` | `global` | Endpoint para modelos Gemini 3 y Vertex AI Search. |
| `FIRESTORE_DATABASE` | `default` | Base de datos Firestore Native `(default)`. |
| `GCS_BUCKET_NAME` | `${PROJECT_ID}-chopo-assets` | Bucket privado para retratos, artes y backup de estado. |
| `GCS_RAG_BUCKET_NAME` | `${PROJECT_ID}-rag-docs` | Bucket privado de los 3 pilares clínicos/COFEPRIS y PDFs. |
| `VERTEX_RAG_DATASTORE_ID` | `projects/${PROJECT_ID}/locations/global/collections/default_collection/dataStores/chopo-rag-datastore` | Resource Name del Data Store de Vertex AI Search. |
| `VERTEX_TEXT_MODEL` / `VERTEX_EVALUATOR_MODEL` / `VERTEX_IMAGE_MODEL` / `VERTEX_VIDEO_MODEL` | `gemini-3.5-flash` / `gemini-3.1-pro-preview` / `gemini-3-pro-image` / `veo-3.1-lite-generate-001` | Versiones de modelos controladas por entorno. |
| `AUTH_MODE` | `none` | `none` (local/demo), `iap` (Cloud IAP / SSO corporativo) o `login` (sesión HMAC-SHA256). |
| `CHOPO_ADMIN_EMAILS` | *(Vacío)* | Lista CSV de correos con rol `admin` (Brand Owners / Regulatorio) para RBAC. |
| `RBAC_ENFORCE` / `USER_SCOPED_RUNS` | `true` si `AUTH_MODE != none` | Bloquea escrituras admin a rol `marketing` (`403`) y separa `chopo_runs` por `userId`. |
| `GENAI_RATE_LIMIT_MAX` / `API_RATE_LIMIT_MAX` | `60` / `300` | Límite de solicitudes por minuto (`HTTP 429` al exceder). |
| `MAX_INSTANCES` / `MIN_INSTANCES` / `CLOUD_RUN_TIMEOUT` | `5` / `0` / `300` | Parámetros de escalado y timeout aplicados por `cloud_run.sh`. |

---

## 5. Ejecución Local (Desarrollo y Demo)

### Paso 1: Autenticarse en Google Cloud
```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project chopo-argolis
```
> En desarrollo local (`!process.env.K_SERVICE`), `server.js` detecta automáticamente cambios en tus credenciales de `gcloud` / ADC y las recarga en caliente sin reiniciar el servidor.

### Paso 2: Instalar dependencias, compilar y levantar servidor (Modo Demo / Producción Local)
```bash
npm install
npm run build
node server.js
# Aplicación disponible en http://localhost:8080
```
*(Alternativa rápida: `./start_local.sh`)*

### Modo Desarrollo Frontend (Hot-Reload)
Si estás editando pantallas de React y quieres recarga instantánea en Vite, abre dos terminales:
```bash
# Terminal 1 (Backend API en :8080)
node server.js

# Terminal 2 (Frontend Vite dev server)
npm run dev
```

### Verificación Rápida en Local
```bash
curl -s http://localhost:8080/health
curl -s http://localhost:8080/api/auth/me
```

---

## 6. Validación de Calidad y Pruebas Automatizadas

Antes de hacer cualquier commit o despliegue, ejecuta las 3 verificaciones completas:

```bash
# 1. Verificación estricta de tipos TypeScript (0 errores)
npx tsc --noEmit

# 2. Suite completa de pruebas unitarias (10 suites / 70 tests)
npx vitest run

# 3. Compilación de producción del SPA
npm run build
```

---

## 7. Despliegue Remoto en Google Cloud Run (Por CLI)

### Paso 1: Aprovisionar Recursos GCP (Una sola vez por proyecto nuevo)
Crea/habilita las 9 APIs base, Firestore Native `(default)`, ambos buckets privados (`UBLA` + `Public Access Prevention`) y la cuenta de servicio dedicada `chopo-hub-sa` con sus 4 roles mínimos:

```bash
GOOGLE_CLOUD_PROJECT=chopo-argolis ./setup_gcp_resources.sh
```
*(Para el proyecto de Grupo PROA cambia `chopo-argolis` por `project-nonprod-gcp-chopo`.)*

### Paso 2: Construir Imagen Docker y Desplegar en Cloud Run
[`cloud_run.sh`](cloud_run.sh) construye el contenedor, lo sube a Artifact Registry y despliega en Cloud Run **cerrado por defecto** (`--no-allow-unauthenticated --invoker-iam-check`, `--memory=1Gi`, `--max-instances=5`, `--min-instances=0`, `--timeout=300`):

```bash
GOOGLE_CLOUD_PROJECT=chopo-argolis ./cloud_run.sh
```

### Paso 3: Acceder al Servicio Remoto

#### Opción A — Acceso Privado Seguro vía Proxy (Recomendado para revisión técnica)
Mantiene el servicio 100% cerrado a internet y abre un túnel local autenticado con tu cuenta IAM:
```bash
gcloud run services proxy chopo-intelligence-hub \
  --region=us-central1 \
  --project=chopo-argolis
# Abre http://localhost:8080 en tu navegador
```

#### Opción B — Abrir y Cerrar Acceso Directo HTTPS (Solo durante demos controladas)
```bash
# Abrir acceso directo en navegador para demo
gcloud run services update chopo-intelligence-hub \
  --region=us-central1 \
  --project=chopo-argolis \
  --no-invoker-iam-check

# Volver a cerrar el acceso al terminar la demo (MUY IMPORTANTE)
gcloud run services update chopo-intelligence-hub \
  --region=us-central1 \
  --project=chopo-argolis \
  --invoker-iam-check
```

### Paso 4: Verificación Remota con Token IAM (cuando el servicio está cerrado)
```bash
SERVICE_URL=$(gcloud run services describe chopo-intelligence-hub \
  --region=us-central1 --project=chopo-argolis --format='value(status.url)')

# Confirmar bloqueo público (debe devolver 403 cuando --invoker-iam-check está activo)
curl -s -o /dev/null -w "%{http_code}\n" "${SERVICE_URL}/health"

# Verificar salud y headers de seguridad autenticado
curl -sD - -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  "${SERVICE_URL}/health"
```

### Paso 5: Activar Seguridad Corporativa (`AUTH_MODE=iap` + RBAC) en Proyecto PROA
Una vez que TI de PROA configure Cloud IAP / SSO delante de Cloud Run en `project-nonprod-gcp-chopo`:

```bash
gcloud run services update chopo-intelligence-hub \
  --region=us-central1 \
  --project=project-nonprod-gcp-chopo \
  --update-env-vars="AUTH_MODE=iap,RBAC_ENFORCE=true,USER_SCOPED_RUNS=true,CHOPO_ADMIN_EMAILS=brand1@proa.com.mx,brand2@proa.com.mx"
```

---

## 8. Operación, Restauración de Semillas y Kill Switch

- **Restaurar configuración oficial desde la UI:** Usa **`Restaurar Manual V4 Oficial`** en `Manual de Marca V4` o **`Restaurar Base Oficial`** en `Base de Conocimiento` / `1. Audiencias`. Cada cambio crea un snapshot automático en `chopo_config_versions` con `updatedBy`.
- **Limpiar corridas temporales antes de una demo (conservando catálogos y Manual V4):**
  ```bash
  curl -X POST http://localhost:8080/api/runs/clear-all
  ```
- **Kill Switch inmediato en GCP:** TI de PROA puede detener el servicio en segundos bloqueando tráfico en IAP, aplicando `--invoker-iam-check`, deshabilitando `chopo-hub-sa` o bajando el servicio en Cloud Run.

---

## 9. Convenciones Clave para Contribuidores

1. **Idioma:** Todo identificador de código, variable, comentario y llave JSON debe ir en **inglés ASCII** (sin acentos). Toda la interfaz visible y salidas para Marketing deben ir en **Español Mexicano (`es-MX`)** sin jerga técnica.
2. **Reglas de Marca V4 en UI y Reportes:** **Cero signos de exclamación (`¡`/`!`)** en etiquetas/mensajes visibles, nombre oficial **`Laboratorio Médico del Chopo`**, paleta oficial V4 (`#004699`, `#005FFC`, `#63CF00`, `#F24360`) y los 3 segmentos (`Pacientes B2C`, `Médicos B2D`, `Empresas B2B`).
3. **Integridad del filtrado clínico:** En [`data/seeds/rag_docs/04_reglas_realismo_clinico_y_operativo.md`](data/seeds/rag_docs/04_reglas_realismo_clinico_y_operativo.md), **conservar siempre los encabezados `## Estudio:`**, ya que `filterRealismRulesByStudy` en `server.js` filtra dinámicamente por ese prefijo.
4. **Cero dependencias innecesarias y cero secretos:** Nunca subir `.env`, llaves JSON ni `API Keys` al repositorio; `securityMiddleware.js` y `reportExporter.ts` operan con cero dependencias externas adicionales.
