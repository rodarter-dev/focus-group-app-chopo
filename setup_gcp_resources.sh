#!/bin/bash
set -e

# Optional flags:
#   --write-env   Writes a clean .env file if one does not already exist
WRITE_ENV=false
for arg in "$@"; do
  case "$arg" in
    --write-env) WRITE_ENV=true ;;
  esac
done

# Load local .env if present
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${GOOGLE_CLOUD_LOCATION:-us-central1}"
VERTEX_LOC="${VERTEX_AI_LOCATION:-global}"
RAW_FIRESTORE_DB="${FIRESTORE_DATABASE:-(default)}"
if [ "$RAW_FIRESTORE_DB" = "default" ]; then
  FIRESTORE_DB="(default)"
  ENV_FIRESTORE_DB="default"
else
  FIRESTORE_DB="$RAW_FIRESTORE_DB"
  ENV_FIRESTORE_DB="$RAW_FIRESTORE_DB"
fi
BUCKET_NAME="${GCS_BUCKET_NAME:-${PROJECT_ID}-chopo-assets}"
RAG_BUCKET_NAME="${GCS_RAG_BUCKET_NAME:-${PROJECT_ID}-rag-docs}"
ARTIFACT_REPO="${ARTIFACT_REGISTRY_REPO:-cloud-run-source-deploy}"
DATASTORE_ID="${VERTEX_RAG_DATASTORE_SHORT_ID:-chopo-rag-datastore}"
DATASTORE_RESOURCE="${VERTEX_RAG_DATASTORE_ID:-projects/${PROJECT_ID}/locations/global/collections/default_collection/dataStores/${DATASTORE_ID}}"
SA_NAME="${CLOUD_RUN_SA_NAME:-chopo-hub-sa}"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
ENABLE_IAP="${ENABLE_IAP:-false}"
FORCE_UPLOAD_RAG_SEEDS="${FORCE_UPLOAD_RAG_SEEDS:-false}"
FORCE_RAG_IMPORT="${FORCE_RAG_IMPORT:-false}"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: GOOGLE_CLOUD_PROJECT is not set in .env or gcloud config."
  exit 1
fi

echo "==========================================================="
echo " Provisioning GCP Resources for Chopo Intelligence Hub"
echo " Project:           ${PROJECT_ID}"
echo " Region:            ${REGION}"
echo " Firestore:         ${FIRESTORE_DB}"
echo " Assets Bucket:     gs://${BUCKET_NAME}"
echo " RAG Bucket:        gs://${RAG_BUCKET_NAME}"
echo " Artifact Registry: ${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}"
echo " Vertex RAG Store:  ${DATASTORE_ID}"
echo " Runtime SA:        ${SA_EMAIL}"
echo "==========================================================="

echo "1. Enabling required Google Cloud APIs..."
APIS=(
  aiplatform.googleapis.com
  discoveryengine.googleapis.com
  run.googleapis.com
  cloudbuild.googleapis.com
  artifactregistry.googleapis.com
  storage.googleapis.com
  firestore.googleapis.com
  iam.googleapis.com
  iamcredentials.googleapis.com
)
if [ "$ENABLE_IAP" = "true" ]; then
  APIS+=(iap.googleapis.com)
fi
gcloud services enable "${APIS[@]}" --project="${PROJECT_ID}"

echo "2. Checking / Creating Firestore Database (${FIRESTORE_DB})..."
if gcloud firestore databases describe --database="${FIRESTORE_DB}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "   ✓ Firestore database '${FIRESTORE_DB}' already exists in ${PROJECT_ID}."
else
  echo "   Creating Firestore database '${FIRESTORE_DB}' in ${REGION}..."
  gcloud firestore databases create \
    --database="${FIRESTORE_DB}" \
    --location="${REGION}" \
    --type=firestore-native \
    --project="${PROJECT_ID}"
  echo "   ✓ Firestore database '${FIRESTORE_DB}' created."
fi

echo "3. Checking / Creating Private Cloud Storage Buckets (UBLA + PAP)..."
for BKT in "${BUCKET_NAME}" "${RAG_BUCKET_NAME}"; do
  if gcloud storage buckets describe "gs://${BKT}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    echo "   ✓ Bucket 'gs://${BKT}' already exists."
  else
    echo "   Creating bucket 'gs://${BKT}' in ${REGION}..."
    gcloud storage buckets create "gs://${BKT}" \
      --project="${PROJECT_ID}" \
      --location="${REGION}" \
      --uniform-bucket-level-access \
      --public-access-prevention
    echo "   ✓ Bucket 'gs://${BKT}' created."
  fi
