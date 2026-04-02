FROM oven/bun:1-alpine
WORKDIR /app

# 1. Copy everything from your computer into the container
COPY . .

# 2. Force install in the aggregator (where pg-connection-string lives)
RUN cd aggregator && bun install

# 3. Force install in the application
RUN cd application && bun install

# 4. Move to the app directory
WORKDIR /app/application

# 5. Set the port and start
ENV http_server_port=3000
EXPOSE 3000

# Use 'bun run' to trigger the Hono server
CMD ["bun", "run", "src/.ts"]