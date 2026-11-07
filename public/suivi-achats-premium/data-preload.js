/* data-preload.js — BC Module Data Preloader
   Server-side data can be injected here as window.PRELOAD_DATA
   Falls back to empty state; bc-api-bridge.js hydrates from MongoDB on page load
*/
(function() {
  'use strict';
  if (typeof window === 'undefined') return;
  // If PRELOAD_DATA was not injected server-side, initialize with empty arrays
  // bc-api-bridge.js will hydrate from MongoDB Atlas immediately after boot
  if (!window.PRELOAD_DATA) {
    window.PRELOAD_DATA = { bcRecords: [], payments: [] };
  }
})();
