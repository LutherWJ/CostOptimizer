FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY src ./src
COPY tsconfig.json ./
ENV http_server_port=3000
EXPOSE 3000
CMD ["bun", "src/index.ts"]
