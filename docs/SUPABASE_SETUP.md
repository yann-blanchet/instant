# Supabase Setup Guide

## Step 1: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (or create a new one)
3. Go to **Settings** → **API**
4. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

## Step 2: Create Environment File

1. Create a `.env` file in the root of your project (same level as `package.json`)
2. Add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: Replace the placeholder values with your actual Supabase credentials.

## Step 3: Restart Development Server

After creating/updating the `.env` file:

1. Stop your development server (Ctrl+C)
2. Start it again: `npm run dev`

Vite will load the environment variables on startup.

## Step 4: Verify Setup

1. Open your app in the browser
2. Go to **Settings**
3. You should see "Sync is automatic" instead of "Supabase not configured"
4. The sync should work automatically

## Troubleshooting

### "Supabase not configured" error

- ✅ Check that `.env` file exists in the project root
- ✅ Check that variable names are exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- ✅ Check that values don't have quotes around them
- ✅ Restart your dev server after creating/updating `.env`
- ✅ Check browser console for any errors

### Environment variables not loading

- Make sure the file is named exactly `.env` (not `.env.local` or `.env.development`)
- Vite only loads variables prefixed with `VITE_`
- Restart the dev server after changes

### Where to find Supabase credentials

1. **Project URL**: 
   - Settings → API → Project URL
   - Format: `https://xxxxxxxxxxxxx.supabase.co`

2. **Anon Key**:
   - Settings → API → Project API keys
   - Use the `anon` `public` key (not the `service_role` key)

## Security Note

- The `.env` file is automatically ignored by git (see `.gitignore`)
- Never commit your `.env` file to version control
- The `anon` key is safe to use in client-side code (it's public)
- For production, set these as environment variables in your hosting platform
