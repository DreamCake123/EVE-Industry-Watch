import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

interface RecipeItem {
  materialTypeID: number
  quantity: number
  materialName?: string
}

interface Recipe {
  typeID: number
  blueprintTypeID: number
  activityID: number
  materials: RecipeItem[]
  itemName?: string
  availableActivities?: number[]
  outputQuantity?: number
}

interface RecipeResponse {
  success: boolean
  data: Recipe | null
  error?: string
}

// Function to find blueprint type ID from item type ID
function findBlueprintTypeId(itemTypeId: number, typeNames: Record<number, string>): number | null {
  const itemName = typeNames[itemTypeId]
  if (!itemName) return null
  
  // Look for a blueprint with the same name + " Blueprint"
  const blueprintName = `${itemName} Blueprint`
  
  for (const [typeId, typeName] of Object.entries(typeNames)) {
    if (typeName === blueprintName) {
      return Number(typeId)
    }
  }
  
  return null
}

// Helper to read text assets in both dev and serverless deployments
async function readCsvRecords(fileName: string): Promise<any[]> {
  // Try default Nitro server assets first (server/assets -> assets:)
  try {
    const assetsStorage: any = useStorage('assets:')
    if (assetsStorage) {
      const text = await assetsStorage.getItem(fileName)
      if (text) {
        return parse(String(text), { columns: true, skip_empty_lines: true })
      }
    }
  } catch (e) {
    // ignore and fallback
  }

  // Try custom storage mount to project /assets
  try {
    const recipesStorage: any = useStorage('recipes:')
    if (recipesStorage) {
      const text = await recipesStorage.getItem(fileName)
      if (text) {
        return parse(String(text), { columns: true, skip_empty_lines: true })
      }
    }
  } catch (e) {
    // ignore and fallback
  }

  // Fallback to filesystem (local dev)
  const candidates = [
    path.join(process.cwd(), 'server', 'assets', fileName),
    path.join(process.cwd(), 'assets', fileName),
    path.join(process.cwd(), 'scripts', 'data', fileName)
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const text = fs.readFileSync(p, 'utf-8')
      return parse(text, { columns: true, skip_empty_lines: true })
    }
  }

  throw createError({ statusCode: 404, statusMessage: `Asset not found in assets:/recipes:/fs -> ${fileName}` })
}

export default defineEventHandler(async (event): Promise<RecipeResponse> => {
  try {
    const typeId = getRouterParam(event, 'typeId')
    const query = getQuery(event)
    const activityFilter = query.activity ? Number(query.activity) : null
    
    if (!typeId || isNaN(Number(typeId))) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid type ID'
      })
    }

    const typeIdNumber = Number(typeId)

    // Load CSV datasets robustly
    const materialRecords = await readCsvRecords('industryActivityMaterials.csv')

    let productRecords: any[] = []
    try {
      productRecords = await readCsvRecords('industryActivityProducts.csv')
    } catch {
      productRecords = []
    }

    // Parse types for names
    let typeNames: Record<number, string> = {}
    try {
      const typeRecords = await readCsvRecords('invTypes.csv')
      typeNames = (typeRecords as any[]).reduce((acc: Record<number, string>, record: any) => {
        const id = Number(record.TypeID ?? record.typeID ?? record.typeId)
        const name = record.TypeName ?? record.typeName ?? record.name
        if (!isNaN(id) && name) acc[id] = name
        return acc
      }, {})
    } catch {
      typeNames = {}
    }

    // Try to find the blueprint type ID for the given item type ID
    const blueprintTypeId = findBlueprintTypeId(typeIdNumber, typeNames)
    const searchTypeId = blueprintTypeId || typeIdNumber

    // Filter records for the blueprint type ID (or original if no blueprint found)
    const allRecords = (materialRecords as any[]).filter((record: any) => 
      Number(record.typeID) === searchTypeId
    )

    if (allRecords.length === 0) {
      // If we tried with a blueprint ID and found nothing, provide a more helpful error
      if (blueprintTypeId) {
        return {
          success: false,
          data: null,
          error: `No recipe found for ${typeNames[typeIdNumber]} (Blueprint ID: ${blueprintTypeId})`
        }
      } else {
        return {
          success: false,
          data: null,
          error: `No recipe found for this item (Type ID: ${typeIdNumber})`
        }
      }
    }

    // Group records by activity ID
    const activitiesMap = new Map<number, any[]>()
    allRecords.forEach((record: any) => {
      const activityId = Number(record.activityID)
      if (!activitiesMap.has(activityId)) {
        activitiesMap.set(activityId, [])
      }
      activitiesMap.get(activityId)!.push(record)
    })

    // Choose which activity to use based on filter or default preference
    let recipeRecords: any[] | undefined
    
    if (activityFilter !== null) {
      // Use specific activity if requested
      recipeRecords = activitiesMap.get(activityFilter)
      if (!recipeRecords) {
        return {
          success: false,
          data: null,
          error: `No recipe found for activity ${activityFilter} on this item`
        }
      }
    } else {
      // Prefer manufacturing (activity ID 1) if available, otherwise use the first available activity
      recipeRecords = activitiesMap.get(1) || Array.from(activitiesMap.values())[0]
    }
    
    if (!recipeRecords || recipeRecords.length === 0) {
      return {
        success: false,
        data: null,
        error: `No valid recipe found for this item`
      }
    }

    // All records in recipeRecords should have the same activity ID
    const activityId = Number(recipeRecords[0].activityID)
    
    // Find output quantity from products data
    const productRecord = (productRecords as any[]).find((record: any) => 
      Number(record.typeID) === searchTypeId && Number(record.activityID) === activityId
    )
    const outputQuantity = productRecord ? Number(productRecord.quantity) : 1
    
    // Group materials for this specific activity
    const materials: RecipeItem[] = recipeRecords.map((record: any) => ({
      materialTypeID: Number(record.materialTypeID),
      quantity: Number(record.quantity),
      materialName: typeNames[Number(record.materialTypeID)] || `Unknown (${record.materialTypeID})`
    }))

    const recipe: Recipe = {
      typeID: typeIdNumber,
      blueprintTypeID: searchTypeId,
      activityID: activityId,
      materials,
      itemName: typeNames[typeIdNumber],
      availableActivities: Array.from(activitiesMap.keys()).sort(),
      outputQuantity: outputQuantity
    }

    return {
      success: true,
      data: recipe
    }

  } catch (error: any) {
    console.error('Error fetching recipe:', error)
    const message = error?.statusMessage || error?.message || 'Failed to fetch recipe data'
    return {
      success: false,
      data: null,
      error: message
    }
  }
})
