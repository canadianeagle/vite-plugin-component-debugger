# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported |
| ------- | --------- |
| 2.x.x   | ✅ Yes    |
| 1.x.x   | ✅ Yes    |
| < 1.0   | ❌ No     |

## Reporting a Vulnerability

If you discover a security vulnerability in vite-plugin-component-debugger, please report it to us privately.

### How to Report

1. **Email**: Send details to [hello@tonyebrown.com](mailto:hello@tonyebrown.com)
2. **Subject**: "Security Vulnerability - vite-plugin-component-debugger"
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Your contact information

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Fix Timeline**: Critical issues within 7 days, others within 30 days
- **Disclosure**: Coordinated disclosure after fix is released

### Security Best Practices

This plugin:

- Only runs during development builds
- Does not collect or transmit any data
- Does not expose sensitive information in data attributes
- Uses secure token types for auto-publishing (automation tokens)

### Scope

This security policy covers:

- The plugin source code
- Build and release processes
- Documentation and examples

**Note**: This plugin adds data attributes to DOM elements during development only. No runtime security implications for production builds.
