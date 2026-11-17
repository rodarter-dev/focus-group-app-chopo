#!/bin/bash
set -e

# Load local .env if present (never committed to Git)
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

export NODE_ENV=production
export GOOGLE_CLOUD_PROJECT="${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
export GOOGLE_CLOUD_LOCATION="${GOOGLE_CLOUD_LOCATION:-us-central1}"
export GCS_BUCKET_NAME="${GCS_BUCKET_NAME:-${GOOGLE_CLOUD_PROJECT}-chopo-assets}"

echo "==========================================================="
echo " Laboratorios Chopo | Intelligence Hub (100% GCP Backend)"
echo " Project:  ${GOOGLE_CLOUD_PROJECT}"
echo " Location: ${GOOGLE_CLOUD_LOCATION}"
echo " Bucket:   ${GCS_BUCKET_NAME}"
echo "==========================================================="

# Verify Application Default Credentials (ADC) for Vertex AI, Firestore & GCS
if ! gcloud auth application-default print-access-token >/dev/null 2>&1; then
  echo "Warning: Application Default Credentials (ADC) not detected."
  echo "Run: gcloud auth application-default login"
fi

echo "Building frontend and starting local production server on http://localhost:8080 ..."
npm install
npm run build
node server.js
