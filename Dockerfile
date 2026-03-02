FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
COPY packages/agent-client/package.json ./packages/agent-client/package.json
COPY packages/micro-gate/package.json ./packages/micro-gate/package.json
RUN npm install

FROM deps AS builder
COPY tsconfig.json ./
COPY packages ./packages
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV SERVICE=micro-gate
COPY --from=builder /app ./
EXPOSE 3001
CMD ["sh", "-c", "if [ \"$SERVICE\" = \"agent-client\" ]; then npm run start:agent-client; else npm run start:micro-gate; fi"]
