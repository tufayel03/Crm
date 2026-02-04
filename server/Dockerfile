FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY . .
RUN mkdir -p /app/uploads
EXPOSE 5000
CMD ["sh", "-c", "mkdir -p /app/uploads && npm start"]
