# REDCap Recruitment Dashboard

A dynamic dashboard for visualizing and tracking recruitment progress in REDCap projects. Features include distribution analysis, cumulative progress tracking, and projection capabilities.

## Features

- Real-time visualization of recruitment data
- Distribution analysis by various demographic factors
- Cumulative progress tracking with projections
- Configurable field mappings
- Responsive design for all screen sizes
- Support for multiple timestamp fields
- Value mapping capabilities for group fields

## Prerequisites

- Node.js 18.x or higher
- npm 8.x or higher
- Access to a REDCap API
- AWS Account (for deployment)

## Local Development

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd redcap-recruitment-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## AWS Deployment Guide

### 1. Setting up AWS EC2 Instance

1. Launch an EC2 instance:
   - Choose Amazon Linux 2 AMI
   - Select t2.micro (free tier) or larger
   - Configure Security Group:
     - Allow SSH (Port 22) from your IP
     - Allow HTTP (Port 80) from anywhere
     - Allow HTTPS (Port 443) from anywhere
     - Allow Custom TCP (Port 3000) from anywhere

2. Connect to your instance:
   ```bash
   ssh -i your-key.pem ec2-user@your-instance-ip
   ```

### 2. Deploying the Application

1. Copy files to the EC2 instance:
   ```bash
   scp -i your-key.pem -r ./redcap-recruitment-dashboard ec2-user@your-instance-ip:~
   ```

2. SSH into the instance:
   ```bash
   ssh -i your-key.pem ec2-user@your-instance-ip
   ```

3. Navigate to the project directory:
   ```bash
   cd redcap-recruitment-dashboard
   ```

4. Make the deployment script executable:
   ```bash
   chmod +x deploy.sh
   ```

5. Run the deployment script:
   ```bash
   ./deploy.sh
   ```

### 3. Post-Deployment Steps

1. Configure Nginx (optional, for domain routing):
   ```bash
   sudo yum install nginx
   sudo systemctl start nginx
   sudo systemctl enable nginx
   ```

2. Set up SSL with Let's Encrypt (recommended for production):
   ```bash
   sudo yum install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

3. Monitor the application:
   ```bash
   docker-compose logs -f
   ```

### 4. Updating the Application

1. Pull the latest changes:
   ```bash
   git pull origin main
   ```

2. Rebuild and restart the containers:
   ```bash
   docker-compose up -d --build
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
REACT_APP_REDCAP_API_URL=your-redcap-api-url
NODE_ENV=production
```

## Security Considerations

1. Never commit sensitive information (API tokens, credentials) to the repository
2. Use environment variables for configuration
3. Implement proper access controls
4. Regularly update dependencies
5. Monitor server logs for suspicious activities

## Troubleshooting

1. If the application isn't accessible:
   - Check if the container is running: `docker ps`
   - View container logs: `docker-compose logs`
   - Verify security group settings in AWS

2. If you encounter permission issues:
   - Ensure proper file permissions
   - Check Docker group membership
   - Verify AWS security group settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
