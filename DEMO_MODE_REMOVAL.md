# Demo Mode Removal Guide

When you're ready to remove demo mode, just say: **"Remove all demo mode functionality"**

## Files Modified for Demo Mode

### Frontend Files:

1. **`front-end/src/pages/NewAuctionPage.jsx`**
   - Added `DEMO_ALLOWED_EMAIL` constant
   - Added `isDemo` state
   - Added demo toggle UI (purple box with Switch)
   - Passes `isDemo` to `createAuction()`

2. **`front-end/src/services/api.js`**
   - `createAuction()` accepts `isDemo` parameter
   - Added `getDemoResults()` function

3. **`front-end/src/pages/PublicAuction.jsx`**
   - Added `demoResults` state
   - Added `handleAuctionExpired` callback function
   - Fetches demo results when closed demo auction (on load or when countdown expires)
   - Demo header badge ("🎯 Price Guessing Game")
   - Demo closed view with:
     - Average of comps display
     - Top 3 closest guesses with 🥇🥈🥉 medals
   - Passes `isDemo` prop to `ItemDetailView` and `BidderModal`

4. **`front-end/src/components/auction/ItemDetailView.jsx`**
   - Added `isDemo` prop
   - Demo-specific price card UI
   - Demo bidding form (Submit Guess instead of Bid)
   - Demo validation (no min bid requirement)
   - Demo success/error messages

5. **`front-end/src/components/auction/BidderModal.jsx`**
   - Added `isDemo` prop
   - Hides email field in demo mode (only requires name)
   - Uses placeholder email "demo@estatebid.com" for demo
   - Purple styling and "Start Guessing" button text for demo

6. **`front-end/src/pages/SellerAuctionSettings.jsx`**
   - `ItemsTable` accepts `isDemo` prop
   - Hides pricing columns (Starting Bid, Min Increment, Buy Now) in demo
   - Hides suggested price text in demo
   - Hides Edit button in demo
   - Skips pricing validation on publish for demo

6. **`front-end/src/pages/AuctionDetailPage.jsx`**
   - Passes `isDemo` to `ItemCard`

7. **`front-end/src/components/ItemCard.jsx`**
   - Added `isDemo` prop
   - Hides comps section in demo mode

### Backend Files:

8. **`backend/main.py`**
   - `create_auction()` accepts `is_demo` parameter
   - `place_bid()` skips min bid validation for demo
   - Added `/auctions/{auction_id}/demo-results` endpoint
     - Calculates average of comps as "correct" answer
     - Returns all guesses sorted by closeness
     - Calculates difference from correct answer for each guess

### Database:

9. **Supabase `auctions` table**
   - Added `is_demo boolean DEFAULT false` column

---

## To Remove Demo Mode

Just tell me: **"Remove all demo mode functionality"** and I will:
1. Remove the demo toggle from NewAuctionPage
2. Remove `isDemo` parameters from API calls
3. Remove demo UI from PublicAuction and ItemDetailView
4. Remove demo conditionals from SellerAuctionSettings
5. Remove demo conditionals from ItemCard
6. Remove demo endpoint from backend
7. (You'll need to manually drop the `is_demo` column from Supabase if desired)
