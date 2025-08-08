<template>
    <div class="recipe-container">
        <div v-if="recipeLoading" class="loading-state">
            <div class="spinner"></div>
            <span>Loading recipe...</span>
        </div>
        <div v-else-if="recipe" class="recipe-content">
            <div v-if="recipe.blueprintTypeID !== recipe.typeID" class="blueprint-info">
                <i class="info-icon">ℹ</i>
                Recipe found via blueprint lookup ({{ recipe.itemName }} → {{ recipe.itemName }} Blueprint)
            </div>
            <ul class="materials-list">
                <li v-for="material in recipe.materials" :key="material.materialTypeID" class="material-item">
                    <div v-if="isRecipeExpandedForMaterial.includes(material.materialTypeID)" class="expanded-material">
                        <div class="material-header">
                            <button @click="collapseRecipe(material.materialTypeID)" class="collapse-btn">−</button>
                            <span class="material-info">
                                <span class="quantity">{{ material.quantity }}x</span>
                                <span class="material-name">{{ material.materialName }}</span>
                            </span>
                        </div>
                        <div class="nested-recipe">
                            <ItemRecipe 
                                :region="region" 
                                :recipeTypeId="material.materialTypeID" 
                                :ref="`nestedRecipe_${material.materialTypeID}`"
                                @update:totalCost="updateNestedCost(material.materialTypeID, $event)"
                                @update:recipeData="updateNestedRecipeData(material.materialTypeID, $event)"
                            />
                        </div>
                    </div>
                    <div v-else class="collapsed-material">
                        <div class="material-header">
                            <span class="material-info">
                                <span class="quantity">{{ material.quantity }}x</span>
                                <span class="material-name">{{ material.materialName }}</span>
                            </span>
                            <button @click="expandRecipe(material.materialTypeID)" class="expand-btn">+</button>
                        </div>
                        <div v-if="materialPrices[material.materialTypeID]" class="material-cost">
                            {{ (material.quantity * materialPrices[material.materialTypeID]).toLocaleString() }} ISK
                        </div>
                    </div>
                </li>
            </ul>
            <div v-if="recipeMaterialsCost > 0" class="recipe-summary">
                <div class="summary-item">
                    <span class="summary-label">Recipe produces:</span>
                    <span class="summary-value">{{ recipe.outputQuantity * jobCount || 1 }} unit(s)</span>
                </div>
                <div class="summary-item total">
                    <span class="summary-label">Total Material Cost:</span>
                    <span class="summary-value">{{ recipeMaterialsCost.toLocaleString() }} ISK</span>
                </div>
                <div v-if="recipe.outputQuantity && recipe.outputQuantity > 1" class="summary-item">
                    <span class="summary-label">Cost per unit:</span>
                    <span class="summary-value">{{ Math.round(recipeMaterialsCost / recipe.outputQuantity).toLocaleString() }} ISK</span>
                </div>
            </div>
        </div>
        <div v-else-if="recipeError" class="error-state">
            <span class="error-icon">⚠</span>
            <span>{{ recipeError }}</span>
        </div>
        <div v-else class="no-data-state">
            <span class="info-icon">ℹ</span>
            <span>No recipe data available</span>
        </div>
    </div>
