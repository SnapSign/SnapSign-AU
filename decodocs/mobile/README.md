# MOBILE.md

DecoDocs mobile apps start as **native WebView wrappers** around the web product.

Goal: ship mobile presence early, validate UX and workflows, and only go deeper native once we have real usage signals.

---

## Strategy

### Phase 1 (MVP): Native shell + WebView
- iOS: Swift + WKWebView
- Android: Kotlin + WebView
- App loads `https://decodocs.com` as the primary UI.

### Phase 2 (Selective native features)
Only after product-market signals:
- push notifications (reminders)
- share sheet / “Open in DecoDocs”
- optional biometric lock
- scan-to-PDF
- background uploads
- performance-sensitive PDF rendering/annotation improvements

---

## Non-negotiable Requirements

### 1) Web app must be WebView-ready
- Responsive layout (mobile-first for key screens)
- No hover-only interactions
- Stable routing (deep links like `/doc/{id}`)
- Safe area support (iOS notch), keyboard handling
- Works without relying on third-party cookies quirks

### 2) Security
- No secrets in the client.
- Auth and permissions are enforced server-side.
- File storage access uses short-lived signed URLs (server-generated).

### 3) Uploads must work on mobile
This is the most common WebView failure point. We must support:
- selecting PDFs from iOS Files / Android Documents
- uploading via pre-signed PUT URLs
- progress UI + retries

If upload reliability is weak, we add a minimal native bridge later (still Phase 1).

### 4) PDF rendering performance
Mobile WebViews can choke on large PDFs.
Mitigations:
- page-based rendering (lazy load)
- avoid rendering entire document at once
- memory bounded caches
- keep annotation overlays lightweight

---

## WebView Wrapper Requirements

### Common (iOS + Android)
- Use `https://decodocs.com` as base URL (configurable for staging)
- Enable JavaScript (required)
- Support deep links into the app:
  - `decodocs://doc/{id}` or universal/app links -> open `/doc/{id}`
- Allow file input (`<input type="file">`) for PDF uploads
- Provide minimal UX:
  - back navigation
  - pull-to-refresh (optional)
  - network offline message

### iOS (WKWebView)
- Use `WKWebView` with a persistent data store (default)
- Support file picker via standard WKWebView behavior
- Handle:
  - safe area insets
  - keyboard pushing content
- Optional later:
  - FaceID/TouchID “app lock”
  - share extension “Open in DecoDocs”

### Android (WebView)
- Enable:
  - `setJavaScriptEnabled(true)`
  - file chooser support via `WebChromeClient`
- Handle downloads / file pickers cleanly
- Optional later:
  - share intent filter for PDFs
  - notification channels for reminders

---

## Must-pass Test Scenarios (Phase 1)

1) **Login**
- Sign in and remain signed in after app restart.

2) **Upload + Decode**
- Pick a PDF from device storage.
- Upload succeeds.
- Decode job starts and results display in the doc UI.

3) **Open Shared Link**
- Tap a doc link from email or messenger.
- App opens the correct document screen.

4) **Annotate**
- Add highlights/notes.
- Navigate away and return.
- Changes persist.

5) **Large PDF**
- Open a large PDF (e.g., 20–50 pages).
- App remains usable (no crash, acceptable performance).

---

## Migration Trigger: When to add real native screens

We move beyond wrapper only when at least one is true:
- PDF performance is unacceptable in WebView
- Upload reliability is inconsistent across devices
- Users demand offline reading
- Camera scan to PDF becomes core
- Push notifications become critical for retention

Until then: keep mobile thin.

---
If you change the mobile strategy, update this file first.
