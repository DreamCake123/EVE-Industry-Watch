import { ESI_BASE_URL, getESIHeaders, handleESIError } from '~/server/utils/esi'

export default defineEventHandler(async (event) => {
  try {
    // For now, return a curated list of popular regions
    // In a production app, you might want to cache the full regions list from ESI
    const popularRegions = [
      { id: 10000002, name: 'The Forge' },
      { id: 10000043, name: 'Domain' },
      { id: 10000032, name: 'Sinq Laison' },
      { id: 10000030, name: 'Heimatar' },
      { id: 10000042, name: 'Metropolis' },
      { id: 10000001, name: 'Derelik' },
      { id: 10000016, name: 'Lonetrek' },
      { id: 10000020, name: 'Tash-Murkon' },
      { id: 10000033, name: 'The Citadel' },
      { id: 10000052, name: 'Kador' }
    ]

    return {
      success: true,
      data: popularRegions
    }
  } catch (error) {
    handleESIError(error, 'regions')
  }
})
