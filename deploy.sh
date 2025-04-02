#!/bin/bash

# Exit on error
set -e

# Update system packages
sudo yum update -y

# Install Docker
sudo yum install -y docker

# Start Docker service
sudo service docker start

# Enable Docker to start on boot
sudo chkconfig docker on

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add current user to docker group
sudo usermod -aG docker $USER

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOL
VITE_REDCAP_API_URL=${VITE_REDCAP_API_URL}
VITE_REDCAP_API_TOKEN=${VITE_REDCAP_API_TOKEN}
EOL
fi

# Pull the latest code (assuming it's in a git repository)
# git pull origin main

# Stop existing containers
docker-compose down || true

# Build and start the containers
docker-compose up -d --build

# Wait for the container to be healthy
echo "Waiting for the application to start..."
sleep 10

# Check if the container is running
if docker-compose ps | grep -q "redcap-dashboard.*Up"; then
    echo "Deployment completed successfully!"
    echo "The application is now running on port 80"
else
    echo "Deployment failed. Check the logs with 'docker-compose logs'"
    exit 1
fi 