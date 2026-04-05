# Stage 1: Compile TypeScript to JS
FROM node:18-alpine AS ts-builder
WORKDIR /server
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY nakama-runtime.d.ts ./
COPY src/ ./src/
RUN npx tsc

# Stage 2: Nakama runtime image
FROM heroiclabs/nakama:3.26.0
COPY --from=ts-builder /server/build/ /nakama/data/modules/build/
COPY local.yml /nakama/data/
