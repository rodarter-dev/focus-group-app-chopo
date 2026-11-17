#!/bin/bash
set -e

# Check gcloud authentication
echo "Checking gcloud authentication..."
if ! gcloud auth print-access-token &> /dev/null; then
  echo "Error: You are not authenticated with gcloud."
  echo "Please run 'gcloud auth login' and 'gcloud auth application-default login' to authenticate."
  exit 1
fi
echo "gcloud authentication verified."

# Configuration
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-chopo-argolis}"
SERVICE_NAME="chopo-intelligence-hub"
REGION="${GOOGLE_CLOUD_LOCATION:-us-central1}"
GCS_BUCKET_NAME="${GCS_BUCKET_NAME:-${PROJECT_ID}-chopo-assets}"
GCS_RAG_BUCKET_NAME="${GCS_RAG_BUCKET_NAME:-${PROJECT_ID}-rag-docs}"
VERTEX_RAG_DATASTORE_ID="${VERTEX_RAG_DATASTORE_ID:-projects/${PROJECT_ID}/locations/global/collections/default_collection/dataStores/chopo-rag-datastore}"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy/${SERVICE_NAME}:latest"

echo "Building and pushing container image $IMAGE_URI..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
docker build --network=host -t "$IMAGE_URI" .
docker push "$IMAGE_URI"

echo "Deploying $SERVICE_NAME to Cloud Run in project $PROJECT_ID ($REGION)..."

# Deploy (100% Vertex AI IAM/ADC + Firestore + Cloud Storage + Vertex AI Search RAG)
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_URI" \
  --project "$PROJECT_ID" \
  --platform managed \
  --region "$REGION" \
  --no-allow-unauthenticated \
  --invoker-iam-check \
  --memory 1Gi \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GOOGLE_CLOUD_LOCATION=${REGION},GCS_BUCKET_NAME=${GCS_BUCKET_NAME},GCS_RAG_BUCKET_NAME=${GCS_RAG_BUCKET_NAME},VERTEX_RAG_DATASTORE_ID=${VERTEX_RAG_DATASTORE_ID},VERTEX_AI_LOCATION=${VERTEX_AI_LOCATION:-global},FIRESTORE_DATABASE=${FIRESTORE_DATABASE:-default}"

echo "Deployment complete."
