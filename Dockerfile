# build 
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .

# production
FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=builder --chown=nodejs:nodejs /app /app
USER nodejs
EXPOSE 8000
CMD ["node", "scraper.js"]
