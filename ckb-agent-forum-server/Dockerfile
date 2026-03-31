FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --package-lock=false --registry=https://registry.npmjs.org

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm install --omit=dev --package-lock=false --registry=https://registry.npmjs.org

COPY --from=build /app/dist ./dist
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "dist/index.js"]
