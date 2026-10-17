const CONFIG = {
    SHEETS_API_KEY: 'AIzaSyDObnjtRPUZc7_oiEWA41MNeej_IXkklr0',
    SPREADSHEET_ID: '19vs25NDrGCbcfB3sNSmLjPlDS92sbOzwlwjUjmjqPd8',
    OAUTH_CLIENT_ID: '32531060917-6ut1sle6992afl61t3v4hiqrt04gmomi.apps.googleusercontent.com',
    
    SHEET_ARVORE: 'ARVORE',
    SHEET_BASE: 'BASE',
    
    // Índices das colunas (0 = A, 1 = B...)
    ARVORE_COLUNAS: {
        SEQ_FML: 0, SEQ_PROD: 1, DESC: 2, DIVISAO: 3, COMPRADOR: 4, 
        CATEGORIA: 5, GRUPO: 6, SUBGRUPO: 7, NOSSO_PRECO: 11, 
        PRECO_CONCORRENTE: 12, OBSERVACAO: 13
    },
    BASE_COLUNAS: { SEQ_PROD: 0, PRODUTO: 1, TIPO_CODIGO: 2, COD_ACESSO: 3 },
    
    AUTH: { SESSION_KEY: 'pesquisa_preco_session' },
    CACHE_DURATION: 60 * 60 * 1000, // 1 hora
    TOAST_DURATION: 3000
};

window.CONFIG = CONFIG;
