<template>
    <div class="app-container">
        <div class="app-header">
            <div class="header-content">
                <div class="title-section">
                    <h1 class="app-title">EVE Industry Watch</h1>
                    <button @click="newItem" class="new-item-btn">
                        <span class="btn-icon">+</span>
                        New Item
                    </button>
                </div>
                <div class="settings-section">
                    <h2 class="settings-title">Settings</h2>
                    <div class="me-control">
                        <label for="ME" class="me-label">Material Efficiency:</label>
                        <input v-model="materialEfficiencyIndex" type="number" id="ME" max="10" min="0" step="1" placeholder="0" class="me-input" />
                        <span class="me-suffix">ME</span>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="isCreatingNewItem" class="new-item-section">
            <div class="new-item-card">
                <h2 class="section-title">Add New Item</h2>
                <div class="search-controls">
                    <input type="text" v-model="searchQuery" placeholder="Enter item name" class="search-input" />
                    <button @click="createItem" class="create-btn">Add to Watchlist</button>
                </div>
                <div v-if="filteredItems.length > 0" class="search-results">
                    <h3 class="results-title">Search Results:</h3>
                    <ul class="results-list">
                        <li v-for="item in reducedFilteredItems" :key="item.typeId" class="result-item">
                            {{ item.typeName }}
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="watchlist-section">
            <div v-if="watchlist.length === 0" class="empty-state">
                <div class="empty-icon">📊</div>
                <h3>No items in your watchlist</h3>
                <p>Add items to start tracking their manufacturing costs and profitability</p>
            </div>
            <div v-else class="watchlist-grid">
                <ListItem 
                    v-for="item in watchlist" 
                    :key="item.typeId"
                    :typeId="Number(item.typeId)" 
                    :typeName="item.typeName" 
                    :materialEfficiencyIndex="materialEfficiencyIndex"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { ref } from 'vue';
    import { computed } from 'vue';
    import ListItem from '~/components/listItem.vue';
    import type { Database } from '~/types/database';

    const materialEfficiencyIndex = ref(0);
    const db_name = 'watchlist';

    type invTypeItem = {
        typeId: string;
        typeName: string;
    };

    // Use the built-in Supabase client from @nuxtjs/supabase with types
    const supabase = useSupabaseClient<Database>();
    
    async function fetchWatchlist() {
        const { data, error } = await supabase
            .from('watchlist')
            .select('id, type_id, type_name');
        if (error) {
            console.error('Error fetching watchlist:', error);
            return [];
        }
        return data || [];
    }

    // Load watchlist from Supabase on mount
    import { onMounted } from 'vue';
    onMounted(async () => {
        const data = await fetchWatchlist();
        watchlist.value = data.map(item => ({
            typeId: item.id, // Use id from Supabase result
            typeName: item.type_name
        }));
    });

    // Load and parse invTypes.csv (assume it's in /assets/invTypes.csv)
    import invTypesRaw from '~/assets/invTypes.csv?raw';

    // Parse CSV to array of objects
    function parseCSV(csv: string) {
        const [header, ...rows] = csv.trim().split('\n');
        const keys = header.split(',');
        return rows.map(row => {
            const values = row.split(',');
            const obj: Record<string, string> = {};
            keys.forEach((k, i) => obj[k] = values[i]);
            return obj;
        });
    }

    const invTypes: invTypeItem[] = parseCSV(invTypesRaw).map(item => ({
        typeId: item[Object.keys(item)[0]],
        typeName: item[Object.keys(item)[1]]
    }));

    // Fuzzy search composable
    const searchQuery = ref('');
    const filteredItems = computed(() => {
        if (!searchQuery.value) return [];
        const q = searchQuery.value.toLowerCase();
        return invTypes.filter(item =>
            item.typeName && item.typeName.toLowerCase().includes(q)
        );
    });
    const reducedFilteredItems = computed(() => {
        if (filteredItems.value.length > 10) {
            return filteredItems.value.slice(0, 10);
        }
        return filteredItems.value;
    });

    const watchlist = ref<invTypeItem[]>([]);

    const isCreatingNewItem = ref(false);

    function newItem(){
        isCreatingNewItem.value = true;
    }
    function checkThingInInvTypes(thing: string){
        return filteredItems.value.some(el => {
            if (el.typeName && el.typeName.trim().toLowerCase() === thing.trim().toLowerCase()) {
                console.log(el.typeName + " matches " + thing);
                return true;
            }
            return false;
        });
    }
    function createItem(){
        if (searchQuery.value.trim() === ''){
            return;
        }
        if (filteredItems.value.length === 0){
            alert("Please type in an item name!");
            return;
        }else if (! checkThingInInvTypes(searchQuery.value) ){
            searchQuery.value = filteredItems.value[0].typeName;
            return;
        }

        const found = invTypes.find(
            item => item.typeName.trim().toLowerCase() == searchQuery.value.trim().toLowerCase()
        );
        if (!found) {
            alert("Item not found!");
            return;
        }
        const newItem: { id?: number; typeId: string; typeName: string } = {
            typeId: found.typeId || '',
            typeName: found.typeName
        };

        supabase
            .from(db_name)
            .insert(
                { type_id: newItem.typeId, type_name: newItem.typeName }
            )
            .then(({ data, error }) => {
                if (error) {
                    console.error('Error inserting new item:', error);
                } else {
                    console.log('Inserted new item:', data);
                }
            });

        watchlist.value.push(newItem);
        
        searchQuery.value = '';
        isCreatingNewItem.value = false;
    }

