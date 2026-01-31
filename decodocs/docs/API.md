# DecoDocs API Documentation

## Overview

The DecoDocs API provides AI-powered document analysis services through Firebase Functions. All endpoints follow REST principles and return JSON responses.

## Base URL

Production: `https://[PROJECT-ID].firebaseapp.com`
Development: `http://localhost:5001/[PROJECT-ID]/us-central1`

## Authentication

Currently, all endpoints are publicly accessible. Authentication will be implemented in future versions for enhanced security and user management.

## Common Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "timestamp": "2025-01-28T10:00:00Z"
}
```

For errors:

```json
{
  "success": false,
  "data": null,
  "error": "Error message",
  "details": "Additional error details",
  "timestamp": "2025-01-28T10:00:00Z"
}
```

## Endpoints

### Document Analysis

#### `POST /analyzeDocument`

Analyzes a document and provides comprehensive insights including summary, key points, risks, and recommendations.

##### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| documentText | string | Yes | The full text content of the document to analyze |
| documentType | string | No | Type of document (default: "general") |

##### Request Example

```json
{
  "documentText": "This agreement contains various terms and conditions...",
  "documentType": "contract"
}
```

##### Response Example

```json
{
  "success": true,
  "analysis": {
    "summary": "This is a sample document containing various clauses and terms that require careful review before signing.",
    "keyPoints": [
      "Clause 1: Payment terms require payment within 30 days",
      "Clause 2: Termination clause allows termination with 30 days notice",
      "Clause 3: Limitation of liability clause limits damages"
    ],
    "risks": [
      {
        "id": 1,
        "clause": "Limitation of liability clause",
        "riskLevel": "high",
        "description": "This clause significantly limits the liability of the other party, potentially leaving you exposed to significant losses.",
        "explanation": "In plain language: If something goes wrong and causes you financial harm, you may not be able to recover your full losses because of this clause."
      }
    ],
    "recommendations": [
      "Consider negotiating broader liability coverage",
      "Request shorter automatic renewal periods or removal of automatic renewal"
    ]
  }
}
```

##### Error Responses

- `400 Bad Request`: Missing required parameters
- `500 Internal Server Error`: AI processing failure

---

### Text Explanation

#### `POST /explainSelection`

Provides plain English explanations for specific text selections within a document context.

##### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| selection | string | Yes | The specific text to explain |
| documentContext | string | No | Surrounding document context for better understanding |

##### Request Example

```json
{
  "selection": "Limitation of liability clause",
  "documentContext": "This is a contract with standard terms and conditions."
}
```

##### Response Example

```json
{
  "success": true,
  "explanation": {
    "originalText": "The limitation of liability clause",
    "plainExplanation": "This part of the contract restricts how much money one party can claim from the other if something goes wrong.",
    "keyTerms": [
      "Liability: Legal responsibility for damages",
      "Limitation: Restriction or cap"
    ],
    "implications": "If issues arise, your ability to seek compensation may be significantly restricted."
  }
}
```

##### Error Responses

- `400 Bad Request`: Missing required parameters
- `500 Internal Server Error`: AI processing failure

---

### Risk Highlighting

#### `POST /highlightRisks`

Identifies and locates potential risks within a document.

##### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| documentText | string | Yes | The full text content of the document to analyze |
| documentType | string | No | Type of document (default: "general") |

##### Request Example

```json
{
  "documentText": "This agreement contains various terms and conditions...",
  "documentType": "contract"
}
```

##### Response Example

```json
{
  "success": true,
  "risks": {
    "risks": [
      {
        "id": "risk-1",
        "text": "The limitation of liability clause restricts damages",
        "startPos": 150,
        "endPos": 200,
        "riskLevel": "high",
        "category": "financial",
        "description": "Limits the amount of damages that can be claimed",
        "severity": "high"
      }
    ],
    "summary": {
      "totalRisks": 1,
      "riskDistribution": {
        "high": 1,
        "medium": 0,
        "low": 0
      }
    }
  }
}
```

##### Error Responses

- `400 Bad Request`: Missing required parameters
- `500 Internal Server Error`: AI processing failure

---

### Plain English Translation

#### `POST /translateToPlainEnglish`

Converts complex legal text into plain English while preserving legal meaning.

##### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| legalText | string | Yes | The legal text to translate to plain English |

##### Request Example

```json
{
  "legalText": "This Agreement shall commence on the Effective Date and shall continue in full force and effect until terminated in accordance with the provisions hereof."
}
```

##### Response Example

```json
{
  "success": true,
  "translation": {
    "originalText": "This Agreement shall commence on the Effective Date and shall continue in full force and effect until terminated in accordance with the provisions hereof.",
    "plainEnglishTranslation": "This contract starts on the effective date and stays in effect until it's ended according to the terms described in this document.",
    "keyChanges": [
      "Simplified formal legal language",
      "Converted archaic phrasing to modern English"
    ],
    "retainedMeaning": "The legal obligation and effective date concept are preserved"
  }
}
```

##### Error Responses

- `400 Bad Request`: Missing required parameters
- `500 Internal Server Error`: AI processing failure

---

### Health Check

#### `GET /healthCheck`

Monitors the health and availability of the API service.

##### Response Example

```json
{
  "status": "ok",
  "timestamp": "2025-01-28T10:00:00Z",
  "service": "DecoDocs AI Analysis Service"
}
```

##### Error Responses

- `503 Service Unavailable`: Service is down

## Rate Limits

Currently, no rate limiting is enforced. This will be implemented in future versions based on usage patterns.

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 404 | Not Found | Endpoint does not exist |
| 405 | Method Not Allowed | HTTP method not supported |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Service is temporarily down |

## Usage Guidelines

### Best Practices

1. **Input Validation**: Always validate input before sending to the API
2. **Error Handling**: Implement robust error handling for all API calls
3. **Retry Logic**: Implement exponential backoff for failed requests
4. **Caching**: Cache responses when appropriate to reduce API calls
5. **Security**: Sanitize all inputs to prevent injection attacks

### Performance Tips

1. **Batch Requests**: Combine multiple operations when possible
2. **Efficient Payloads**: Send only necessary data
3. **Connection Reuse**: Reuse connections for multiple requests
4. **Response Parsing**: Parse responses efficiently

## Versioning

The API currently has no versioning scheme. Future versions will follow semantic versioning principles with version prefixes (e.g., `/v1/analyzeDocument`).