FROM node:22-alpine

WORKDIR /app

# Copy dependency specifications first to leverage Docker layer caching
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy application source code
COPY . .

# Expose backend API port
EXPOSE 8000

# Start server in watch mode for development hot-reloading
CMD ["npm", "run", "dev"]
