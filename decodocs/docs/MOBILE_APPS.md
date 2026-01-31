# Mobile Apps - Technical Specification

## Overview
This document outlines the technical specifications for the DecoDocs mobile applications, following the Phase 4 roadmap requirements. The goal is to make SnapSign usable at the moment of signing by enabling document access from various sources.

## Core Objectives
- Make SnapSign usable at the moment of signing
- Enable document access from multiple sources
- Run same analysis pipeline as web/email
- Implement Share-to-SnapSign entry point
- Enable viewing explanations before signing elsewhere

## Platform Support
- iOS (Native Swift/Kotlin Multiplatform or React Native)
- Android (Native Kotlin/Java or React Native)

## Core Capabilities

### Document Source Integration

#### Mail Integration
- iOS: MFMailComposeViewController integration
- Android: Intent-based email attachment access
- Direct PDF extraction from email attachments
- Secure temporary file handling

#### File System Access
- iOS: UIDocumentPickerViewController for file selection
- Android: Storage Access Framework (SAF) for document picking
- Support for various file managers
- Direct PDF access from device storage

#### Cloud Storage Integration
- Google Drive SDK integration
- OneDrive SDK integration
- iCloud Drive access (iOS only)
- Dropbox, Box, etc. (future expansion)

### Analysis Pipeline
- Same processing pipeline as web/email versions
- API call to Firebase Functions for AI analysis
- Consistent user experience across platforms
- Shared business logic with web platform

### Share-to-SnapSign Integration

#### iOS Implementation
- Share Extension (Today Widget)
- Handles PDF and .snapsign file types
- Direct analysis initiation from other apps
- Secure data transfer between apps

#### Android Implementation
- Share Intent Receiver
- Content Provider integration
- Support for various MIME types
- Direct processing from other applications

### User Interface
- Native look and feel for each platform
- Consistent functionality with web version
- Touch-optimized interaction patterns
- Offline-capable UI components

## Explicit Non-Goals (v1)

### No On-Device LLM Inference
- All AI processing performed on server
- Leverage existing Firebase Functions infrastructure
- Maintain consistency with web processing
- Reduce device resource requirements

### No Offline Analysis
- Internet connection required for all processing
- Leverage cloud-based AI models
- Maintain processing consistency
- Simplify app architecture

### No Full Document Editing
- View and analysis focus only
- Link to web platform for editing
- Simple annotation capabilities only
- Preserve document integrity

### No Native E-Signature
- Focus on analysis and explanation
- Link to web platform for signing
- Preserve existing signing workflow
- Maintain security model

## Technical Architecture

### Mobile App Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Mobile App    │◄──►│  Network Layer   │◄──►│ Firebase        │
│   (iOS/Android) │    │  (API Client)    │    │ Functions      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Local UI      │    │   Auth Manager   │    │   AI Models     │
│   Components    │    │   (OAuth/Social) │    │   (Gemini)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### API Integration
- REST API client for Firebase Functions
- Secure token management
- Request/response serialization
- Error handling and retry logic

### Data Flow
```
1. User selects document from any source
2. Document processed through Share Extension or main app
3. Secure temporary file created
4. API call to Firebase Functions
5. AI analysis performed
6. Results returned to mobile app
7. Results displayed to user
8. Temporary file cleaned up
```

## Platform-Specific Implementation

### iOS Implementation

#### Required Frameworks
- UIKit/AppKit for UI components
- Foundation for core functionality
- Network framework for API calls
- Security framework for token management

#### Key Features
- Share Extension for universal access
- Document picker for file selection
- Background processing capabilities
- Touch ID/Face ID integration for security

#### App Extensions
- Share Extension for document analysis
- Today Widget for quick access
- Notification Service Extension for results

### Android Implementation

#### Required Components
- Activities and Fragments for UI
- Services for background processing
- Content Providers for file access
- Broadcast Receivers for system events

#### Key Features
- Share Intent for universal access
- Storage Access Framework for document picking
- JobScheduler for background tasks
- Biometric authentication integration

#### App Components
- Main Activity for primary interface
- Share Receiver for document processing
- Background Service for API calls

## Security Considerations

### Data Encryption
- AES-256 encryption for temporary files
- SSL/TLS for all network communications
- Secure key storage using platform APIs
- Encrypted local caching (optional)

### Token Management
- Secure OAuth token storage
- Automatic token refresh
- Session management
- Biometric-protected access

### Privacy Protection
- Minimal data collection
- Local processing where possible
- Clear data retention policies
- User consent management

## Performance Requirements

### Response Times
- UI response: <100ms for user interactions
- API calls: <3 seconds average
- Document processing: <30 seconds for standard PDFs
- App startup: <2 seconds

### Resource Usage
- Memory usage: <100MB idle, <200MB active
- Battery impact: <5% additional drain
- Network usage: Optimized for mobile connections
- Storage: Minimal permanent storage

## User Experience

### Onboarding
- Simple account creation/login
- Cloud storage connection (optional)
- Quick tutorial for core features
- Clear privacy policy explanation

### Core Workflow
```
1. Access document from any source (mail, drive, files, share)
2. Initiate analysis (automatic or manual)
3. View analysis results
4. Access plain-language explanations
5. Decide on signing or further action
```

### Offline Capabilities
- Cached UI components
- Pending analysis queue
- Result history (if Pro)
- Reconnection handling

## Testing Strategy

### Platform Testing
- iOS simulator and physical devices
- Android emulator and physical devices
- Various screen sizes and orientations
- Different OS versions

### Integration Testing
- API integration testing
- Cloud storage connectivity
- Share extension functionality
- Security validation

### Performance Testing
- Network condition simulation
- Memory usage monitoring
- Battery impact assessment
- Startup time optimization

## Deployment Strategy

### App Stores
- Apple App Store submission
- Google Play Store submission
- Beta testing programs
- Regional availability

### Version Management
- Feature flag system for gradual rollout
- A/B testing capabilities
- Crash reporting integration
- Analytics tracking

## Monitoring & Analytics

### App Performance
- Crash rate monitoring
- Performance metric tracking
- User engagement analytics
- Feature usage statistics

### Business Metrics
- Document analysis volume
- User retention tracking
- Conversion from Free to Pro
- Cloud storage integration usage

## Future Expansion

### Additional Platforms
- iPadOS optimization
- Android tablets
- Progressive Web App (PWA) enhancement

### Feature Additions
- More cloud storage providers
- Enhanced annotation tools
- Team collaboration features
- Advanced document comparison

## Technical Requirements

### iOS Minimum Requirements
- iOS 13.0 or later
- Xcode 12.0 or later
- Swift 5.0 or later
- 2GB RAM minimum device requirement

### Android Minimum Requirements
- Android 7.0 (API level 24) or later
- Kotlin 1.4 or Java 8
- 2GB RAM minimum device requirement
- Google Play Services (for Google Drive)

### Dependencies
- Firebase SDK
- Cloud storage provider SDKs
- Networking libraries
- Analytics and crash reporting