</template>
<script lang="ts">
    export default { 
        name: 'ItemRecipe',
        emits: ['update:totalCost', 'update:recipeData'],
        props: {
            region: {
                type: String,
                required: true
            },
            recipeTypeId:{
                type: Number,
                required: true
            },
            materialEfficiencyIndex: {
                type: Number,
                default: 0,
                required: false
            },
            jobCount: {
                type: Number,
                default: 1,
                required: false
            }
        },
        data() {
            return {
                recipeLoading: false,
                recipeError: null as string | null,
                recipe: null as any,
                baseRecipe: null as any, // Store the original recipe data
                materialPrices: {} as Record<number, number>,
                isRecipeExpandedForMaterial: [] as number[],
                nestedCosts: {} as Record<number, number>,
                nestedRecipeData: {} as Record<number, any>,
            }
        }, 
        methods: {
            async fetchRecipe(typeId: number) {
                this.recipeLoading = true;
                this.recipeError = null;
                
                try {
                    const response: any = await $fetch(`/api/recipes/${typeId}` , {
                        params: { v: Date.now() }
                    });
                    
                    if (response.success && response.data) {
                        // Store the original recipe data
                        this.baseRecipe = JSON.parse(JSON.stringify(response.data));
                        // Apply job count and material efficiency
                        this.applyJobCountAndEfficiency();
                        // Fetch prices for all materials
                        await this.fetchMaterialPrices();
                    } else {
                        this.recipeError = response.error || 'No recipe found for this item';
                        this.recipe = null;
                        this.baseRecipe = null;
                    }

                    if(!this.recipe){
                        return
                    }
                } catch (error) {
                    console.error('Error fetching recipe:', error);
                    this.recipeError = 'Failed to fetch recipe data';
                    this.recipe = null;
                    this.baseRecipe = null;
                } finally {
                    this.recipeLoading = false;
                }
            },
            applyJobCountAndEfficiency() {
                if (!this.baseRecipe) return;
                
                // Create a deep copy of the base recipe
                this.recipe = JSON.parse(JSON.stringify(this.baseRecipe));
                
                // Apply job count multiplier
                if (this.jobCount > 1) {
                    this.recipe.outputQuantity = (this.recipe.outputQuantity || 1) * this.jobCount;
                    this.recipe.materials.forEach((material: any) => {
                        material.quantity = material.quantity * this.jobCount;
                    });
                }
                
                // Apply material efficiency
                if (this.materialEfficiencyIndex > 0) {
                    this.recipe.materials.forEach((material: any) => {
                        const efficiencyReduction = this.materialEfficiencyIndex / 100;
                        material.quantity = Math.max(Math.ceil(material.quantity * (1 - efficiencyReduction)), 1);
                    });
                }
            },
            async fetchMaterialPrices() {
                if (!this.recipe || !this.recipe.materials) return;

                const pricePromises = this.recipe.materials.map(async (material: any) => {
                    try {
                        const response: any = await $fetch(`/api/markets/${this.region}/orders`, {
                            params: {
                                order_type: 'sell', // Use sell orders for material costs
                                type_id: material.materialTypeID
                            }
                        });
                        
                        if (response.success && response.bestPrice !== null) {
                            this.materialPrices[material.materialTypeID] = response.bestPrice;
                        }
                    } catch (error) {
                        console.error(`Error fetching price for material ${material.materialTypeID}:`, error);
                    }
                });
                
                await Promise.all(pricePromises);
            },
            expandRecipe(typeId: number){
                this.isRecipeExpandedForMaterial.push(typeId)
            },
            collapseRecipe(typeId: number){
                const index = this.isRecipeExpandedForMaterial.indexOf(typeId);
                if (index !== -1) {
                    this.isRecipeExpandedForMaterial.splice(index, 1);
                    // Clear the nested cost when collapsing
                    delete this.nestedCosts[typeId];
                }
            },
            updateNestedCost(materialTypeId: number, cost: number) {
                this.nestedCosts[materialTypeId] = cost;
            },
            updateNestedRecipeData(materialTypeId: number, recipeData: any) {
                this.nestedRecipeData[materialTypeId] = recipeData;
            },
            getNestedRecipeData(materialTypeId: number) {
                return this.nestedRecipeData[materialTypeId];
            }
        },
        computed: {
            recipeMaterialsCost(): number {
                if (!this.recipe || !this.recipe.materials) return 0;

                return this.recipe.materials.reduce((total: number, material: any) => {
                    // If this material is expanded and has a nested cost, use the nested cost per unit
                    if (this.isRecipeExpandedForMaterial.includes(material.materialTypeID) && 
                        this.nestedCosts[material.materialTypeID] !== undefined) {
                        // The nested cost is the total cost to produce the recipe's output quantity
                        // We need the cost per unit of the material
                        const nestedRecipeData = this.getNestedRecipeData(material.materialTypeID);
                        const outputQuantity = nestedRecipeData?.outputQuantity || 1;
                        const costPerUnit = this.nestedCosts[material.materialTypeID] / outputQuantity;
                        const totalCostForMaterial = costPerUnit * material.quantity;
                        
                        return total + totalCostForMaterial;
                    }
                    
                    // Otherwise, use the market price
                    const price = this.materialPrices[material.materialTypeID] || 0;
                    const marketCost = material.quantity * price;
                    return total + marketCost;
                }, 0);
            },
        },
        watch: {
            recipeMaterialsCost: {
                handler(newCost) {
                    this.$emit('update:totalCost', newCost);
                },
                immediate: true
            },
            recipe: {
                handler(newRecipe) {
                    if (newRecipe) {
                        this.$emit('update:recipeData', newRecipe);
                    }
                },
                immediate: true
            },
            region: {
                handler() {
                    // Refresh material prices when region changes
                    if (this.recipe) {
                        this.fetchMaterialPrices();
                    }
                }
            },
            jobCount: {
                handler() {
                    if (this.baseRecipe) {
                        this.applyJobCountAndEfficiency();
                        this.fetchMaterialPrices();
                    }
                },
                immediate: false
            },
            materialEfficiencyIndex: {
                handler() {
                    if (this.baseRecipe) {
                        this.applyJobCountAndEfficiency();
                        this.fetchMaterialPrices();
                    }
                },
                immediate: false
            }
        },
        async mounted() {
            await this.fetchRecipe(this.recipeTypeId);
        },
    }
