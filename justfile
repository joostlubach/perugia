default:
    @just --list

# Install dependencies for all workspaces
install:
    npm install

# Run the API and web app together for local dev
dev:
    npm run dev

# Build both workspaces for production
build:
    npm run build
