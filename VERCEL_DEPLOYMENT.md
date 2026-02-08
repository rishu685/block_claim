# Deploy BlockClaim to Vercel

## Quick Deployment Steps

### 1. Connect to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "New Project" 
3. Import `rishu685/block_claim` repository

### 2. Configure Project Settings
- **Framework Preset**: Other
- **Root Directory**: `./` (keep default)
- **Build Command**: (leave empty - no build needed)
- **Output Directory**: (leave empty)
- **Install Command**: (leave empty - no dependencies)

### 3. Environment Variables (Optional)
No environment variables needed - the app runs with built-in Node.js modules only!

### 4. Deploy
- Click "Deploy" 
- Your app will be live in ~30 seconds at `https://block-claim-[random].vercel.app`

## What Happens During Deployment

1. Vercel reads the `vercel.json` configuration
2. Builds the serverless function from `server/simple.js` 
3. Routes all requests through our Node.js server
4. Serves static files (HTML, CSS, JS) directly
5. Your real-time multiplayer game is live! 🎉

## Key Features After Deployment

✅ **Real-time multiplayer** - Multiple users can play simultaneously  
✅ **Server-Sent Events** - Live updates without external dependencies  
✅ **Responsive design** - Works on desktop and mobile  
✅ **Live leaderboard** - See top players in real-time  
✅ **Conflict resolution** - Prevents double-claiming blocks  
✅ **No database required** - Uses in-memory storage (resets on deployment)  

## Testing Your Live App

Once deployed, test these features:
- Open the Vercel URL in multiple browser tabs/windows
- Claim blocks and see real-time updates across all sessions
- Check the leaderboard updates live
- Try on mobile devices

## Customization Options

You can customize:
- Grid size: Modify `GRID_SIZE` in `server/simple.js`
- Colors: Edit the color palette in `public/js/simple-socket.js`  
- UI: Modify styles in `public/css/style.css`
- Game rules: Update claim logic in `server/simple.js`

---

**Your BlockClaim game is now ready for the world! 🎮**

Share the Vercel URL with friends and watch them compete in real-time!