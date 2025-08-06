import { ESI_BASE_URL, getESIHeaders, handleESIError, isValidRegionId, isValidTypeId } from '~/server/utils/esi'

export default defineEventHandler(async (event) => {
  const { regionId } = getRouterParams(event)
  const query = getQuery(event)
  
  const { order_type, type_id } = query
  
  if (!regionId || !order_type || !type_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required parameters: regionId, order_type, and type_id are required'
    })
  }

  // Validate parameters
  if (!isValidRegionId(regionId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid region ID'
    })
  }

  if (!isValidTypeId(type_id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid type ID'
    })
  }

  if (!['buy', 'sell'].includes(order_type as string)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'order_type must be either "buy" or "sell"'
    })
  }

  try {
    const esiUrl = `${ESI_BASE_URL}/markets/${regionId}/orders/?order_type=${order_type}&type_id=${type_id}`
    
    const response = await $fetch(esiUrl, {
      headers: getESIHeaders()
    })

    // Process and sort the data server-side
    if (response && Array.isArray(response) && response.length > 0) {
      const sortedData = response.sort((a: any, b: any) => 
        order_type === 'buy' ? b.price - a.price : a.price - b.price
      )
      
      return {
        success: true,
        data: sortedData,
        bestPrice: sortedData[0]?.price || null,
        count: sortedData.length
      }
    } else {
      return {
        success: true,
        data: [],
        bestPrice: null,
        count: 0
      }
    }
  } catch (error) {
    handleESIError(error, 'market orders')
  }
})
