/**
 * CONFIG.JS - VERSÃO COM GOOGLE SHEETS API
 * Estrutura otimizada com ARVORE como base
 */

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
    
    // Timeout
    TIMEOUT: 15000, // 15 segundos
    
    // Cache local
    CACHE_DURATION: 60 * 60 * 1000, // 1 hora
    
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
