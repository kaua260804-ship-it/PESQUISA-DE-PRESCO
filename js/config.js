/**
 * CONFIG.JS - VERSÃO COM GOOGLE SHEETS API
 */

const CONFIG = {
    // Google Sheets API
    SHEETS_API_KEY: 'AIzaSyDObnjtRPUZc7_oiEWA41MNeej_IXkklr0',
    SPREADSHEET_ID: '19vs25NDrGCbcfB3sNSmLjPlDS92sbOzwlwjUjmjqPd8',
    
    // Nomes das abas
    SHEET_ARVORE: 'ARVORE',
    SHEET_BASE: 'BASE',
    
    // Timeout
    TIMEOUT: 15000, // 15 segundos (bem mais rápido)
    
    // Cache local (IndexedDB)
    CACHE_DURATION: 60 * 60 * 1000, // 1 hora
    CACHE_KEY: 'pesquisa_preco_cache',
    
    // Configurações do scanner
    SCANNER_CONFIG: {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: ['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E', 'Code 128', 'Code 39']
    },
    
    TOAST_DURATION: 3000,
    BEEP_CONFIG: {
        duration: 0.2,
        volume: 0.5,
        frequency: 800
    }
};
