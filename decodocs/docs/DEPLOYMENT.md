# DecoDocs Deployment Guide

## Overview

This guide provides instructions for deploying the DecoDocs application to production using Firebase Hosting and Firebase Functions. It covers both initial setup and ongoing deployment processes.

## Prerequisites

Before deploying, ensure you have:

- **Firebase CLI installed**: `npm install -g firebase-tools`
- **Firebase project access**: Proper permissions for the `snapsign-au` project
- **Billing enabled**: Required for Firebase Functions deployment
- **Git repository access**: For version control
- **Node.js 18+**: For building the application

## Initial Setup

### 1. Authenticate with Firebase

```bash
firebase login
```

Follow the browser prompts to authenticate with your Google account.

### 2. Verify Project Access

```bash
firebase projects:list
```

Ensure the `snapsign-au` project is listed and accessible.

### 3. Install Dependencies

```bash
# Frontend dependencies
cd decodocs-repo/web
npm install

# Backend dependencies
cd ../functions
npm install
```

## Production Deployment

### Deploying the Full Application

To deploy both frontend and backend simultaneously:

```bash
# From the project root (snapsign-au directory)
firebase deploy
```

### Deploying Individual Components

#### Frontend Only
```bash
firebase deploy --only hosting:decodocs
```

#### Backend Only
```bash
firebase deploy --only functions
```

#### Specific Functions
```bash
firebase deploy --only functions:analyzeDocument
```

## Build Process

### Frontend Build

The frontend uses Create React App and builds to the `build` directory:

```bash
cd decodocs-repo/web
npm run build
```

This creates optimized assets in the `build` directory that are served by Firebase Hosting.

### Backend Build

Firebase Functions handles the build process automatically during deployment. The functions are compiled and packaged from the `functions` directory.

## Configuration

### Firebase Configuration File

The `firebase.json` file in the project root contains the deployment configuration:

```json
{
  "functions": {
    "source": "functions"
  },
  "hosting": [
    {
      "target": "snapsign-au",
      "public": "public",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    },
    {
      "target": "decodocs",
      "public": "decodocs-repo/web/build",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  ]
}
```

### Domain and Redirect Strategy

The DecoDocs web app is hosted on Firebase Hosting under the `decodocs` target, which serves:
- `https://decodocs-site.web.app`
- `https://decodocs-site.firebaseapp.com`

In production, these Firebase domains are **not the primary brand URL**. Instead, they must issue a **permanent redirect (301)** to the canonical domain:

- `https://decodocs.com`

This redirect behavior is configured in `firebase.json` using a `redirects` block under the `decodocs` hosting target, for example:

```json
{
  "hosting": [
    {
      "target": "decodocs",
      "public": "decodocs-repo/web/dist",
      "redirects": [
        {
          "source": "**",
          "destination": "https://decodocs.com",
          "type": 301
        }
      ]
    }
  ]
}
```

Once deployed with:

```bash
firebase deploy --only hosting:decodocs
```

any request to `decodocs-site.web.app` or `decodocs-site.firebaseapp.com` will be permanently redirected to `https://decodocs.com`, while `decodocs.com` itself can be mapped via Firebase Hosting custom domains to the same `decodocs` target.

### Environment Variables

Currently, the application doesn't use environment variables, but they can be configured using Firebase Functions secrets if needed in the future.

## Deployment Process

### Step-by-Step Deployment

1. **Build the frontend**:
   ```bash
   cd decodocs-repo/web
   npm run build
   ```

2. **Verify the build**:
   Test the build locally:
   ```bash
   npx serve -s build
   ```

3. **Deploy to Firebase**:
   ```bash
   cd ../../../  # Back to project root
   firebase deploy
   ```

4. **Verify deployment**:
   - Check the console output for success messages
   - Visit the deployed URLs to confirm functionality
   - Test key features of the application

### Deployment Output

A successful deployment will show output similar to:

