// HomeScout Browser Extension - Popup Script

let extractedData = null;
let isLoggedIn = false;
let userEmail = null;

// Show/hide sections
function showSection(sectionId) {
  ['loading', 'login-required', 'not-listing', 'property-found', 'success', 'copied', 'simulator-copied', 'qr-code'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === sectionId ? 'block' : 'none';
  });
}

// Format currency
function formatPrice(price) {
  if (!price) return '$---';
  return '$' + price.toLocaleString();
}

// Check login status
async function checkLoginStatus() {
  if (window.HomeScoutAuth) {
    isLoggedIn = await window.HomeScoutAuth.isLoggedIn();
    if (isLoggedIn) {
      const session = await window.HomeScoutAuth.getSession();
      userEmail = session?.user?.email;
    }
  }
  return isLoggedIn;
}

// Extract data from Redfin page
function extractRedfinData() {
  const data = {
    source: 'redfin',
    source_url: window.location.href,
  };

  // Helper to get text from multiple possible selectors
  const getText = (...selectors) => {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        return el.textContent.trim();
      }
    }
    return null;
  };

  // Helper to extract number from text
  const extractNumber = (text) => {
    if (!text) return null;
    const match = text.replace(/,/g, '').match(/[\d.]+/);
    return match ? parseFloat(match[0]) : null;
  };

  // Price - try multiple selectors
  const priceText = getText(
    '[data-rf-test-id="abp-price"] .statsValue',
    '[data-rf-test-id="abp-price"]',
    '.price .statsValue',
    '.HomeMainStats .stat-block:first-child .statsValue',
    '.price-section .statsValue',
    '.dp-price-row .statsValue',
    '.listingPrice',
    '[class*="price"] [class*="value"]',
    '[class*="Price"]'
  );
  if (priceText) {
    data.price = parseInt(priceText.replace(/[^0-9]/g, ''));
  }

  // If no price found, search all text for price pattern
  if (!data.price) {
    const allText = document.body.innerText;
    const priceMatch = allText.match(/\$[\d,]{6,}/);
    if (priceMatch) {
      data.price = parseInt(priceMatch[0].replace(/[^0-9]/g, ''));
    }
  }

  // Address from URL as fallback
  // URL format: /NJ/Chester/309-North-Rd-07930/home/12345
  const urlParts = window.location.pathname.split('/');
  const urlCity = urlParts[2];
  const urlAddressPart = urlParts[3] || '';
  // Extract zip from address part (e.g., "309-North-Rd-07930" -> "07930")
  const urlZipMatch = urlAddressPart.match(/(\d{5})(?:-\d{4})?$/);
  const urlZip = urlZipMatch ? urlZipMatch[1] : null;
  // Remove zip from address
  const urlAddress = urlAddressPart.replace(/-?\d{5}(?:-\d{4})?$/, '').replace(/-/g, ' ').trim();

  // Address - try multiple selectors
  let streetText = getText(
    '[data-rf-test-id="abp-streetLine"] .street-address',
    '.street-address',
    '.streetAddress',
    '[class*="street-address"]',
    '.homeAddress .street'
  );

  // If address contains comma, take only the street part
  if (streetText && streetText.includes(',')) {
    streetText = streetText.split(',')[0].trim();
  }

  data.address = streetText || (urlAddress ? urlAddress.replace(/-/g, ' ') : null);

  // City, State, Zip
  const cityStateZipText = getText(
    '[data-rf-test-id="abp-cityStateZip"]',
    '.dp-subtext.bp-cityStateZip',
    '.cityStateZip',
    '.homeAddress-cityStateZip'
  );

  if (cityStateZipText) {
    const parts = cityStateZipText.split(',');
    if (parts[0]) data.city = parts[0].trim();
    if (parts[1]) {
      const stateZipMatch = parts[1].trim().match(/([A-Z]{2})\s*(\d{5})?/);
      if (stateZipMatch) {
        data.state = stateZipMatch[1];
        data.zip = stateZipMatch[2] || urlZip;
      }
    }
  } else {
    // Fallback to URL
    if (urlCity) data.city = urlCity.replace(/-/g, ' ');
    data.state = urlParts[1]?.toUpperCase();
    data.zip = urlZip;
  }

  // Ensure zip is set from URL if still missing
  if (!data.zip && urlZip) {
    data.zip = urlZip;
  }

  // Beds, Baths, Sqft - scan all stat blocks
  const statBlocks = document.querySelectorAll('.stat-block, [class*="stat-block"], [class*="HomeInfo"] > div, .home-main-stats > div');
  statBlocks.forEach(stat => {
    const text = stat.textContent.toLowerCase();
    const value = extractNumber(stat.textContent);

    // Skip if value looks like a price (6+ digits)
    if (value && value >= 100000) return;

    if (text.includes('bed') && value && !data.beds) {
      data.beds = Math.floor(value);
    } else if (text.includes('bath') && value && !data.baths) {
      data.baths = value;
    } else if ((text.includes('sq ft') || text.includes('sqft') || text.includes('sq. ft')) && value && !data.sqft) {
      data.sqft = Math.floor(value);
    }
  });

  // Additional search for beds/baths/sqft in page text
  if (!data.beds || !data.baths || !data.sqft) {
    const pageText = document.body.innerText;

    if (!data.beds) {
      const bedMatch = pageText.match(/(\d+)\s*(?:beds?|bedrooms?|bd)/i);
      if (bedMatch) data.beds = parseInt(bedMatch[1]);
    }
    if (!data.baths) {
      const bathMatch = pageText.match(/(\d+\.?\d*)\s*(?:baths?|bathrooms?|ba)/i);
      if (bathMatch) data.baths = parseFloat(bathMatch[1]);
    }
    if (!data.sqft) {
      // Match sqft - must be followed by sq ft/sqft and NOT be a price (look for reasonable sqft range)
      const sqftMatch = pageText.match(/([\d,]{1,5})\s*(?:sq\.?\s*ft|sqft|square feet)/i);
      if (sqftMatch) {
        const sqftValue = parseInt(sqftMatch[1].replace(/,/g, ''));
        // Reasonable sqft is typically 500-20000
        if (sqftValue >= 500 && sqftValue <= 20000) {
          data.sqft = sqftValue;
        }
      }
    }
  }

  // Year built - search key details and page text
  const keyDetailsText = Array.from(document.querySelectorAll('.keyDetail, .amenity-text, [class*="keyDetail"], [class*="fact"]'))
    .map(el => el.textContent).join(' ');

  const yearMatch = keyDetailsText.match(/(?:built|year built)[:\s]*(\d{4})/i) ||
                    document.body.innerText.match(/(?:built in|year built)[:\s]*(\d{4})/i);
  if (yearMatch) data.year_built = parseInt(yearMatch[1]);

  // Lot size
  const lotMatch = keyDetailsText.match(/(?:lot|land)[:\s]*([\d,.]+)\s*(?:sq|acre|sf)/i) ||
                   document.body.innerText.match(/(?:lot size|land area)[:\s]*([\d,.]+)\s*(?:sq|acre|sf)/i);
  if (lotMatch) {
    const lotValue = parseFloat(lotMatch[1].replace(/,/g, ''));
    if (lotMatch[0].toLowerCase().includes('acre')) {
      data.lot_size = Math.round(lotValue * 43560);
    } else {
      data.lot_size = Math.round(lotValue);
    }
  }

  // MLS number
  const mlsText = getText('[data-rf-test-id="abp-sourceId"]', '.sourceId', '[class*="mls"]');
  if (mlsText) {
    data.mls_number = mlsText.replace(/[^a-zA-Z0-9]/g, '');
  } else {
    const mlsMatch = document.body.innerText.match(/(?:MLS|Listing)\s*#?\s*:?\s*([A-Z0-9-]+)/i);
    if (mlsMatch) data.mls_number = mlsMatch[1];
  }

  // Price per sqft
  if (data.price && data.sqft) {
    data.price_per_sqft = Math.round(data.price / data.sqft);
  }

  console.log('HomeScout extracted data:', data);
  return data;
}

