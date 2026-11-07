FROM node:22-alpine

WORKDIR /app

# Copy dependency specifications first to leverage Docker layer caching
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy application source code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start Vite dev server bound to all network interfaces for container access
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