```
=== Deploying to 'snapsign-au'...

i  deploying functions, hosting
i  functions: ensuring required API cloudbuild.googleapis.com is enabled...
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
i  hosting[decodocs]: beginning deploy...
i  hosting[decodocs]: found 9 files in decodocs-repo/web/build
i  hosting: uploading new files [0/7] (0%)
i  hosting: uploading new files [7/7] (100%)
i  hosting: finalizing version...
i  functions: preparing functions directory for uploading...
i  functions: packaged functions (34.5 KB) for uploading
i  functions: uploading functions (37.2 KB)
i  functions: creating Node.js 18 function analyzeDocument(us-central1)...
i  functions: creating Node.js 18 function explainSelection(us-central1)...
i  functions: creating Node.js 18 function highlightRisks(us-central1)...
i  functions: creating Node.js 18 function translateToPlainEnglish(us-central1)...
i  functions: creating Node.js 18 function healthCheck(us-central1)...
i  hosting: releasing new version...
i  functions: released additional 5 functions

✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/snapsign-au/overview
Hosting URL: https://decodocs-site.web.app
```

## Post-Deployment Verification

### 1. Check Application Availability

Visit the deployed application:
- **Frontend**: https://decodocs-site.web.app
- **Health Check**: https://[project-id].firebaseapp.com/healthCheck

### 2. Test Key Functionality

- [ ] Homepage loads correctly
- [ ] Document upload works
- [ ] Navigation between routes functions
- [ ] API calls to backend functions succeed
- [ ] Responsive design works on different devices

### 3. Monitor Performance

- Check loading times
- Verify that all assets are loading correctly
- Confirm that analytics (if implemented) are working

## Rollback Procedures

### Rolling Back Frontend

If a deployment introduces issues, you can rollback to a previous version:

```bash
# List hosting versions
firebase hosting:versions:list decodocs-site

# Rollback to a specific version
firebase hosting:clone [VERSION_NAME] decodocs-site
```

### Rolling Back Functions

Function rollbacks require redeploying a previous version of the code:

1. Checkout the previous code version in Git
2. Rebuild and deploy the functions:
   ```bash
   firebase deploy --only functions
   ```

## Monitoring and Maintenance

### Monitoring Deployment Status

- **Firebase Console**: https://console.firebase.google.com
- **Function Logs**: Access logs for each function
- **Usage Reports**: Monitor resource usage and costs

### Routine Maintenance

- [ ] Regular dependency updates
- [ ] Security vulnerability scanning
- [ ] Performance optimization reviews
- [ ] Cost monitoring and optimization

## Common Deployment Issues

### Billing Requirements

**Issue**: Functions deployment fails with billing requirement error.

**Solution**: Upgrade the Firebase project to the Blaze (pay-as-you-go) plan:
1. Go to Firebase Console
2. Navigate to Project Settings
3. Select "Upgrade" under the Blaze plan
4. Complete the billing setup

### Build Failures

**Issue**: Frontend build fails during deployment.

**Solution**:
1. Test the build locally first: `npm run build`
2. Check for dependency conflicts
3. Verify environment variables are properly set

### CORS Issues

**Issue**: Frontend cannot communicate with backend functions.

**Solution**: Verify CORS headers are properly configured in the functions and that the proxy settings are correct.

### DNS Propagation

**Issue**: New deployment not visible immediately.

**Solution**: DNS propagation can take up to 24 hours, but typically resolves within a few hours.

## Continuous Integration/Deployment

### Recommended CI/CD Setup

For automated deployments, consider setting up:

1. **GitHub Actions** or **CircleCI** for automated testing
2. **Automated builds** on pull requests
3. **Staging environment** for pre-production testing
4. **Automated production deployments** after successful tests

### Environment-Specific Configurations

Future enhancements may include:
- Separate staging and production environments
- Environment-specific configuration files
- Automated testing pipelines

## Backup and Recovery

### Configuration Backup

- Store `firebase.json` in version control
- Backup function source code regularly
- Document deployment procedures

### Data Backup

- Currently, no persistent data is stored
- Future implementations will require backup procedures

## Security Considerations

### Deployment Security

- Ensure API keys are properly secured
- Implement authentication for sensitive functions
- Regular security audits of deployed code
- Monitor for unauthorized access attempts

### Access Control

- Limit deployment access to authorized personnel
- Use service accounts for CI/CD deployments
- Regular rotation of deployment credentials

## Cost Management

### Resource Monitoring

- Monitor function execution frequency
- Track bandwidth usage
- Set up billing alerts
- Optimize function performance to reduce costs

### Cost Optimization

- Implement efficient algorithms in functions
- Use appropriate function memory and timeout settings
- Monitor and optimize resource usage