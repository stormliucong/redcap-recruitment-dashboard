# GitHub Actions Workflows

This directory contains the GitHub Actions workflow configuration for automated deployment of the REDCap Recruitment Dashboard.

## Available Workflows

### deploy.yml

This workflow handles the automated deployment of the application. It includes:

- Node.js environment setup
- Dependency installation
- Build process
- Deployment to the target environment

The workflow is triggered on:
- Push to main branch
- Manual trigger through GitHub Actions interface

For more details about the deployment process, refer to the `deploy.yml` file in this directory. 