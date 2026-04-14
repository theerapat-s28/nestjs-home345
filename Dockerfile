# Use the official Node.js image as a base
FROM node:22.12.0

# Set default timezone for the application
ENV TZ=Asia/Bangkok

# Install pnpm globally
RUN npm install -g pnpm@10.19.0

# Set the working directory
WORKDIR /workspace

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies (including devDependencies needed for building NestJS)
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Generate Prisma Client, dummy is required for build time since prisma 7
RUN DATABASE_URL="postgresql://dummy" pnpm prisma generate

# Build the application
RUN pnpm run build

# Expose the application port
EXPOSE 3000

# Command to run the application (automatically run migrations deploy)
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/src/main"]
