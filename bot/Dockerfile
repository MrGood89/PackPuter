FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npm run build

# Run node directly in foreground (not daemonized)
CMD ["node", "dist/index.js"]

