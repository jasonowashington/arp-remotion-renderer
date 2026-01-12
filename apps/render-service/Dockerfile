# Optional Dockerfile if you prefer Docker-based deploys (Render supports both).
FROM node:20-slim

WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY apps/render-service/package.json apps/render-service/tsconfig.json apps/render-service/.env.example apps/render-service/ ./apps/render-service/
COPY packages/remotion-video/package.json packages/remotion-video/tsconfig.json packages/remotion-video/ ./packages/remotion-video/
COPY apps/render-service/src ./apps/render-service/src
COPY packages/remotion-video/src ./packages/remotion-video/src

RUN npm ci
RUN npm run build

ENV PORT=8787
EXPOSE 8787
CMD ["npm","run","start:service"]
