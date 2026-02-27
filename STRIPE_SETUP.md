# Stripe Setup Guide for VibeCode Kidz

## ✅ Done
- Stripe API keys added to `.env` (secret + publishable)
- Setup script created to create products automatically

## 🔲 Remaining Steps

### 1. Create Products & Get Price IDs

**Option A: Run the script (recommended)**

```bash
node scripts/setup-stripe-products.js
```

This creates the Creator ($13/mo) and Pro ($21/mo) products and prints the Price IDs. Copy them into your `.env` file.

**Option B: Manual setup in Stripe Dashboard**

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click **+ Add product**

   **Creator Plan**
   - Name: `VibeCode Kidz Creator`
   - Description: `AI-powered game coding platform for kids ages 7–18. Build real games by describing them in plain English.`
   - Pricing: **Recurring** → $13.00 / month
   - Save → Copy the **Price ID** (starts with `price_`)

   **Pro Plan**
   - Name: `VibeCode Kidz Pro`
   - Same description
   - Pricing: **Recurring** → $21.00 / month
   - Save → Copy the **Price ID**

3. Update your `.env`:
   ```
   STRIPE_CREATOR_PRICE_ID=price_xxxxxxxxxxxxx
   STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxx
   ```

### 2. Set Up Webhook

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. **Endpoint URL**: `https://vibecodekidz.org/api/stripe/webhook`
4. **Events to send**: Select these events:
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add to `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

### 3. Add Keys to Production

Add these variables to your hosting provider (Vercel, Railway, etc.):

- `STRIPE_SECRET_KEY`
- `STRIPE_CREATOR_PRICE_ID`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`

The webhook URL must be your live site URL so Stripe can reach it.

### 4. (Recommended) Regenerate Secret Key

Since your secret key was shared in chat, regenerate it at [Stripe API Keys](https://dashboard.stripe.com/apikeys) and update your `.env` and hosting env vars.

---

## Test the Flow

1. Start your server: `npm run dev:server`
2. Visit your site and try signing up with a Creator or Pro plan
3. Use Stripe test card `4242 4242 4242 4242` if in test mode, or a real card in live mode
