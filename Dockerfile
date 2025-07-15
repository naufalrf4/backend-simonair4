# ---- Base Stage ----
FROM node:22-alpine AS base
WORKDIR /usr/src/app
COPY package*.json ./

# ---- Dependencies Stage ----
FROM base AS dependencies
RUN npm install

# ---- Build Stage ----
FROM base AS build
COPY . .
RUN npm install
RUN npm run build

# ---- Production Stage ----
FROM base AS production
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY .env ./.env

ENV NODE_ENV production
EXPOSE 3000

CMD ["node", "dist/main"]