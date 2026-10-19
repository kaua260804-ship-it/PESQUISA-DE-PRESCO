const CONFIG = {
    // ID da sua NOVA planilha no Google (apenas aba RESULTADO)
    SPREADSHEET_ID: '19vs25NDrGCbcfB3sNSmLjPlDS92sbOzwlwjUjmjqPd8',
    OAUTH_CLIENT_ID: '32531060917-6ut1sle6992afl61t3v4hiqrt04gmomi.apps.googleusercontent.com',
    
    // Caminhos dos arquivos locais (Crie a pasta 'data' na raiz e coloque os arquivos lá)
    ARQUIVO_ARVORE: 'data/ARVORE.xlsx',
    ARQUIVO_BASE: 'data/BASE.xlsx',
    
    // Configurações de Autenticação
    AUTH: {
        SESSION_KEY: 'pesquisa_preco_session'
    },
    
    // Tempo que os arquivos XLSX ficam na memória (1 hora)
    CACHE_DURATION: 60 * 60 * 1000,
    
    // Tempo de exibição dos toasts
    TOAST_DURATION: 3000
};

window.CONFIG = CONFIG;
console.log('✅ CONFIG carregado (Leitura XLSX Local + Escrita Google API)');