</script>
<style scoped>
.app-container {
    min-height: 100vh;
    background: linear-gradient(135deg, #0a0e1a, #1a1a2e);
    color: #e0e6ed;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.app-header {
    background: linear-gradient(135deg, #16213e, #0f3460);
    border-bottom: 2px solid #64b5f6;
    padding: 24px;
    margin-bottom: 32px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 32px;
    align-items: center;
}

.title-section {
    display: flex;
    align-items: center;
    gap: 20px;
}

.app-title {
    margin: 0;
    font-size: 2.2rem;
    font-weight: 700;
    color: #64b5f6;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.new-item-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: linear-gradient(135deg, #4caf50, #388e3c);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.new-item-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
}

.btn-icon {
    font-size: 1.2rem;
    font-weight: bold;
}

.settings-section {
    text-align: right;
}

.settings-title {
    margin: 0 0 12px 0;
    font-size: 1.3rem;
    font-weight: 600;
    color: #81c784;
}

.me-control {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: flex-end;
}

.me-label {
    font-size: 0.9rem;
    color: #b0bec5;
    font-weight: 500;
}

.me-input {
    width: 60px;
    padding: 8px;
    border: 1px solid #0f3460;
    border-radius: 6px;
    background: rgba(15, 52, 96, 0.3);
    color: #e0e6ed;
    text-align: center;
    font-weight: 600;
}

.me-input:focus {
    outline: none;
    border-color: #64b5f6;
    box-shadow: 0 0 0 2px rgba(100, 181, 246, 0.2);
}

.me-suffix {
    font-size: 0.9rem;
    color: #90a4ae;
    font-weight: 500;
}

.new-item-section {
    max-width: 1200px;
    margin: 0 auto 32px auto;
    padding: 0 24px;
}

.new-item-card {
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    border: 1px solid #0f3460;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.section-title {
    margin: 0 0 20px 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #64b5f6;
}

.search-controls {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
}

.search-input {
    flex: 1;
    padding: 12px 16px;
    border: 1px solid #0f3460;
    border-radius: 8px;
    background: rgba(15, 52, 96, 0.3);
    color: #e0e6ed;
    font-size: 1rem;
}

.search-input:focus {
    outline: none;
    border-color: #64b5f6;
    box-shadow: 0 0 0 2px rgba(100, 181, 246, 0.2);
}

.create-btn {
    padding: 12px 24px;
    background: linear-gradient(135deg, #64b5f6, #42a5f5);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(100, 181, 246, 0.3);
}

.create-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(100, 181, 246, 0.4);
}

.search-results {
    border-top: 1px solid rgba(100, 181, 246, 0.3);
    padding-top: 20px;
}

.results-title {
    margin: 0 0 12px 0;
    font-size: 1.1rem;
    color: #81c784;
}

.results-list {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 200px;
    overflow-y: auto;
}

.result-item {
    padding: 8px 12px;
    margin: 4px 0;
    background: rgba(15, 52, 96, 0.2);
    border-radius: 6px;
    color: #e0e6ed;
    cursor: pointer;
    transition: background 0.2s ease;
}

.result-item:hover {
    background: rgba(15, 52, 96, 0.4);
}

.watchlist-section {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
}

.empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #90a4ae;
}

.empty-icon {
    font-size: 4rem;
    margin-bottom: 20px;
}

.empty-state h3 {
    margin: 0 0 12px 0;
    font-size: 1.5rem;
    color: #b0bec5;
}

.empty-state p {
    margin: 0;
    font-size: 1rem;
    max-width: 400px;
    margin: 0 auto;
    line-height: 1.5;
}

.watchlist-grid {
    display: grid;
    gap: 24px;
}

@media (max-width: 768px) {
    .header-content {
        grid-template-columns: 1fr;
        gap: 20px;
        text-align: center;
    }
    
    .title-section {
        flex-direction: column;
        gap: 16px;
    }
    
    .settings-section {
        text-align: center;
    }
    
    .me-control {
        justify-content: center;
    }
    
    .search-controls {
        flex-direction: column;
    }
    
    .app-title {
        font-size: 1.8rem;
    }
}
</style>