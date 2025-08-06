// Utility functions for EVE ESI API
export const ESI_BASE_URL = 'https://esi.evetech.net/latest'
export const USER_AGENT = 'eve-industry-watch/1.0 (contact@example.com)'

// Default headers for ESI requests
export const getESIHeaders = () => ({
  'User-Agent': USER_AGENT,
  'Accept': 'application/json'
})

// Handle ESI API errors
export const handleESIError = (error: any, context: string) => {
  console.error(`ESI API Error in ${context}:`, error)
  
  if (error.response?.status === 404) {
    throw createError({
      statusCode: 404,
      statusMessage: `Resource not found in ${context}`
    })
  } else if (error.response?.status === 429) {
    throw createError({
      statusCode: 429,
      statusMessage: 'ESI API rate limit exceeded. Please try again later.'
    })
  } else if (error.response?.status >= 500) {
    throw createError({
      statusCode: 502,
      statusMessage: 'ESI API is currently unavailable'
    })
  } else {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch data from ESI API: ${context}`
    })
  }
}

// Format ISK currency
export const formatISK = (amount: number): string => {
  return amount.toLocaleString() + ' ISK'
}

// Validate type ID
export const isValidTypeId = (typeId: any): boolean => {
  const id = Number(typeId)
  return !isNaN(id) && id > 0 && id < 100000000
}

// Validate region ID
export const isValidRegionId = (regionId: any): boolean => {
  const id = Number(regionId)
  return !isNaN(id) && id > 0 && id < 20000000
}
