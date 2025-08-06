<template>
  <div id="app">
    <NuxtPage />
  </div>
</template>

<style>
/* Global styles */
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0e1a, #1a1a2e);
  color: #e0e6ed;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

#app {
  min-height: 100vh;
}

/* Custom scrollbar for webkit browsers */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(15, 52, 96, 0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(100, 181, 246, 0.5);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 181, 246, 0.7);
}

/* Selection colors */
::selection {
  background: rgba(100, 181, 246, 0.3);
  color: #e0e6ed;
}

/* Focus styles for accessibility */
button:focus,
input:focus,
select:focus {
  outline: 2px solid #64b5f6;
  outline-offset: 2px;
}

/* Smooth transitions for all interactive elements */
button,
input,
select {
  transition: all 0.3s ease;
}
</style>
