# Cloud Storage Integrations - Technical Specification

## Overview
This document outlines the technical specifications for integrating cloud storage providers with DecoDocs, following the Phase 2 roadmap requirements.

## Core Principles
- No automatic import
- No background indexing
- No file replication unless user explicitly uploads (Pro)
- Read-only access only
- Default to ephemeral processing (Open mode)

## Google Drive Integration

### Authentication
- OAuth 2.0 flow for user authentication
- Read-only scope: `https://www.googleapis.com/auth/drive.readonly`
- Secure token storage in browser session (not persistent)

### File Access
- User initiates file selection from Drive
- Temporary access token for file download
- Direct processing without intermediate storage
- File access limited to selected document only

### Processing Modes
- Default: **Open mode** (ephemeral processing)
- Pro users: Option to save to DecoDocs storage
- Clear UI indicators for processing mode

### Technical Implementation
```
1. User clicks "Open from Google Drive"
2. OAuth flow initiated
3. User selects PDF file
4. Temporary access token obtained
5. File streamed directly to processing pipeline
6. Results returned without file storage (unless Pro saves)
7. Access token invalidated after processing
```

## OneDrive Integration

### Authentication
- Microsoft Graph API OAuth 2.0
- Read-only scope: `files.read`
- Secure token handling

### File Access
- Similar flow to Google Drive
- Microsoft Graph API for file retrieval
- Direct streaming to processing pipeline

### Consistency
- Same UI/UX patterns as Google Drive
- Unified cloud storage abstraction layer

## iCloud Drive Integration

### Access Method
- Web-based file picker (no direct API)
- User selects file through browser dialog
- Treated as local file upload but sourced from iCloud

### Processing
- Same as local file processing
- No persistent access to iCloud files
- One-time processing only

## Unified Cloud Storage Abstraction

### Interface Design
```javascript
interface CloudStorageProvider {
  authenticate(): Promise<AuthResult>;
  listFiles(filter: FileFilter): Promise<File[]>;
  getFileContent(fileId: string): Promise<Blob>;
  revokeAccess(): Promise<void>;
}
```

### Provider Registration
```javascript
class CloudStorageManager {
  registerProvider(name: string, provider: CloudStorageProvider);
  getProviders(): CloudStorageProvider[];
}
```

## Security & Privacy

### Data Handling
- Files never stored on SnapSign servers in Free tier
- Temporary access tokens with minimal lifespan
- No file indexing or caching
- End-to-end processing only

### Token Management
- OAuth tokens stored securely in browser
- Automatic token refresh
- Clear token invalidation after processing

## User Experience

### UI Indicators
- Clear indication of processing mode (Open vs Upload)
- Visual distinction between cloud and local files
- Pro feature indicators for storage options

### Error Handling
- Network interruption recovery
- Permission denial graceful handling
- Expired token re-authentication

## Cost Management

### Free Tier Restrictions
- Ephemeral processing only
- No file storage on SnapSign servers
- Standard AI call limits applied

### Pro Tier Benefits
- Option to save processed documents
- Extended AI call budgets
- Cloud storage convenience

## Implementation Roadmap

### Phase 1: Google Drive
- OAuth integration
- File selection UI
- Processing pipeline integration
- Security validation

### Phase 2: OneDrive
- Microsoft Graph API integration
- Unified UI components
- Cross-provider testing

### Phase 3: iCloud Drive
- Browser-based integration
- iOS-specific optimizations
- Cross-platform testing

## Compliance & Monitoring

### Audit Trail
- File access logging (without content)
- User consent tracking
- Processing mode recording

### Monitoring
- API call volume tracking
- Error rate monitoring
- User satisfaction metrics

## Technical Requirements

### Frontend
- OAuth popup handling
- File streaming capabilities
- Secure token storage
- Responsive UI components

### Backend
- Temporary file processing pipeline
- OAuth token management
- Provider API integration
- Security validation

### Infrastructure
- SSL/TLS for all connections
- Rate limiting for API calls
- Secure token storage
- Audit logging system
