<template>
  <div class="debug-container">
    <h1>Environment Debug</h1>
    <div class="debug-section">
      <h2>Runtime Config</h2>
      <pre>{{ JSON.stringify(runtimeConfig, null, 2) }}</pre>
    </div>
    <div class="debug-section">
      <h2>Supabase Connection Test</h2>
      <button @click="testSupabase" class="test-btn">Test Supabase Connection</button>
      <div v-if="supabaseStatus" class="status" :class="{ error: supabaseError }">
        {{ supabaseStatus }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Database } from '~/types/database';

const runtimeConfig = useRuntimeConfig();
const supabaseStatus = ref('');
const supabaseError = ref(false);

async function testSupabase() {
  try {
    supabaseStatus.value = 'Testing connection...';
    supabaseError.value = false;
    
    const supabase = useSupabaseClient<Database>();
    const { data, error } = await supabase
      .from('watchlist')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      supabaseStatus.value = `Error: ${error.message}`;
      supabaseError.value = true;
    } else {
      supabaseStatus.value = 'Connection successful!';
      supabaseError.value = false;
    }
  } catch (err: any) {
    supabaseStatus.value = `Connection failed: ${err.message}`;
    supabaseError.value = true;
  }
}
</script>

<style scoped>
.debug-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  font-family: monospace;
}

.debug-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: #f9f9f9;
}

.debug-section h2 {
  margin-top: 0;
}

pre {
  background: #000;
  color: #0f0;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
}

.test-btn {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.status {
  margin-top: 10px;
  padding: 10px;
  border-radius: 4px;
  background: #d4edda;
  color: #155724;
}

.status.error {
  background: #f8d7da;
  color: #721c24;
}
</style>
