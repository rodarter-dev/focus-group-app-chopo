#!/bin/bash
set -e

# Load local .env if present
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${GOOGLE_CLOUD_LOCATION:-us-central1}"
RAW_FIRESTORE_DB="${FIRESTORE_DATABASE:-(default)}"
if [ "$RAW_FIRESTORE_DB" = "default" ]; then
  FIRESTORE_DB="(default)"
else
  FIRESTORE_DB="$RAW_FIRESTORE_DB"
fi
BUCKET_NAME="${GCS_BUCKET_NAME:-${PROJECT_ID}-chopo-assets}"
RAG_BUCKET_NAME="${GCS_RAG_BUCKET_NAME:-${PROJECT_ID}-rag-docs}"
SA_NAME="${CLOUD_RUN_SA_NAME:-chopo-hub-sa}"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: GOOGLE_CLOUD_PROJECT is not set in .env or gcloud config."
  exit 1
fi

echo "==========================================================="
echo " Provisioning GCP Resources for Chopo Intelligence Hub"
echo " Project:     ${PROJECT_ID}"
echo " Region:      ${REGION}"
echo " Firestore:   ${FIRESTORE_DB}"
echo " Assets Bkt:  gs://${BUCKET_NAME}"
echo " RAG Bucket:  gs://${RAG_BUCKET_NAME}"
echo " Runtime SA:  ${SA_EMAIL}"
echo "==========================================================="

echo "1. Enabling required Google Cloud APIs..."
gcloud services enable \
  aiplatform.googleapis.com \
  discoveryengine.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com \
  firestore.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  --project="${PROJECT_ID}"

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

echo "3. Checking / Creating Cloud Storage Buckets..."
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

echo "4. Checking / Creating Dedicated Cloud Run Service Account (${SA_EMAIL})..."
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

echo "5. Binding Least-Privilege Runtime IAM Roles (Vertex AI, Firestore, GCS, Vertex AI Search)..."
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

echo "==========================================================="
echo " Ready! GCP environment provisioned for ${PROJECT_ID}:"
echo " - Firestore:   ${PROJECT_ID} / ${FIRESTORE_DB}"
echo " - Assets GCS:  gs://${BUCKET_NAME}"
echo " - RAG GCS:     gs://${RAG_BUCKET_NAME}"
echo " - Runtime SA:  ${SA_EMAIL}"
echo "==========================================================="
