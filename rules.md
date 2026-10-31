# Security & Development Rules for AI Agents & Developers

## 1. 🚨 STRICT CREDENTIAL & SECRET PROTECTION (CRITICAL)

### Zero Hardcoded Secrets Policy
- **NEVER** hardcode real API keys, secrets, webhooks, auth tokens, private keys, database URLs, or credentials in any code file, test script, configuration, or markdown document.
- This includes but is not limited to:
  - **Razorpay Key ID & Key Secret** (`RAZOR_PAY_KEY`, `RAZOR_PAY_SECRET`)
  - **JWT Secrets & Access Tokens** (`ACCESS_SECRET`, `REFRESH_SECRET`)
  - **Database Connection Strings** (`MONGODB_URI`, `REDIS_URL`)
  - **Cloud Services & Email Credentials** (`AWS_SECRET`, `NODEMAILER_PASSWORD`, `GEMINI_API_KEY`)

### Proper Environment Variable Usage
- Always access credentials exclusively via environment variables:
  ```javascript
  // ✅ Correct:
  const razorpay = new Razorpay({
      key_id: process.env.RAZOR_PAY_KEY,
      key_secret: process.env.RAZOR_PAY_SECRET,
  });
  ```
- **NEVER use real secrets as fallbacks**:
  ```javascript
  // ❌ STRICTLY FORBIDDEN:
  key_secret: process.env.RAZOR_PAY_SECRET || 'HlNXvhmUJR04lH9PFk0DhSjo' // NEVER DO THIS
  ```
- If an environment variable is required and missing in production or runtime, throw a clear configuration error or return an appropriate error response:
  ```javascript
  if (!process.env.RAZOR_PAY_KEY || !process.env.RAZOR_PAY_SECRET) {
      throw new Error('Razorpay credentials are not configured in environment variables.');
  }
  ```
- In unit/integration test mocks, only use generic dummy placeholders (e.g., `'mock_test_key'`, `'dummy_secret'`).

### Git & Source Control Protection
- All `.env`, `.env.local`, and sensitive credential files must remain in `.gitignore`.
- Before staging any file with `git add`, verify that no sensitive strings or secrets are present in the changes.
