/**
 * CONFIG.JS
 * Configurações globais do sistema
 */

const CONFIG = {
    // URL do Google Apps Script
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyIa-rlkPi4sylJyBmuTO8-GeRylBcVP81IQUCuT9pLuTYqPnDKbA9cPO4XhIt6FiMj8A/exec',
    
    // Configurações de autenticação
    AUTH: {
        // TEMPO DE SESSÃO (em milissegundos)
        SESSION_DURATION: 8 * 60 * 60 * 1000, // 8 horas
        
        // Número máximo de tentativas de login
        MAX_LOGIN_ATTEMPTS: 5,
        
        // Tempo de bloqueio após tentativas excedidas (em milissegundos)
        LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutos
        
        // Chave para armazenamento da sessão
        SESSION_KEY: 'pesquisa_preco_session',
        
        // Chave para armazenamento de tentativas
        ATTEMPTS_KEY: 'pesquisa_preco_attempts',
        
        // Hash SHA-256 da senha (gerado abaixo)
        // Senha: Fr1b4l
        PASSWORD_HASH: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456', // SUBSTITUIR
        
        // Salt para hash adicional
        SALT: 'PesquisaPreco2024_Salt_Seguro'
    },
    
    // Intervalo de atualização do cache (em milissegundos)
    CACHE_TTL: 24 * 60 * 60 * 1000, // 24 horas
    
    // Chave para armazenamento no localStorage
    CACHE_KEY: 'pesquisa_preco_cache',
    
    // Limite de produtos no cache
    CACHE_MAX_PRODUTOS: 5000,
    
    // Tamanho máximo do localStorage (em bytes)
    STORAGE_MAX_BYTES: 4 * 1024 * 1024, // 4MB
    
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
    
    // Tempo de exibição do toast (em milissegundos)
    TOAST_DURATION: 3000,
    
    // Limite de resultados na busca
    LIMITE_BUSCA: 50,
    
    // Configurações de áudio (beep)
    BEEP_CONFIG: {
        duration: 0.2,
        volume: 0.5,
        frequency: 800
    }
};

// Exportação para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