</script>
<style scoped>
.recipe-container {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.loading-state, .error-state, .no-data-state {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border-radius: 6px;
    font-size: 0.9rem;
}

.loading-state {
    background: rgba(100, 181, 246, 0.1);
    color: #64b5f6;
    border: 1px solid rgba(100, 181, 246, 0.3);
}

.error-state {
    background: rgba(244, 67, 54, 0.1);
    color: #f44336;
    border: 1px solid rgba(244, 67, 54, 0.3);
}

.no-data-state {
    background: rgba(176, 190, 197, 0.1);
    color: #b0bec5;
    border: 1px solid rgba(176, 190, 197, 0.3);
}

.spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(100, 181, 246, 0.3);
    border-top: 2px solid #64b5f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.blueprint-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    padding: 8px 12px;
    background: rgba(129, 199, 132, 0.1);
    border: 1px solid rgba(129, 199, 132, 0.3);
    border-radius: 6px;
    font-size: 0.85rem;
    color: #81c784;
    font-style: italic;
}

.info-icon, .error-icon {
    font-weight: bold;
    font-style: normal;
}

.materials-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.material-item {
    margin-bottom: 8px;
    border: 1px solid rgba(15, 52, 96, 0.3);
    border-radius: 6px;
    background: rgba(15, 52, 96, 0.1);
    overflow: hidden;
}

.material-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
}

.material-info {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
}

.quantity {
    font-weight: 700;
    color: #ffb74d;
    font-size: 0.95rem;
}

.material-name {
    color: #e0e6ed;
    font-weight: 500;
}

.expand-btn, .collapse-btn {
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 1.1rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.expand-btn {
    background: linear-gradient(135deg, #64b5f6, #42a5f5);
    color: white;
}

.collapse-btn {
    background: linear-gradient(135deg, #ff8a65, #ff7043);
    color: white;
}

.expand-btn:hover, .collapse-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.material-cost {
    padding: 0 12px 12px 12px;
    font-size: 0.9rem;
    color: #81c784;
    font-weight: 600;
}

.nested-recipe {
    margin: 0 12px 12px 12px;
    padding: 12px;
    border-left: 3px solid #64b5f6;
    border-radius: 0 6px 6px 0;
    background: rgba(15, 52, 96, 0.2);
}

.recipe-summary {
    margin-top: 16px;
    padding: 16px;
    background: rgba(15, 52, 96, 0.2);
    border-radius: 8px;
    border-left: 4px solid #64b5f6;
}

.summary-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.summary-item:last-child {
    margin-bottom: 0;
}

.summary-item.total {
    padding-top: 8px;
    border-top: 1px solid rgba(100, 181, 246, 0.3);
    font-weight: 600;
}

.summary-label {
    color: #b0bec5;
    font-size: 0.9rem;
}

.summary-value {
    color: #e0e6ed;
    font-weight: 600;
}

.summary-item.total .summary-value {
    color: #64b5f6;
    font-size: 1.1rem;
}

@media (max-width: 768px) {
    .material-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }
    
    .summary-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
    }
}
</style>