// Extract data from Zillow page
function extractZillowData() {
  // Simplified - same pattern as Redfin
  return { source: 'zillow', source_url: window.location.href };
}

// Extract data from Realtor.com page
function extractRealtorData() {
  // Simplified - same pattern as Redfin
  return { source: 'realtor', source_url: window.location.href };
}

// Main extraction function that runs in page context
function extractPropertyData() {
  const url = window.location.href;

  if (url.includes('redfin.com')) {
    return extractRedfinData();
  } else if (url.includes('zillow.com')) {
    return extractZillowData();
  } else if (url.includes('realtor.com')) {
    return extractRealtorData();
  }

  return null;
}

// Build deep link URL
function buildDeepLink(data) {
  const params = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params.set(key, value.toString());
    }
  });
  return `homescout://add-property?${params.toString()}`;
}

// Update UI with user badge
function updateUserBadge() {
  const existingBadge = document.querySelector('.user-badge');
  if (existingBadge) existingBadge.remove();

  if (isLoggedIn && userEmail) {
    const badge = document.createElement('div');
    badge.className = 'user-badge';
    badge.innerHTML = `
      <span>Signed in as ${userEmail}</span>
      <button id="logout-btn">Sign out</button>
    `;
    document.querySelector('.content').prepend(badge);

    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      await window.HomeScoutAuth.signOut();
      isLoggedIn = false;
      userEmail = null;
      updateUserBadge();
      init();
    });
  }
}

