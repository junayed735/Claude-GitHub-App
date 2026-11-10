FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data/db UPLOAD_DIR=/data/uploads
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
VOLUME ["/data"]
CMD ["npm", "start"]
