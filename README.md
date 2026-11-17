# Laboratorios Chopo — Intelligence Hub (Grupo PROA)

Plataforma de Inteligencia de Marketing Clínico construida con **React + TypeScript**, **Node.js / Express**, **Google Cloud Vertex AI**, **Cloud Firestore**, **Cloud Storage** y **Vertex AI Search (RAG)** para el diseño, validación y evaluación de campañas de la Parrilla de Estudios Clínicos con pacientes (B2C) y médicos prescriptores (B2B) 100% simulados bajo lineamientos COFEPRIS.

---

## Arquitectura y Servicios GCP

- **Cómputo:** Google Cloud Run (`chopo-intelligence-hub` en `us-central1`)
- **Modelos Vertex AI (IAM / ADC — Cero API Keys):**
  - `gemini-3.5-flash` (Generación de audiencias, usuarios sintéticos, briefs y simulaciones de Focus Group)
  - `gemini-3.1-pro-preview` (Razonamiento avanzado para Briefs y Evaluación Multimodal)
  - `gemini-3-pro-image` (Generación de creatividad visual clínica)
  - `veo-3.1-lite-generate-001` (Generación de video corto)
- **Base de Conocimiento (RAG):** Vertex AI Search (`chopo-rag-datastore`) + Cloud Storage (`gs://<PROJECT_ID>-rag-docs`)
- **Persistencia y Activos:** Cloud Firestore (`chopo_config`, `chopo_config_versions`, `chopo_runs`, `chopo_evaluations`) + Cloud Storage (`gs://<PROJECT_ID>-chopo-assets/chopo-media/`)

---

## Flujo de Trabajo (4 Pasos)

1. **`1. Audiencias`:** Catálogo de perfiles base de Laboratorios Chopo (Pacientes B2C y Médicos B2B) y creador directo de nuevas audiencias mediante prompts con IA.
2. **`2. Usuarios Sintéticos`:** Generación por lotes (`1` a `15` usuarios por segmento) con contexto clínico adicional y sincronización automática con el Focus Group.
3. **`3. Brief de Marketing`:** Generación de estrategia y piezas multicanal (Mensajes Clave, Banners de Redes, Correos tipo Banner Visual, Promociones) amarradas al catálogo de Estudios Clínicos y folios COFEPRIS.
4. **`4. Focus Group`:** Simulación y evaluación de Mensajes Clave, Promociones, Correos, Compra de Estudios (Sucursal vs. Domicilio), Imagen / Banner (con carga de arte propio), A/B Test y Entrevistas Cualitativas (`Chat`).

---

## Ejecución Local y Despliegue

### 1. Configurar Variables de Entorno
Copia `.env.example` a `.env` y ajusta el proyecto de Google Cloud:

```bash
cp .env.example .env
gcloud auth login
gcloud auth application-default login
```

### 2. Instalar y Ejecutar en Local

```bash
npm install
npm run build
node server.js
# Disponible en http://localhost:8080
```

### 3. Pruebas Unitarias

```bash
npx vitest run
```

### 4. Aprovisionar Recursos GCP y Desplegar en Cloud Run

```bash
./setup_gcp_resources.sh
./cloud_run.sh
```
