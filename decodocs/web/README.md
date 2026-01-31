# DecoDocs - Document Analysis Platform

DecoDocs is an AI-powered document analysis and signing platform that helps users understand, analyze, and safely act on documents before signing.

## Overview

This application provides:
- **Document Analysis**: AI-powered analysis of contracts and agreements
- **Risk Identification**: Automatic detection of potential risks
- **Plain Language Explanations**: Complex clauses simplified in plain English
- **Document Signing**: Secure electronic signing capabilities
- **Multi-step Workflow**: Guided process from document upload to signing

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run test:unit`

Runs only the unit tests in the src/__tests__ directory.

### `npm run test:e2e`

Runs the end-to-end tests using Playwright.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

## Architecture

This application follows a modern React architecture with:

- **React 18**: Component-based UI library
- **React Router**: Client-side routing for multi-view application
- **Firebase Functions**: Serverless backend for AI processing
- **Google Generative AI**: AI-powered document analysis
- **Google Identity Services (GIS)**: Google sign-in and OAuth token handling for the web app

## Features

### Document Analysis
- PDF upload and viewing
- AI-powered document understanding
- Risk identification and classification
- Plain language explanations
- Key points extraction

### User Interface
- Responsive design for desktop and mobile
- Multi-step workflow for document processing
- Clean, intuitive user experience
- Real-time document analysis

## API Integration

The application connects to Firebase Functions for AI processing:
- Document analysis
- Risk identification
- Plain language conversion
- Text explanation

## Development

For detailed development information, see the documentation in the `/docs` directory:
- [Development Guide](../docs/DEVELOPMENT.md)
- [Architecture](../docs/ARCHITECTURE.md)
- [API Documentation](../docs/API.md)
- [Deployment Guide](../docs/DEPLOYMENT.md)

## Deployment

The application is deployed to Firebase Hosting at: https://decodocs-site.web.app

## Technologies Used

- React 18
- React Router 6
- Firebase Functions
- Google Generative AI SDK
- CSS3
- JavaScript ES6+
- Jest & React Testing Library
- Playwright (for E2E tests)

## Contributing

Please read the [Development Guide](../docs/DEVELOPMENT.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is proprietary to Snap Sign Pty Ltd.
