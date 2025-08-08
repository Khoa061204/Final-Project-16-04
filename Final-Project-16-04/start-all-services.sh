#!/bin/bash

# CloudSync - Start All Services Shell Script
# Run this script to start backend, frontend, and websocket services simultaneously

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🚀 CloudSync - Starting All Services...${NC}"
echo ""

# Check if Node.js is installed
echo -e "${YELLOW}📋 Checking if Node.js is installed...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed or not in PATH${NC}"
    echo -e "${RED}Please install Node.js from https://nodejs.org/${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js found: $NODE_VERSION${NC}"
echo ""

# Check service directories
echo -e "${YELLOW}📋 Checking service directories...${NC}"
directories=("backend" "frontend" "websocket-server")
missing_dirs=()

for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✅ Found: $dir${NC}"
    else
        echo -e "${RED}❌ Missing: $dir${NC}"
        missing_dirs+=("$dir")
    fi
done

if [ ${#missing_dirs[@]} -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ Some service directories are missing:${NC}"
    for dir in "${missing_dirs[@]}"; do
        echo -e "${RED}   - $dir${NC}"
    done
    exit 1
fi

echo ""

# Check package.json files
echo -e "${YELLOW}📦 Checking package.json files...${NC}"
missing_packages=()

for dir in "${directories[@]}"; do
    if [ -f "$dir/package.json" ]; then
        echo -e "${GREEN}✅ Found package.json in: $dir${NC}"
    else
        echo -e "${RED}❌ Missing package.json in: $dir${NC}"
        missing_packages+=("$dir")
    fi
done

if [ ${#missing_packages[@]} -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ Some package.json files are missing:${NC}"
    for dir in "${missing_packages[@]}"; do
        echo -e "${RED}   - $dir${NC}"
    done
    echo -e "${RED}Please run 'npm install' in each service directory${NC}"
    exit 1
fi

echo ""

# Start the Node.js script
echo -e "${CYAN}🚀 Starting all services with Node.js script...${NC}"
echo ""

# Check if the Node.js script exists
if [ ! -f "start-all-services.js" ]; then
    echo -e "${RED}❌ start-all-services.js not found${NC}"
    exit 1
fi

# Run the Node.js script
node start-all-services.js

# Handle script exit
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start services${NC}"
    exit 1
fi 