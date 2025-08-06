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

    // Read the industry activity materials CSV
    const materialsPath = path.join(process.cwd(), 'assets', 'industryActivityMaterials.csv')
    const productsPath = path.join(process.cwd(), 'assets', 'industryActivityProducts.csv')
    const typesPath = path.join(process.cwd(), 'assets', 'invTypes.csv')

    if (!fs.existsSync(materialsPath)) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Recipe data not found'
      })
    }

    // Parse materials CSV
    const materialsData = fs.readFileSync(materialsPath, 'utf-8')
    const materialRecords = parse(materialsData, {
      columns: true,
      skip_empty_lines: true
    })

    // Parse products CSV for output quantities
    let productRecords: any[] = []
    if (fs.existsSync(productsPath)) {
      const productsData = fs.readFileSync(productsPath, 'utf-8')
      productRecords = parse(productsData, {
        columns: true,
        skip_empty_lines: true
      })
    }

    // Parse types CSV for material names
    let typeNames: Record<number, string> = {}
    if (fs.existsSync(typesPath)) {
      const typesData = fs.readFileSync(typesPath, 'utf-8')
      const typeRecords = parse(typesData, {
        columns: true,
        skip_empty_lines: true
      })
      
      typeNames = typeRecords.reduce((acc: Record<number, string>, record: any) => {
        acc[Number(record.TypeID)] = record.TypeName
        return acc
      }, {})
    }

    // Try to find the blueprint type ID for the given item type ID
    const blueprintTypeId = findBlueprintTypeId(typeIdNumber, typeNames)
    const searchTypeId = blueprintTypeId || typeIdNumber

    // Filter records for the blueprint type ID (or original if no blueprint found)
    const allRecords = materialRecords.filter((record: any) => 
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
    const productRecord = productRecords.find((record: any) => 
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

  } catch (error) {
    console.error('Error fetching recipe:', error)
    
    return {
      success: false,
      data: null,
      error: 'Failed to fetch recipe data'
    }
  }
})
