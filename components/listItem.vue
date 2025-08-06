<template>
    <div class="industry-card">
        <div class="card-header">
            <h3 class="item-title">{{ typeName }}</h3>
            <button @click="toggleBuySell" class="toggle-btn" :class="{ 'buy-mode': isBuy, 'sell-mode': !isBuy }">
                {{ isBuy ? 'Buying' : 'Selling' }}
            </button>
        </div>
        
        <div class="card-controls">
            <div class="control-group">
                <label class="control-label">Jobs:</label>
                <input type="number" v-model="jobCount" class="input-field" min="1" step="1">
            </div>
            
            <div class="control-group">
                <label class="control-label">Region:</label>
                <select v-model="selectedRegion" @change="onRegionChange" class="select-field">
                    <option v-for="region in regionsList" :key="region.id" :value="region.id">
                        {{ region.name }}
                    </option>
                </select>
            </div>
        </div>

        <div class="price-section">
            <div class="current-price">
                <span class="price-label">Current Price:</span>
                <span class="price-value">{{ price }}</span>
                <span class="price-unit">per unit</span>
            </div>
        </div>

        <div class="recipe-section">
            <h4 class="section-title">Ingredients Breakdown</h4>
            <ItemRecipe 
                :region="selectedRegion"
                :recipeTypeId="typeId"
                :materialEfficiencyIndex="materialEfficiencyIndex"
                :jobCount="jobCount"
                @update:totalCost="updateRecipeMaterialsCost($event)"
                @update:recipeData="updateRecipeData($event)"
            />
        </div>

        <div class="results-section">
            <div v-if="recipeData && recipeData.outputQuantity > 1" class="stat-card production">
                <div class="stat-label">Products Produced:</div>
                <div class="stat-value">{{ (recipeData.outputQuantity * Number.parseInt(price)).toLocaleString() }} ISK</div>
            </div>

            <div class="stat-card cost">
                <div class="stat-label">Total Cost:</div>
                <div class="stat-value">
                    {{ recipeMaterialsCost ? recipeMaterialsCost.toLocaleString() : 'Loading' }} ISK
                    <span v-if="recipeData && recipeData.outputQuantity && recipeData.outputQuantity > 1" class="per-unit">
                        ({{ Math.round(recipeMaterialsCost / recipeData.outputQuantity).toLocaleString() }} ISK per unit)
                    </span>
                </div>
            </div>

            <div class="stat-card profit" :class="{ 'positive': profitAmount > 0, 'negative': profitAmount < 0 }">
                <div class="stat-label">Profit:</div>
                <div class="stat-value">
                    {{ recipeData ? profitAmount.toLocaleString() : 'Calculating...' }} ISK
                    <span class="profit-percentage">
                        ({{ recipeData ? profitPercentage : 'Calculating...' }}%)
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>
<script lang="ts">
    export default {
        name: 'ListItem',
        props: {
            typeId: {
                type: Number,
                required: true
            },
            typeName: {
                type: String,
                required: true
            },
            materialEfficiencyIndex:{
                type: Number,
                default: 0,
                required: false,
            }
        },
        data() {
            return {
                regionsList: [] as { id: number; name: string }[],
                priceNumber: 0,
                price: 'Loading',
                isBuy: true,
                selectedRegion: '10000002', // The Forge
                loading: false,
                recipeMaterialsCost: 0,
                recipeData: null as any,
                jobCount: 1,
            };
        },
        watch: {
            recipeMaterialsCost: {
                handler(n){
                    this.recipeMaterialsCost = n;
                },
                immediate: true
            }
        },
        computed: {
            profitAmount() {
                if (!this.recipeData) return 0;
                return (this.recipeData.outputQuantity * this.priceNumber) - this.recipeMaterialsCost;
            },
            profitPercentage() {
                if (!this.recipeData || this.recipeMaterialsCost === 0) return '0.00';
                const percentage = (this.profitAmount / this.recipeMaterialsCost) * 100;
                return percentage.toLocaleString(undefined, { maximumFractionDigits: 2 });
            }
        },
        methods: {
            async fetchJsonData(typeId: number) {
                this.loading = true;
                
                try {
                    const response: any = await $fetch(`/api/markets/${this.selectedRegion}/orders`, {
                        params: {
                            order_type: this.isBuy ? 'buy' : 'sell',
                            type_id: typeId
                        }
                    });

                    if (response.success && response.bestPrice !== null) {
                        this.priceNumber = response.bestPrice;
                        this.price = response.bestPrice.toLocaleString() + ' ISK';
                    } else {
                        this.price = 'No Data';
                    }
                } catch (error) {
                    console.error('Error fetching market data:', error);
                    this.price = 'Fetch Error';
                } finally {
                    this.loading = false;
                }
            },
            
            async fetchRegions() {
                try {
                    const response: any = await $fetch('/api/regions');
                    if (response.success) {
                        this.regionsList = response.data;
                    }
                } catch (error) {
                    console.error('Error fetching regions:', error);
                    // Fallback to default regions
                    this.regionsList = [
                        { id: 10000002, name: 'The Forge' },
                        { id: 10000043, name: 'Domain' },
                        { id: 10000032, name: 'Sinq Laison' }
                    ];
                }
            },
            
            toggleBuySell() {
                this.isBuy = !this.isBuy;
                this.fetchJsonData(this.typeId);
            },
    
            async onRegionChange() {
                // Refresh price data and material prices when region changes
                await this.fetchJsonData(this.typeId);
            },

            updateRecipeMaterialsCost(cost: number){
                this.recipeMaterialsCost = cost;
            },

            updateRecipeData(recipeData: any){
                this.recipeData = recipeData;
            }
        },
        async mounted() {
            await this.fetchRegions();
            await this.fetchJsonData(this.typeId);
        },
    }
