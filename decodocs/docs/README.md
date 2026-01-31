# DecoDocs Documentation

Welcome to the DecoDocs application documentation. This guide covers the architecture, features, and implementation details of the document analysis and signing platform.

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Frontend Components](#frontend-components)
- [Backend Services](#backend-services)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [Development Setup](#development-setup)
- [Subscription Tiers](#subscription-tiers)
- [Email-to-Sign Flow](#email-to-sign-flow)

## Overview

## Subscription Tiers

For detailed information about subscription tiers and their technical specifications, see [SUBSCRIPTION_TIERS.md](SUBSCRIPTION_TIERS.md).

### Core Concepts
- **PDF Open**: Ephemeral processing without storage
- **PDF Upload**: Persistent storage for paid tiers
- **Tier Structure**: Free, Pro ($5/month), Premium (Business)

### Key Features by Tier
- **Free**: Stateless analysis, text-based PDFs only
- **Pro**: OCR support, persistent storage, export features
- **Premium**: Advanced analysis, multi-document handling, team features

## Email-to-Sign Flow

For detailed technical specifications about the email-to-sign functionality, see [EMAIL_TO_SIGN_FLOW.md](EMAIL_TO_SIGN_FLOW.md).

### Email Processing
- **Free Flow**: Stateless processing with no document storage
- **Pro Flow**: OCR capabilities and persistent storage options
- **Envelope Format**: .snapsign container with integrity verification

## Cloud Integrations

For detailed technical specifications about cloud storage integrations, see [CLOUD_INTEGRATIONS.md](CLOUD_INTEGRATIONS.md).

### Supported Providers
- **Google Drive**: OAuth-based read-only access
- **OneDrive**: Microsoft Graph API integration
- **iCloud Drive**: Browser-based file selection

### Key Principles
- No automatic import
- No background indexing
- No file replication unless explicitly uploaded by Pro users
- Default to ephemeral processing (Open mode)

## Mobile Apps

For detailed technical specifications about mobile applications, see [MOBILE_APPS.md](MOBILE_APPS.md).

### Supported Platforms
- **iOS**: Native application with share extensions
- **Android**: Native application with intent receivers

### Core Capabilities
- Document access from mail, files, and cloud storage
- Same analysis pipeline as web/email versions
- Share-to-SnapSign integration
- No on-device LLM inference (v1)

DecoDocs is a document analysis and signing platform that helps users understand, analyze, and safely act on documents before signing. The application provides AI-powered document analysis with features for understanding complex clauses, identifying risks, and facilitating secure document signing.

## Architecture

The application follows a modern web architecture with:

- **Frontend**: React-based single page application with routing
- **Backend**: Firebase Functions with AI integration
- **AI Engine**: Google's Gemini 2.0 Flash model
- **Hosting**: Firebase Hosting
- **Authentication**: Planned (for future subscription features)

### System Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User         │    │   Frontend       │    │   Backend       │
│   Browser      │◄──►│   (React)        │◄──►│   (Firebase     │
│                │    │                  │    │   Functions)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │    AI Service    │
                       │  (Google Gemini) │
                       └──────────────────┘
```

## Technology Stack

### Frontend
- **React 18**: Component-based UI library
- **React Router**: Client-side routing
- **JavaScript/ES6+**: Modern JavaScript features
- **CSS**: Styling with responsive design

### Backend
- **Firebase Functions**: Serverless functions
- **Google Generative AI SDK**: AI model integration
- **Node.js**: Runtime environment

### Hosting & Infrastructure
- **Firebase Hosting**: Static asset hosting
- **Firebase CLI**: Deployment tooling

## Features

### Document Analysis
- **Document Upload**: Secure PDF document upload
- **AI-Powered Analysis**: Automated document understanding
- **Risk Identification**: Highlight potential issues
- **Plain Language Explanations**: Complex clauses simplified

### Document Viewing
- **PDF Viewer**: Built-in PDF rendering
- **Side-by-Side Analysis**: Document view with analysis tools
- **Navigation**: Easy document browsing

### Document Editing & Signing
- **Signing Tools**: Electronic signature capabilities
- **Annotation**: Document markup features
- **Editing Interface**: Document modification tools

### User Experience
- **Multi-step Workflow**: Guided document processing
- **Responsive Design**: Mobile and desktop compatible
- **Intuitive Interface**: User-friendly design patterns

## Frontend Components

### Main Components
- **App.js**: Main application router and entry point
- **HomePage.js**: Landing page with document upload
- **DocumentViewer.js**: Document analysis and viewing interface
- **DocumentEditor.js**: Document editing and signing interface

### Component Hierarchy
```
App
├── HomePage
│   ├── Hero Section
│   ├── Features Section
│   └── Recent Documents
├── DocumentViewer
│   ├── PDF Display
│   ├── Analysis Tools
│   └── Risk Assessment
└── DocumentEditor
    ├── PDF Editor
    ├── Signing Tools
    └── Annotation Features
```

## Backend Services

### Firebase Functions
Located in `/functions` directory, these serverless functions provide:

- **AI Analysis**: Document understanding and risk assessment
- **Text Processing**: Natural language processing capabilities
- **Data Validation**: Input sanitization and validation

### AI Integration
- **Model**: Gemini 2.0 Flash (efficient inference)
- **API Key**: Secured via Firebase environment
- **Capabilities**: Document summarization, risk detection, plain language conversion

## API Endpoints

### Available Endpoints

#### `POST /api/analyzeDocument`
Analyzes a document and provides comprehensive insights.

**Request Body:**
```json
{
  "documentText": "string",
  "documentType": "string"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "summary": "string",
    "keyPoints": ["string"],
    "risks": [{
      "id": "string",
      "clause": "string",
      "riskLevel": "high|medium|low",
      "description": "string",
      "explanation": "string"
    }],
    "recommendations": ["string"]
  }
}
```

#### `POST /api/explainSelection`
Explains a specific text selection in plain English.

**Request Body:**
```json
{
  "selection": "string",
  "documentContext": "string"
}
```

**Response:**
```json
{
  "success": true,
  "explanation": {
    "originalText": "string",
    "plainExplanation": "string",
    "keyTerms": ["string"],
    "implications": "string"
  }
}
```

#### `POST /api/highlightRisks`
Identifies and highlights risks in a document.

**Request Body:**
```json
{
  "documentText": "string",
  "documentType": "string"
}
```

**Response:**
```json
{
  "success": true,
  "risks": {
    "risks": [{
      "id": "string",
      "text": "string",
      "startPos": "number",
      "endPos": "number",
      "riskLevel": "high|medium|low",
      "category": "financial|legal|operational|other",
      "description": "string",
      "severity": "critical|high|medium|low"
    }],
    "summary": {
      "totalRisks": "number",
      "riskDistribution": {
        "high": "number",
        "medium": "number",
        "low": "number"
      }
    }
  }
}
```

#### `POST /api/translateToPlainEnglish`
Converts legal text to plain English.

**Request Body:**
```json
{
  "legalText": "string"
}
```

**Response:**
```json
{
  "success": true,
  "translation": {
    "originalText": "string",
    "plainEnglishTranslation": "string",
    "keyChanges": ["string"],
    "retainedMeaning": "string"
  }
}
```

#### `GET /api/healthCheck`
Service health monitoring endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "string",
  "service": "string"
}
```

## Deployment

### Production Deployment
The application is deployed using Firebase CLI:

```bash
firebase deploy --only hosting:decodocs
```

### Development Setup
For local development:

```bash
# Frontend
cd web
npm start

# Functions (separately)
cd functions
firebase emulators:start --only functions
```

## Development Setup

### Prerequisites
- Node.js 18+
- Firebase CLI
- Git

### Installation Steps

1. Clone the repository
2. Install frontend dependencies:
   ```bash
   cd web
   npm install
   ```
3. Install functions dependencies:
   ```bash
   cd functions
   npm install
   ```

### Running Locally
```bash
# Terminal 1: Start functions emulator
cd functions
firebase emulators:start --only functions

# Terminal 2: Start frontend
cd web
npm start
```

The application will be available at `http://localhost:3000`.

---

## Project Status

For current status and next steps, see [STATUS_SUMMARY.md](STATUS_SUMMARY.md).

## Roadmap

For the complete phased development roadmap, see [ROADMAP.md](ROADMAP.md).