# Stage 1: build (Node lives only here)
FROM node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# RUN ls -la /app/dist /app/dist/*
# Stage 2: serve static files (no Node)
FROM nginx:alpine
COPY --from=build /app/dist/WebFrontend/browser /usr/share/nginx/html