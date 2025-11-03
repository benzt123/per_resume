# Backend Dockerfile for per_resume
# Based on Debian to avoid Alpine native build issues with canvas/tesseract etc.
FROM node:18-bullseye

# set working dir
WORKDIR /usr/src/app

# Install system deps required by some native modules (canvas, tesseract, etc.)
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential python3 python3-dev pkg-config \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev libpng-dev \
    libleptonica-dev tesseract-ocr \
  && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --production || npm install --production

# Copy server code
COPY server ./server

# Expose default port (adjust via ENV if needed)
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Start the server (adjust path if your entry is different)
CMD [ "node", "server/index.js" ]