</script>
<style scoped>
.industry-card {
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    border: 1px solid #0f3460;
    border-radius: 12px;
    padding: 24px;
    margin: 16px 0;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    color: #e0e6ed;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 2px solid #0f3460;
}

.item-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #64b5f6;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.toggle-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.toggle-btn.buy-mode {
    background: linear-gradient(135deg, #4caf50, #388e3c);
    color: white;
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.toggle-btn.sell-mode {
    background: linear-gradient(135deg, #f44336, #d32f2f);
    color: white;
    box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
}

.toggle-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
}

.card-controls {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 20px;
    margin-bottom: 24px;
}

.control-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.control-label {
    font-size: 0.9rem;
    font-weight: 500;
    color: #b0bec5;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.input-field, .select-field {
    padding: 12px;
    border: 1px solid #0f3460;
    border-radius: 6px;
    background: rgba(15, 52, 96, 0.3);
    color: #e0e6ed;
    font-size: 1rem;
    transition: all 0.3s ease;
}

.input-field:focus, .select-field:focus {
    outline: none;
    border-color: #64b5f6;
    box-shadow: 0 0 0 2px rgba(100, 181, 246, 0.2);
}

.price-section {
    margin-bottom: 24px;
    padding: 16px;
    background: rgba(15, 52, 96, 0.2);
    border-radius: 8px;
    border-left: 4px solid #64b5f6;
}

.current-price {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
}

.price-label {
    font-size: 0.9rem;
    color: #b0bec5;
    font-weight: 500;
}

.price-value {
    font-size: 1.3rem;
    font-weight: 700;
    color: #64b5f6;
}

.price-unit {
    font-size: 0.9rem;
    color: #90a4ae;
}

.recipe-section {
    margin-bottom: 24px;
}

.section-title {
    margin: 0 0 16px 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #81c784;
    border-bottom: 1px solid rgba(129, 199, 132, 0.3);
    padding-bottom: 8px;
}

.results-section {
    display: grid;
    gap: 16px;
}

.stat-card {
    padding: 16px;
    border-radius: 8px;
    background: rgba(15, 52, 96, 0.2);
    border-left: 4px solid #64b5f6;
    transition: all 0.3s ease;
}

.stat-card:hover {
    background: rgba(15, 52, 96, 0.3);
}

.stat-card.production {
    border-left-color: #81c784;
}

.stat-card.cost {
    border-left-color: #ffb74d;
}

.stat-card.profit {
    border-left-color: #64b5f6;
}

.stat-card.profit.positive {
    border-left-color: #4caf50;
    background: rgba(76, 175, 80, 0.1);
}

.stat-card.profit.negative {
    border-left-color: #f44336;
    background: rgba(244, 67, 54, 0.1);
}

.stat-label {
    font-size: 0.9rem;
    color: #b0bec5;
    font-weight: 500;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.stat-value {
    font-size: 1.2rem;
    font-weight: 700;
    color: #e0e6ed;
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
}

.per-unit {
    font-size: 0.9rem;
    color: #90a4ae;
    font-weight: 400;
}

.profit-percentage {
    font-size: 1rem;
    font-weight: 600;
    color: #64b5f6;
}

.stat-card.profit.positive .profit-percentage {
    color: #4caf50;
}

.stat-card.profit.negative .profit-percentage {
    color: #f44336;
}

@media (max-width: 768px) {
    .card-controls {
        grid-template-columns: 1fr;
    }
    
    .current-price {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .stat-value {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>