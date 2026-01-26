// HomeScout Browser Extension - Supabase Integration
// This allows the extension to save properties directly to the database

const SUPABASE_URL = 'https://zqesezyxcsedtexpvyfq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxZXNlenl4Y3NlZHRleHB2eWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDI4MTEsImV4cCI6MjA4MzAxODgxMX0.-aYLgU6Ag3sFydd9sNso6y778eci5Jh3lbbvLoKMif0';

// Storage keys
const STORAGE_KEY = 'homescout_session';

// Get stored session
async function getSession() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || null);
    });
  });
}

// Store session
async function setSession(session) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: session }, resolve);
  });
}

// Clear session
async function clearSession() {
  return new Promise((resolve) => {
    chrome.storage.local.remove([STORAGE_KEY], resolve);
  });
}

// Sign in with email/password
async function signIn(email, password) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.error) {
      return { error: data.error.message || data.error };
    }

    // Get user's household
    const userResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${data.user.id}&select=*,households(*)`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${data.access_token}`,
      },
    });

    const userData = await userResponse.json();
    const user = userData[0];
    const household = user?.households?.[0] || null;

    const session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user,
      household_id: household?.id,
    };

    await setSession(session);
    return { session };
  } catch (error) {
    return { error: error.message };
  }
}

// Sign out
async function signOut() {
  await clearSession();
}

// Check if logged in
async function isLoggedIn() {
  const session = await getSession();
  return !!session?.access_token;
}

// Save property to database
async function saveProperty(propertyData) {
  const session = await getSession();

  if (!session) {
    return { error: 'Not logged in' };
  }

  try {
    // Prepare property data for database
    const property = {
      household_id: session.household_id,
      created_by: session.user.id,
      address: propertyData.address,
      city: propertyData.city,
      state: propertyData.state,
      zip: propertyData.zip,
      price: parseInt(propertyData.price) || 0,
      beds: parseInt(propertyData.beds) || 0,
      baths: parseFloat(propertyData.baths) || 0,
      sqft: parseInt(propertyData.sqft) || 0,
      lot_size: propertyData.lot_size ? parseInt(propertyData.lot_size) : null,
      year_built: propertyData.year_built ? parseInt(propertyData.year_built) : null,
      garage: propertyData.garage_spaces ? parseInt(propertyData.garage_spaces) : null,
      hoa_monthly: propertyData.hoa_fee ? parseInt(propertyData.hoa_fee) : null,
      source_url: propertyData.source_url,
      mls_number: propertyData.mls_number,
      status: 'interested',
      // Extended data
      remarks: propertyData.description,
      property_type: propertyData.property_type,
      days_on_market: propertyData.days_on_market ? parseInt(propertyData.days_on_market) : null,
      price_per_sqft: propertyData.price_per_sqft ? parseInt(propertyData.price_per_sqft) : null,
    };

    // Remove null/undefined values
    Object.keys(property).forEach(key => {
      if (property[key] === null || property[key] === undefined || property[key] === '') {
        delete property[key];
      }
    });

    const response = await fetch(`${SUPABASE_URL}/rest/v1/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(property),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to save property' };
    }

    const savedProperty = await response.json();
    return { property: savedProperty[0] };
  } catch (error) {
    return { error: error.message };
  }
}

// Export for use in popup
window.HomeScoutAuth = {
  signIn,
  signOut,
  isLoggedIn,
  getSession,
  saveProperty,
};
