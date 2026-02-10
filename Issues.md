## Known issues and technical debt

### IMPLEMENTATION STATUS (as of Feb 10, 2026)


---

### 1. Fix the bugs on decodocs.com home page
  - Buttons are not consistent: corner radius is different for different buttons, also slightly different hight
  - Price hould not be on home page - there is a dedicated page for that
  - Need to have a clear CTA on home page - what should user do?
  - Need to have a clear value proposition on home page - what should user do?
  - Need to have integration section, it should have a similar design to the one yo ucan find on the home page of eesel.ai
  - Use cases needs also to be nicer and again check eesel.ai for the inspiration
  - Let's have "Secure by design" section same like eesel intead of that useless and weak FAQ section.

#### 2. Redesing the /view page
  - Let's make its UI/UX to follow patterns of smallpdf.com (see  in Decodocs/docs/screenshots/smallpdf-view-page.png)

### 3. PDF edit and sign fix
  - Follow the UI/UX of smallpdf.com (see  in Decodocs/docs/screenshots/smallpdf-sign1.png and Decodocs/docs/screenshots/smallpdf-sign2.png )


### 4. Update documentation to reflect current project state
(Pending)

### 6. 🤖 MCP Integration (High Feature Value)
Task: detailed in TODO.md as "Make DecoDocs available via MCP".
Why: Allows AI agents (like Cursor/Claude) to use DecoDocs to analyze local files. This is a forward-looking feature.

### 7. 🔐 Auth & Account Features
Task: Implement Account Linking (Anonymous → Email/Google) or add Microsoft/Apple Sign-in.
Why: Improves user retention, but might require API keys/credentials I don't have access to.

---

## Summary / action items

1.  **Update documentation** to reflect the latest changes (Refactoring, Tests).
2.  **Proceed with MCP Integration** or **Auth Features** as next priority.
