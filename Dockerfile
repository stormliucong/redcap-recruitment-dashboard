# Build stage
FROM node:18-slim as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean install dependencies with legacy peer deps
RUN rm -rf node_modules package-lock.json \
    && npm install --legacy-peer-deps

# Install platform-specific dependency
RUN npm install @rollup/rollup-linux-x64-gnu --save-dev

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 