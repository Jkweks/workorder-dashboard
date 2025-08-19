FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm i; fi

COPY . .
EXPOSE 4000
CMD ["node", "server.js"]
