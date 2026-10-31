# Security: Never Hardcode Secrets or Credentials

## Core Instruction
Under NO circumstances should any real credentials, API keys, secrets, or tokens be hardcoded in any source code, test files, configs, or markdown.

1. **Environment Variables Only**: All credentials (Razorpay, Stripe, JWT, DB, Cloud) must be read strictly from `process.env`.
2. **No Real Fallbacks**: Never write `process.env.SECRET || 'actual_secret_value'`. Fallback strings for unit tests must only be generic mocks (e.g. `'mock_secret'`, `'dummy_key'`).
3. **Pre-commit Verification**: Before staging or committing, ensure no secret values are exposed.
