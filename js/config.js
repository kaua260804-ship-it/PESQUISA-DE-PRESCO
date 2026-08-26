const CONFIG = {
    // URL do Google Apps Script (use /dev para desenvolvimento)
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyIa-rlkPi4sylJyBmuTO8-GeRylBcVP81IQUCuT9pLuTYqPnDKbA9cPO4XhIt6FiMj8A/exec',
    
    // Cache
    CACHE_TTL: 24 * 60 * 60 * 1000, // 24 horas
    CACHE_KEY: 'pesquisa_preco_cache',
    CACHE_MAX_PRODUTOS: 5000,
    STORAGE_MAX_BYTES: 4 * 1024 * 1024, // 4MB
    
    // Scanner
    SCANNER_CONFIG: {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [
            'EAN-13', 'EAN-8', 'UPC-A', 'UPC-E',
            'Code 128', 'Code 39', 'ITF', 'Codabar'
        ]
    },
    
    // UI
    TOAST_DURATION: 3000,
    LIMITE_BUSCA: 50,
    
    // Áudio
    BEEP_CONFIG: {
        duration: 0.2,
        volume: 0.5,
        frequency: 800
    }
};