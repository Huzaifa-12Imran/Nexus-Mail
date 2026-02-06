// Test different Nylas endpoints
const NYLAS_API_URL = 'https://api.us.nylas.com'
const API_KEY = 'nyk_v0_Q9lkKbS16MKzt1VpDzFi7Spsq0tnoXhfgN1FRNG3nJtaXsXuZ6UyOnAuilzAUDzb'
const GRANT_ID = 'f0c38a3a-4470-4289-8f6d-c365d7f4a9b6'

async function test() {
  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  }

  // Test different endpoint formats
  const endpoints = [
    `/v3/grants/${GRANT_ID}/messages?limit=5`,
    `/v3/ecc/grants/${GRANT_ID}/messages?limit=5`,
    `/v3/grants/${GRANT_ID}`,
    `/v3/accounts/${GRANT_ID}/messages?limit=5`,
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${NYLAS_API_URL}${endpoint}`, { headers })
      console.log(`${endpoint}: ${response.status}`)
      if (response.ok) {
        const data = await response.json()
        console.log('SUCCESS:', JSON.stringify(data, null, 2))
        break
      }
    } catch (e) {
      console.log(`${endpoint}: ERROR - ${e.message}`)
    }
  }
}

test()
