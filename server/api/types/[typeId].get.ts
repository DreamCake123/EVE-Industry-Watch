import { ESI_BASE_URL, getESIHeaders, handleESIError, isValidTypeId } from '~/server/utils/esi'

export default defineEventHandler(async (event) => {
  const { typeId } = getRouterParams(event)
  
  if (!typeId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required parameter: typeId'
    })
  }

  if (!isValidTypeId(typeId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid type ID'
    })
  }

  try {
    const typeUrl = `${ESI_BASE_URL}/universe/types/${typeId}/`
    
    const typeData = await $fetch(typeUrl, {
      headers: getESIHeaders()
    })

    return {
      success: true,
      data: typeData
    }
  } catch (error) {
    handleESIError(error, 'type information')
  }
})
