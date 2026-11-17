FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build the frontend
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start the server (100% Vertex AI IAM/ADC + Cloud Firestore + Cloud Storage)
CMD ["node", "server.js"]
