# HomeScout Browser Extension

Save property listings from Redfin, Zillow, and Realtor.com directly to HomeScout.

## Features

- **Floating "Save to HomeScout" button** on Redfin listing pages
- **Popup interface** to extract and save property data from any supported site
- **One-click save** via deep link to HomeScout app
- **Copy to clipboard** option for manual import

## Supported Sites

- Redfin (full support with floating button)
- Zillow (popup support)
- Realtor.com (popup support)

## Installation (Development)

1. **Add Icons** (required before loading):
   - Create PNG icons at these sizes: 16x16, 32x32, 48x48, 128x128
   - Save them in the `icons/` folder as `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
   - You can use the logo from `/landing/logo.svg` and resize it

2. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select this `browser-extension` folder

3. **Test it**:
   - Go to any Redfin listing page
   - You should see a "Save to HomeScout" button in the bottom-right corner
   - Or click the extension icon in Chrome toolbar

## How It Works

1. Extension extracts property data from the listing page:
   - Address, city, state, zip
   - Price, beds, baths, sqft
   - Lot size, year built
   - MLS number, listing URL

2. Opens HomeScout app via deep link:
   ```
   homescout://add-property?address=...&price=...
   ```

3. HomeScout app receives the data and pre-fills the Add Property form

## Files

- `manifest.json` - Extension configuration
- `popup.html` - Extension popup UI
- `popup.js` - Popup logic and data extraction
- `content-redfin.js` - Content script for Redfin (adds floating button)
- `icons/` - Extension icons (you need to add these)

## Creating Icons

Quick way to create icons from the SVG logo:

```bash
# If you have ImageMagick installed:
convert -background none -resize 16x16 ../landing/logo.svg icons/icon16.png
convert -background none -resize 32x32 ../landing/logo.svg icons/icon32.png
convert -background none -resize 48x48 ../landing/logo.svg icons/icon48.png
convert -background none -resize 128x128 ../landing/logo.svg icons/icon128.png
```

Or use an online tool like https://redketchup.io/icon-converter

## Deep Link Format

The extension sends data to HomeScout using this URL format:

```
homescout://add-property?
  address=123+Main+St&
  city=Austin&
  state=TX&
  zip=78701&
  price=485000&
  beds=3&
  baths=2&
  sqft=1850&
  lot_size=6500&
  year_built=2015&
  source_url=https://redfin.com/...&
  mls_number=ABC123
```

## TODO

- [ ] Add Safari extension support
- [ ] Add direct Supabase sync (skip deep link)
- [ ] Add support for more listing sites
- [ ] Add photo extraction
