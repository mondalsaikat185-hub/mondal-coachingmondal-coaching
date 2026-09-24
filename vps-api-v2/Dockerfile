FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY *.js ./
EXPOSE 4100
CMD ["node", "server.js"]
