#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if environment variables are set
if [ -z "$VITE_REDCAP_API_URL" ] || [ -z "$VITE_REDCAP_API_TOKEN" ]; then
    echo "Error: VITE_REDCAP_API_URL and VITE_REDCAP_API_TOKEN must be set in .env file"
    exit 1
fi

# Test the API connection with a simple metadata request
echo "Testing REDCap API connection..."
echo "URL: $VITE_REDCAP_API_URL"
echo "Token: $VITE_REDCAP_API_TOKEN"

# First try with verbose output to see the full request
echo "Testing with verbose output..."
curl -v -X POST \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "token=$VITE_REDCAP_API_TOKEN" \
    -d "content=metadata" \
    -d "format=json" \
    -d "returnFormat=json" \
    "$VITE_REDCAP_API_URL"

echo -e "\n\nTrying alternative request format..."
curl -X POST \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "token=$VITE_REDCAP_API_TOKEN" \
    -d "content=record" \
    -d "format=json" \
    -d "type=flat" \
    -d "fields=record_id" \
    "$VITE_REDCAP_API_URL" 