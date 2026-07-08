FROM docker.1ms.run/node:20-alpine AS build
WORKDIR /app
RUN npm config set registry https://registry.npmmirror.com
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc && mkdir -p dist/config && cp src/config/init-data.sql dist/config/

FROM docker.1ms.run/node:20-alpine
WORKDIR /app
RUN npm config set registry https://registry.npmmirror.com
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
  CMD node -e "fetch('http://localhost:3001/api/dashboard').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
