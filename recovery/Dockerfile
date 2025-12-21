# Build stage
FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install
# Install serve globally
RUN npm install -g serve

# Copy source and build
COPY . .
RUN npm run build

# Serve stage
EXPOSE 8080
ENV PORT=8080
CMD ["serve", "dist", "-l", "8080"]
