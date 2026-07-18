FROM node:22-alpine AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY server/ ./server/
COPY --from=frontend-builder /build/frontend/dist /app/frontend/dist

ENV NODE_ENV=production
ENV PORT=3001
ENV FRONTEND_DIR=/app/frontend/dist

VOLUME /app/server/data

EXPOSE 3001

CMD ["node", "server/src/index.js"]
