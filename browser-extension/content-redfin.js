// HomeScout Content Script for Redfin
// This script runs automatically on Redfin listing pages

(function() {
  // Check if we're on a property detail page
  const isPropertyPage = window.location.pathname.includes('/home/') ||
                         document.querySelector('.HomeMainStats');

  if (!isPropertyPage) return;

  // Add a floating "Save to HomeScout" button
  function addSaveButton() {
    // Don't add if already exists
    if (document.getElementById('homescout-save-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'homescout-save-btn';
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 120 120" fill="none" style="margin-right: 8px;">
        <circle cx="60" cy="60" r="56" fill="#2563EB"/>
        <path d="M60 25L30 50V85C30 87.2 31.8 89 34 89H50V67C50 64.8 51.8 63 54 63H66C68.2 63 70 64.8 70 67V89H86C88.2 89 90 87.2 90 85V50L60 25Z" fill="white"/>
      </svg>
      Save to HomeScout
    `;

    btn.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 10000;
      display: flex;
      align-items: center;
      padding: 12px 20px;
      background: linear-gradient(135deg, #2563EB, #7C3AED);
      color: white;
      border: none;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
      transition: all 0.2s ease;
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.5)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.4)';
    });

    btn.addEventListener('click', handleSave);

    document.body.appendChild(btn);
  }

  // Extract property data from the page
  function extractPropertyData() {
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
      // If it mentions acres, convert to sqft
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

    // Property type
    const typeText = getText('.propertyType', '[data-rf-test-id="abp-propertyType"]', '[class*="propertyType"]');
    if (typeText) {
      data.property_type = typeText;
    } else {
      const typeMatch = document.body.innerText.match(/(?:property type|home type)[:\s]*(single family|condo|townhouse|multi-family|land|mobile)/i);
      if (typeMatch) data.property_type = typeMatch[1];
    }

    // HOA fees
    const hoaMatch = document.body.innerText.match(/(?:HOA|hoa)[:\s]*\$?([\d,]+)/i);
    if (hoaMatch) {
      data.hoa_fee = parseInt(hoaMatch[1].replace(/,/g, ''));
    }

    // Garage
    const garageMatch = document.body.innerText.match(/(\d+)\s*(?:car|space)?\s*(?:garage|parking)/i);
    if (garageMatch) {
      data.garage_spaces = parseInt(garageMatch[1]);
    }

    // Description
    const descEl = document.querySelector('#marketing-remarks-scroll, .remarks, [class*="remarks"], [class*="description"]');
    if (descEl) {
      data.description = descEl.textContent.trim().substring(0, 1000);
    }

    // Days on market
    const domMatch = document.body.innerText.match(/(\d+)\s*days?\s*(?:on market|on redfin)/i);
    if (domMatch) {
      data.days_on_market = parseInt(domMatch[1]);
    }

    // Price per sqft
    if (data.price && data.sqft) {
      data.price_per_sqft = Math.round(data.price / data.sqft);
    }

    // Log what we found for debugging
    console.log('HomeScout extracted data:', data);

    return data;
  }

  // Handle save button click
  function handleSave() {
    const data = extractPropertyData();

    // Create deep link params
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.set(key, value.toString());
      }
    });

    // Create the Expo Go deep link URL (for simulator testing)
    const expoUrl = `exp://192.168.1.231:8081/--/add-property?${params.toString()}`;
    const command = `xcrun simctl openurl booted "${expoUrl}"`;

    // Copy to clipboard
    navigator.clipboard.writeText(command).then(() => {
      const btn = document.getElementById('homescout-save-btn');
      btn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        Copied! Paste in Terminal
      `;
      btn.style.background = '#22C55E';

      // Reset after 4 seconds
      setTimeout(() => {
        btn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 120 120" fill="none" style="margin-right: 8px;">
            <circle cx="60" cy="60" r="56" fill="#2563EB"/>
            <path d="M60 25L30 50V85C30 87.2 31.8 89 34 89H50V67C50 64.8 51.8 63 54 63H66C68.2 63 70 64.8 70 67V89H86C88.2 89 90 87.2 90 85V50L60 25Z" fill="white"/>
          </svg>
          Save to HomeScout
        `;
        btn.style.background = 'linear-gradient(135deg, #2563EB, #7C3AED)';
      }, 4000);
    }).catch(err => {
      console.error('HomeScout: Error copying to clipboard', err);
      // Fallback: try to open deep link directly (works on real device)
      const deepLink = `homescout://add-property?${params.toString()}`;
      window.location.href = deepLink;
    });
  }

  // Initialize
  // Wait for page to fully load
  if (document.readyState === 'complete') {
    addSaveButton();
  } else {
    window.addEventListener('load', addSaveButton);
  }

  // Also watch for dynamic content changes (Redfin uses SPA)
  const observer = new MutationObserver(() => {
    if (window.location.pathname.includes('/home/')) {
      addSaveButton();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
