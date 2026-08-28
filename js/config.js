/**
 * CONFIG.JS - Configurações globais do sistema
 * VERSÃO ATUALIZADA COM NOVA URL DO APPS SCRIPT
 */

(function() {
    'use strict';
    
    console.log('📋 Carregando CONFIG...');
    
    const CONFIG = {
        // Google Sheets API
        SHEETS_API_KEY: 'AIzaSyDObnjtRPUZc7_oiEWA41MNeej_IXkklr0',
        SPREADSHEET_ID: '19vs25NDrGCbcfB3sNSmLjPlDS92sbOzwlwjUjmjqPd8',
        
        // Nomes das abas
        SHEET_ARVORE: 'ARVORE',
        SHEET_BASE: 'BASE',
        
        // Mapeamento das colunas da ARVORE
        ARVORE_COLUNAS: {
            SEQ_FML: 0,
            SEQ_PROD: 1,
            DESC: 2,
            DIVISAO: 3,
            COMPRADOR: 4,
            CATEGORIA: 5,
            GRUPO: 6,
            SUBGRUPO: 7,
            SUBGRUPO_1: 8,
            SUBGRUPO_2: 9,
            SUBGRUPO_3: 10,
            NOSSO_PRECO: 11,
            PRECO_CONCORRENTE: 12,
            OBSERVACAO: 13
        },
        
        // Mapeamento das colunas da BASE
        BASE_COLUNAS: {
            SEQ_PROD: 0,
            PRODUTO: 1,
            TIPO_CODIGO: 2,
            COD_ACESSO: 3
        },
        
        // Configurações de autenticação
        AUTH: {
            SESSION_DURATION: 8 * 60 * 60 * 1000, // 8 horas
            MAX_LOGIN_ATTEMPTS: 5,
            LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutos
            SESSION_KEY: 'pesquisa_preco_session',
            ATTEMPTS_KEY: 'pesquisa_preco_attempts'
        },
        
        // Cache local
        CACHE_DURATION: 60 * 60 * 1000, // 1 hora
        CACHE_KEY: 'pesquisa_preco_cache',
        
        // Timeout
        TIMEOUT: 15000, // 15 segundos
        
        // NOVA URL do Apps Script (para escrita)
        APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbz9D3nA6KON9e3Ey0IQQ5lT-bZj0eqiPKVKQxPM2Tr4MGI6W20rlpmI5J33JxHxlwJEbg/exec',
        
        // Configurações do scanner
        SCANNER_CONFIG: {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            formatsToSupport: ['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E', 'Code 128', 'Code 39']
        },
        
        TOAST_DURATION: 8000,
        BEEP_CONFIG: {
            duration: 0.2,
            volume: 0.5,
            frequency: 800
        }
    };
    
    // Torna o CONFIG global
    window.CONFIG = CONFIG;
    
    console.log('✅ CONFIG carregado com sucesso!');
    console.log('📊 Spreadsheet ID:', CONFIG.SPREADSHEET_ID);
    console.log('📋 Abas:', CONFIG.SHEET_ARVORE, 'e', CONFIG.SHEET_BASE);
    console.log('🔗 Apps Script URL:', CONFIG.APPS_SCRIPT_URL);
    
})();
