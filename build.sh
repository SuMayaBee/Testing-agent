#!/bin/bash
# Exit immediately if a command fails
set -e

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Fix any potential issues with the source code
echo "Ensuring all React files use .jsx extension..."

# Create src-fixed directory
mkdir -p src-fixed
cp -r src/* src-fixed/

# Find all JS files with React imports and rename them to .jsx
find src-fixed -type f -name "*.js" -exec grep -l "React" {} \; | while read file; do
  dir=$(dirname "$file")
  base=$(basename "$file" .js)
  mv "$file" "$dir/$base.jsx"
  echo "Renamed $file to $dir/$base.jsx"
done

# Replace imports in all files
find src-fixed -type f -name "*.jsx" -o -name "*.js" | while read file; do
  # Replace import statements that reference .js files
  sed -i 's/from ['"'"'"].\+\.js['"'"'"]/&x/g' "$file"
  echo "Updated imports in $file"
done

# Backup original src directory 
mv src src-original
mv src-fixed src

# Clean installation
rm -rf node_modules
rm -rf dist

echo "Installing dependencies..."
npm install --no-audit --no-fund --legacy-peer-deps

echo "Building the application..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

echo "Build completed!"