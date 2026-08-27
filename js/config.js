/**
 * CONFIG.JS
 * Configurações globais do sistema
 */

const CONFIG = {
    // URL do Google Apps Script - ATUALIZADA
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxxnwpuKSC7pRINbV8g9CZWYPhJXlAbUnSGSXJGe2p82nzATMPG30Vr0eVIkIlItwNeVw/exec',
    
    // Configurações de autenticação
    AUTH: {
        SESSION_DURATION: 8 * 60 * 60 * 1000, // 8 horas
        MAX_LOGIN_ATTEMPTS: 5,
        LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutos
        SESSION_KEY: 'pesquisa_preco_session',
        ATTEMPTS_KEY: 'pesquisa_preco_attempts'
    },
    
    // Cache - SEM LIMITE (usa IndexedDB para grandes volumes)
    CACHE_TTL: 24 * 60 * 60 * 1000, // 24 horas
    CACHE_KEY: 'pesquisa_preco_cache',
    CACHE_DB_NAME: 'pesquisa_preco_db',
    CACHE_DB_VERSION: 1,
    CACHE_STORE_NAME: 'produtos',
    
    // Configurações do scanner
    SCANNER_CONFIG: {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [
            'EAN-13',
            'EAN-8', 
            'UPC-A',
            'UPC-E',
            'Code 128',
            'Code 39',
            'ITF',
            'Codabar'
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
