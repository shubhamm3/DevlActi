# Base image
FROM node:22-alpine

# Set working directory
WORKDIR /app

#set environment to production
ENV NODE_ENV=production

#install dependencies
COPY package*.json ./
RUN npm install

# copy app files
COPY . .

# expose the app port
EXPOSE 3001

#command to run the app
CMD ["node", "sec/index.js"]