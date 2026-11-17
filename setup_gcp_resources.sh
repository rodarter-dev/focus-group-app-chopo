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
FIRESTORE_DB="${FIRESTORE_DATABASE:-default}"
BUCKET_NAME="${GCS_BUCKET_NAME:-${PROJECT_ID}-chopo-assets}"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: GOOGLE_CLOUD_PROJECT is not set in .env or gcloud config."
  exit 1
fi

echo "==========================================================="
echo " Provisioning GCP Resources for Chopo Intelligence Hub"
echo " Project:   ${PROJECT_ID}"
echo " Region:    ${REGION}"
echo " Firestore: ${FIRESTORE_DB}"
echo " Bucket:    gs://${BUCKET_NAME}"
echo "==========================================================="

echo "1. Enabling required APIs (Firestore, Storage, Vertex AI)..."
gcloud services enable \
  firestore.googleapis.com \
  storage.googleapis.com \
  aiplatform.googleapis.com \
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

echo "3. Checking / Creating Cloud Storage Bucket (gs://${BUCKET_NAME})..."
if gcloud storage buckets describe "gs://${BUCKET_NAME}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "   ✓ Bucket 'gs://${BUCKET_NAME}' already exists."
else
  echo "   Creating bucket 'gs://${BUCKET_NAME}' in ${REGION}..."
  gcloud storage buckets create "gs://${BUCKET_NAME}" \
    --project="${PROJECT_ID}" \
    --location="${REGION}" \
    --uniform-bucket-level-access \
    --public-access-prevention
  echo "   ✓ Bucket 'gs://${BUCKET_NAME}' created."
fi

echo "==========================================================="
echo " Ready! Your local app can now connect remotely to:"
echo " - Firestore: ${PROJECT_ID} / ${FIRESTORE_DB}"
echo " - GCS:       gs://${BUCKET_NAME}"
echo "==========================================================="
