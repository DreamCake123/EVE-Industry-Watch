// Types for EVE ESI API responses
export interface MarketOrder {
  duration: number
  is_buy_order: boolean
  issued: string
  location_id: number
  min_volume: number
  order_id: number
  price: number
  range: string
  system_id: number
  type_id: number
  volume_remain: number
  volume_total: number
}

export interface MarketResponse {
  success: boolean
  data: MarketOrder[]
  bestPrice: number | null
  count: number
}

export interface Region {
  id: number
  name: string
}

export interface RegionsResponse {
  success: boolean
  data: Region[]
}

export interface TypeInfo {
  type_id: number
  name: string
  description: string
  published: boolean
  group_id: number
  market_group_id?: number
  mass?: number
  volume?: number
  capacity?: number
  portion_size?: number
  radius?: number
  type_name?: string
  graphic_id?: number
}

export interface TypeResponse {
  success: boolean
  data: TypeInfo
}

export interface RecipeItem {
  materialTypeID: number
  quantity: number
  materialName?: string
}

export interface Recipe {
  typeID: number
  blueprintTypeID: number
  activityID: number
  materials: RecipeItem[]
  itemName?: string
  availableActivities?: number[]
  outputQuantity?: number
}

export interface RecipeResponse {
  success: boolean
  data: Recipe | null
  error?: string
}

// Composable for EVE market data
export const useEveMarket = () => {
  // Fetch market orders for a specific region and type
  const fetchMarketOrders = async (regionId: string | number, typeId: number, orderType: 'buy' | 'sell'): Promise<MarketResponse> => {
    return await $fetch<MarketResponse>(`/api/markets/${regionId}/orders`, {
      params: {
        order_type: orderType,
        type_id: typeId
      }
    })
  }

  // Fetch all available regions
  const fetchRegions = async (): Promise<RegionsResponse> => {
    return await $fetch<RegionsResponse>('/api/regions')
  }

  // Fetch type information
  const fetchTypeInfo = async (typeId: number): Promise<TypeResponse> => {
    return await $fetch<TypeResponse>(`/api/types/${typeId}`)
  }

  // Fetch recipe/blueprint information
  const fetchRecipe = async (typeId: number): Promise<RecipeResponse> => {
    return await $fetch<RecipeResponse>(`/api/recipes/${typeId}`)
  }

  return {
    fetchMarketOrders,
    fetchRegions,
    fetchTypeInfo,
    fetchRecipe
  }
}