// Initialize popup
async function init() {
  showSection('loading');

  // Check login status first
  await checkLoginStatus();
  updateUserBadge();

  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if it's a supported site
    const url = tab.url || '';
    const isSupported = url.includes('redfin.com') ||
                        url.includes('zillow.com') ||
                        url.includes('realtor.com');

    if (!isSupported) {
      showSection('not-listing');
      return;
    }

    // Inject and execute extraction script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPropertyData,
    });

    const data = results[0]?.result;

    if (!data || (!data.address && !data.price)) {
      showSection('not-listing');
      return;
    }

    // Store extracted data
    extractedData = data;

    // Update UI
    document.getElementById('property-address').textContent =
      [data.address, data.city, data.state, data.zip].filter(Boolean).join(', ') || 'Address not found';
    document.getElementById('property-price').textContent = formatPrice(data.price);
    document.getElementById('property-beds').textContent = data.beds ? `${data.beds} beds` : '-- beds';
    document.getElementById('property-baths').textContent = data.baths ? `${data.baths} baths` : '-- baths';
    document.getElementById('property-sqft').textContent = data.sqft ? `${data.sqft.toLocaleString()} sqft` : '-- sqft';

    // Update save button text based on login status
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
      if (isLoggedIn) {
        saveBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
          </svg>
          Save to HomeScout
        `;
      } else {
        saveBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
          </svg>
          Save to HomeScout (sign in required)
        `;
      }
    }

    showSection('property-found');

  } catch (error) {
    console.error('Error extracting data:', error);
    showSection('not-listing');
  }
}

// Save to HomeScout - either direct to Supabase or show login
document.getElementById('save-btn')?.addEventListener('click', async () => {
  if (!extractedData) return;

  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading"></span> Saving...';

  if (isLoggedIn && window.HomeScoutAuth) {
    // Direct save to Supabase
    try {
      const result = await window.HomeScoutAuth.saveProperty(extractedData);

      if (result.error) {
        alert('Error saving: ' + result.error);
        btn.disabled = false;
        btn.innerHTML = 'Save to HomeScout';
        return;
      }

      showSection('success');
      document.querySelector('#success .status-message').textContent =
        'Property saved! Open HomeScout on your phone to see it.';
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving property');
      btn.disabled = false;
      btn.innerHTML = 'Save to HomeScout';
    }
  } else {
    // Show login form
    btn.disabled = false;
    btn.innerHTML = 'Save to HomeScout';
    showSection('login-required');
  }
});

// Login handler
document.getElementById('login-btn')?.addEventListener('click', async () => {
  const email = document.getElementById('login-email')?.value;
  const password = document.getElementById('login-password')?.value;
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  if (!email || !password) {
    errorEl.textContent = 'Please enter email and password';
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="loading"></span> Signing in...';
  errorEl.style.display = 'none';

  if (window.HomeScoutAuth) {
    const result = await window.HomeScoutAuth.signIn(email, password);

    if (result.error) {
      errorEl.textContent = result.error;
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = 'Sign In';
      return;
    }

    // Success - save property and show success
    isLoggedIn = true;
    userEmail = email;
    updateUserBadge();

    // Now save the property
    const saveResult = await window.HomeScoutAuth.saveProperty(extractedData);

    if (saveResult.error) {
      errorEl.textContent = saveResult.error;
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = 'Sign In';
      return;
    }

    showSection('success');
    document.querySelector('#success .status-message').textContent =
      'Signed in and property saved! Open HomeScout on your phone to see it.';
  } else {
    errorEl.textContent = 'Auth not available';
    errorEl.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = 'Sign In';
  }
});

// Copy JSON to clipboard
document.getElementById('copy-btn')?.addEventListener('click', async () => {
  if (!extractedData) return;

  try {
    await navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2));
    showSection('copied');
  } catch (error) {
    console.error('Error copying:', error);
  }
});

// Copy simulator command to clipboard
document.getElementById('copy-simulator-btn')?.addEventListener('click', async () => {
  if (!extractedData) return;

  try {
    const params = new URLSearchParams();
    Object.entries(extractedData).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.set(key, value.toString());
      }
    });

    const expoUrl = `exp://192.168.1.231:8081/--/add-property?${params.toString()}`;
    const command = `xcrun simctl openurl booted "${expoUrl}"`;

    await navigator.clipboard.writeText(command);
    showSection('simulator-copied');
  } catch (error) {
    console.error('Error copying simulator command:', error);
  }
});

// Show QR Code
document.getElementById('show-qr-btn')?.addEventListener('click', () => {
  if (!extractedData) return;

  showSection('qr-code');

  // Generate QR code with deep link
  const deepLink = buildDeepLink(extractedData);
  const canvas = document.getElementById('qr-canvas');

  if (canvas && window.createQRCode) {
    window.createQRCode(deepLink, canvas, 200);
  }
});

// Back from QR
document.getElementById('back-btn')?.addEventListener('click', () => {
  showSection('property-found');
});

// Initialize
init();
