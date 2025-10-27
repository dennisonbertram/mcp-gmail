#!/bin/bash
# setup-auth.sh
# Helper script to set up Gmail OAuth authentication

set -e

echo "=== Gmail OAuth 2.0 Setup ==="
echo ""

# Check if credentials.json exists
if [ -f "credentials.json" ]; then
    echo "✓ Found credentials.json"
else
    echo "✗ credentials.json not found"
    echo ""
    echo "Please create OAuth credentials:"
    echo "1. Go to https://console.cloud.google.com/apis/credentials"
    echo "2. Create OAuth 2.0 Client ID (Desktop app)"
    echo "3. Download JSON and save as credentials.json"
    echo ""
    exit 1
fi

# Create .credentials directory if it doesn't exist
mkdir -p .credentials
echo "✓ Created .credentials directory"

# Check if token already exists
if [ -f ".credentials/token.json" ]; then
    echo "✓ Found existing token.json"
    echo ""
    read -p "Token already exists. Delete and re-authenticate? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm .credentials/token.json
        echo "✓ Deleted old token"
    else
        echo "Keeping existing token"
    fi
fi

echo ""
echo "Setup complete! Next steps:"
echo ""
echo "1. Build the project:"
echo "   npm run build"
echo ""
echo "2. Test authentication:"
echo "   node dist/auth/example.js"
echo ""
echo "This will open your browser for Google account authorization."
echo ""