done

echo "4. Checking / Creating Artifact Registry Docker Repository (${ARTIFACT_REPO})..."
if gcloud artifacts repositories describe "${ARTIFACT_REPO}" \
  --location="${REGION}" \
  --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "   ✓ Artifact Registry repo '${ARTIFACT_REPO}' already exists in ${REGION}."
else
  echo "   Creating Artifact Registry Docker repo '${ARTIFACT_REPO}' in ${REGION}..."
  gcloud artifacts repositories create "${ARTIFACT_REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Docker images for Chopo Intelligence Hub" \
    --project="${PROJECT_ID}"
  echo "   ✓ Artifact Registry repo '${ARTIFACT_REPO}' created."
fi

echo "5. Checking / Creating Vertex AI Search RAG Data Store (${DATASTORE_ID}) & Seeding 3 Pillars..."
SEEDED_RAG=false
if [ -d "data/seeds/rag_docs" ]; then
  if [ "$FORCE_UPLOAD_RAG_SEEDS" = "true" ] || ! gcloud storage ls "gs://${RAG_BUCKET_NAME}/01_cofepris_lineamientos.md" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    echo "   Uploading official 3 clinical/COFEPRIS seed docs to gs://${RAG_BUCKET_NAME}/..."
    gcloud storage cp data/seeds/rag_docs/*.md "gs://${RAG_BUCKET_NAME}/" --project="${PROJECT_ID}"
    SEEDED_RAG=true
    echo "   ✓ 3 clinical/COFEPRIS seed docs uploaded."
  else
    echo "   ✓ RAG seed docs already present in gs://${RAG_BUCKET_NAME}/ (set FORCE_UPLOAD_RAG_SEEDS=true to overwrite)."
  fi
fi

ACCESS_TOKEN="$(gcloud auth print-access-token 2>/dev/null || true)"
if [ -n "$ACCESS_TOKEN" ]; then
  DS_CHECK_CODE="$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Goog-User-Project: ${PROJECT_ID}" \
    "https://discoveryengine.googleapis.com/v1/projects/${PROJECT_ID}/locations/global/collections/default_collection/dataStores/${DATASTORE_ID}")"

  CREATED_DATASTORE=false
  if [ "$DS_CHECK_CODE" = "200" ]; then
    echo "   ✓ Vertex AI Search Data Store '${DATASTORE_ID}' already exists."
  else
    echo "   Creating Vertex AI Search Data Store '${DATASTORE_ID}' (CHUNKS mode)..."
    DS_CREATE_RESP="$(curl -s -w "\n%{http_code}" -X POST \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "X-Goog-User-Project: ${PROJECT_ID}" \
      -H "Content-Type: application/json" \
      "https://discoveryengine.googleapis.com/v1/projects/${PROJECT_ID}/locations/global/collections/default_collection/dataStores?dataStoreId=${DATASTORE_ID}" \
      -d '{
        "displayName": "Chopo COFEPRIS & Clinical RAG Datastore",
        "industryVertical": "GENERIC",
        "solutionTypes": ["SOLUTION_TYPE_SEARCH"],
        "contentConfig": "CONTENT_REQUIRED",
        "documentProcessingConfig": {
          "chunkingConfig": {
            "layoutBasedChunkingConfig": {
              "chunkSize": 500,
              "includeAncestorHeadings": true
            }
          }
        }
      }')"
    DS_CREATE_CODE="$(echo "$DS_CREATE_RESP" | tail -n 1)"
    if [ "$DS_CREATE_CODE" = "200" ] || [ "$DS_CREATE_CODE" = "201" ]; then
      CREATED_DATASTORE=true
      echo "   ✓ Data Store '${DATASTORE_ID}' creation initiated (waiting 10s before import)..."
      sleep 10
    else
      echo "   ! Warning: Could not create Data Store '${DATASTORE_ID}' automatically (HTTP ${DS_CREATE_CODE}). Create it in GCP Console -> AI Applications -> Data Stores or verify roles/discoveryengine.admin."
    fi
  fi

  if [ "$CREATED_DATASTORE" = "true" ] || [ "$SEEDED_RAG" = "true" ] || [ "$FORCE_RAG_IMPORT" = "true" ]; then
    echo "   Triggering incremental RAG import from gs://${RAG_BUCKET_NAME}/*..."
    IMPORT_CODE="$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "X-Goog-User-Project: ${PROJECT_ID}" \
      -H "Content-Type: application/json" \
      "https://discoveryengine.googleapis.com/v1/projects/${PROJECT_ID}/locations/global/collections/default_collection/dataStores/${DATASTORE_ID}/branches/0/documents:import" \
      -d "{
        \"gcsSource\": {
          \"inputUris\": [\"gs://${RAG_BUCKET_NAME}/*\"],
          \"dataSchema\": \"content\"
        },
        \"reconciliationMode\": \"INCREMENTAL\"
      }")"
    if [ "$IMPORT_CODE" = "200" ] || [ "$IMPORT_CODE" = "201" ]; then
      echo "   ✓ Incremental RAG document import started."
    else
      echo "   ! Warning: RAG import returned HTTP ${IMPORT_CODE} (if Data Store just finished creating, re-run with FORCE_RAG_IMPORT=true in 30s)."
    fi
  fi
else
  echo "   ! Warning: No gcloud access token available; skipped Vertex AI Search Data Store check."
fi

echo "6. Checking / Creating Dedicated Cloud Run Service Account (${SA_EMAIL})..."
if gcloud iam service-accounts describe "${SA_EMAIL}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "   ✓ Service Account '${SA_EMAIL}' already exists."
else
  if gcloud iam service-accounts create "${SA_NAME}" \
    --display-name="Chopo Intelligence Hub Cloud Run Runtime SA" \
    --project="${PROJECT_ID}" >/dev/null 2>&1; then
    echo "   ✓ Service Account '${SA_EMAIL}' created."
  else
    echo "   ! Could not create '${SA_EMAIL}' (falls back to Compute Engine default SA)."
  fi
fi

echo "7. Binding Least-Privilege Runtime IAM Roles (Vertex AI, Firestore, GCS, Vertex AI Search)..."
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)' 2>/dev/null || true)"
DEFAULT_COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

RUNTIME_ROLES=(
  "roles/aiplatform.user"
  "roles/datastore.user"
  "roles/storage.objectAdmin"
  "roles/discoveryengine.admin"
)

for TARGET_SA in "${SA_EMAIL}" "${DEFAULT_COMPUTE_SA}"; do
  if [ -n "${TARGET_SA}" ] && [ "${TARGET_SA}" != "-compute@developer.gserviceaccount.com" ]; then
    if gcloud iam service-accounts describe "${TARGET_SA}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
      for ROLE in "${RUNTIME_ROLES[@]}"; do
        if gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
          --member="serviceAccount:${TARGET_SA}" \
          --role="${ROLE}" \
          --quiet >/dev/null 2>&1; then
          echo "   ✓ Granted ${ROLE} -> ${TARGET_SA}"
        else
          echo "   ! Warning: Could not bind ${ROLE} to ${TARGET_SA} (ask Project IAM Admin to run Step 4 of requerimiento_tecnicos_chopo_gcp.txt)."
        fi
      done
    fi
  fi
done

ENV_BLOCK=$(cat <<EOF
GOOGLE_CLOUD_PROJECT=${PROJECT_ID}
GOOGLE_CLOUD_LOCATION=${REGION}
VERTEX_AI_LOCATION=${VERTEX_LOC}
FIRESTORE_DATABASE=${ENV_FIRESTORE_DB}
GCS_BUCKET_NAME=${BUCKET_NAME}
GCS_RAG_BUCKET_NAME=${RAG_BUCKET_NAME}
VERTEX_RAG_DATASTORE_ID=${DATASTORE_RESOURCE}
AUTH_MODE=none
GENAI_RATE_LIMIT_MAX=60
API_RATE_LIMIT_MAX=300
EOF
)

if [ "$WRITE_ENV" = "true" ]; then
  if [ -f .env ]; then
    echo "8. Skipping --write-env because .env already exists (will not overwrite)."
  else
    printf "%s\n" "$ENV_BLOCK" > .env
    echo "8. ✓ Generated local .env file with provisioned GCP values."
  fi
fi

echo "==========================================================="
echo " Ready! GCP environment provisioned for ${PROJECT_ID}."
echo " Suggested .env values:"
echo "-----------------------------------------------------------"
printf "%s\n" "$ENV_BLOCK"
echo "==========================================================="
