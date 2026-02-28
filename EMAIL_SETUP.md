# Email Setup for Parent Consent & Password Reset

Parent consent emails (for under-13 signups) and password reset emails are **not sent** unless you configure an email provider. The app uses [Resend.com](https://resend.com).

## Quick Setup

### 1. Create a Resend account
- Go to [resend.com](https://resend.com) and sign up (free)
- Free tier: 100 emails/day, 3,000/month

### 2. Get your API key
- Go to [resend.com/api-keys](https://resend.com/api-keys)
- Click **Create API Key**
- Copy the key (starts with `re_`)

### 3. Add to your environment
Add to your `.env` and **Railway** (or your hosting provider):

```
RESEND_API_KEY=re_your_api_key_here
```

### 4. Verify your domain (required for production)
To send from `support@vibecodekidz.org`, you must verify your domain:

1. In Resend Dashboard → **Domains** → **Add Domain**
2. Enter `vibecodekidz.org`
3. Add the DNS records Resend provides (MX, TXT, etc.) to your domain registrar
4. Wait for verification (usually a few minutes)

**Without domain verification**, Resend will reject emails sent from `support@vibecodekidz.org`.

### 5. Test
After adding `RESEND_API_KEY` and verifying your domain, redeploy. Try the under-13 signup flow again — the parent should receive the consent email.

---

## Troubleshooting

- **Still no email?** Check your spam folder
- **Resend returns an error?** Check server logs — the error message will indicate if it's a domain verification issue or invalid API key
- **Using a different "from" address?** Update `SUPPORT_EMAIL` in `.env` to match a verified sender in Resend
