/**
 * AUTH.JS
 * Sistema de autenticação seguro
 * 
 * DEPENDÊNCIA: CONFIG deve ser carregado antes
 */

class Auth {
    constructor() {
        // Verifica se CONFIG existe
        if (typeof CONFIG === 'undefined') {
            console.error('❌ CONFIG não definido! Verifique se config.js foi carregado.');
            throw new Error('CONFIG não definido');
        }
        
        if (!CONFIG.AUTH) {
            console.error('❌ CONFIG.AUTH não definido!');
            throw new Error('CONFIG.AUTH não definido');
        }
        
        this.usuario = 'PriceFribal';
        this.senhaHash = this.gerarHash('Fr1b4l');
        this.sessionKey = CONFIG.AUTH.SESSION_KEY || 'pesquisa_preco_session';
        this.attemptsKey = CONFIG.AUTH.ATTEMPTS_KEY || 'pesquisa_preco_attempts';
        this.maxAttempts = CONFIG.AUTH.MAX_LOGIN_ATTEMPTS || 5;
        this.lockoutDuration = CONFIG.AUTH.LOCKOUT_DURATION || 15 * 60 * 1000;
        
        console.log('✅ Auth inicializado');
    }

    /**
     * Gera hash SHA-256 simplificado
     * @param {string} texto - Texto para gerar hash
     * @returns {string} Hash hexadecimal
     */
    gerarHash(texto) {
        try {
            // Usa um hash simples para compatibilidade
            let hash = 0;
            for (let i = 0; i < texto.length; i++) {
                const char = texto.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash).toString(16).padStart(8, '0');
        } catch (error) {
            console.error('Erro ao gerar hash:', error);
            return '00000000';
        }
    }

    /**
     * Verifica credenciais de login
     * @param {string} usuario - Nome de usuário
     * @param {string} senha - Senha digitada
     * @returns {Promise<boolean>} True se autenticado
     */
    async login(usuario, senha) {
        try {
            // Verifica se está bloqueado
            if (this.estaBloqueado()) {
                throw new Error('Muitas tentativas. Aguarde 15 minutos.');
            }

            // Verifica usuário
            if (usuario !== this.usuario) {
                this.registrarTentativa();
                throw new Error('Usuário ou senha incorretos');
            }

            // Verifica senha
            const senhaHash = this.gerarHash(senha);
            const senhaHashEsperada = this.gerarHash('Fr1b4l');
            
            if (senhaHash !== senhaHashEsperada) {
                this.registrarTentativa();
                throw new Error('Usuário ou senha incorretos');
            }

            // Login bem-sucedido
            this.limparTentativas();
            this.criarSessao();
            
            return true;
        } catch (error) {
            console.error('Erro no login:', error);
            throw error;
        }
    }

    /**
     * Cria sessão de usuário
     */
    criarSessao() {
        const sessao = {
            usuario: this.usuario,
            loginTime: Date.now(),
            expiraEm: Date.now() + (CONFIG.AUTH.SESSION_DURATION || 8 * 60 * 60 * 1000),
            token: this.gerarToken()
        };
        
        try {
            sessionStorage.setItem(this.sessionKey, JSON.stringify(sessao));
        } catch (error) {
            console.error('Erro ao criar sessão:', error);
        }
    }

    /**
     * Gera token aleatório
     * @returns {string} Token aleatório
     */
    gerarToken() {
        try {
            const array = new Uint8Array(16);
            crypto.getRandomValues(array);
            return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            return Math.random().toString(36).substring(2, 15);
        }
    }

    /**
     * Verifica se usuário está autenticado
     * @returns {boolean} True se autenticado
     */
    estaAutenticado() {
        try {
            const sessao = this.obterSessao();
            
            if (!sessao) {
                return false;
            }
            
            // Verifica se a sessão expirou
            if (Date.now() > sessao.expiraEm) {
                this.logout();
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            return false;
        }
    }

    /**
     * Obtém sessão atual
     * @returns {Object|null} Sessão ou null
     */
    obterSessao() {
        try {
            const sessaoJSON = sessionStorage.getItem(this.sessionKey);
            return sessaoJSON ? JSON.parse(sessaoJSON) : null;
        } catch (error) {
            console.error('Erro ao obter sessão:', error);
            return null;
        }
    }

    /**
     * Faz logout
     */
    logout() {
        try {
            sessionStorage.removeItem(this.sessionKey);
            localStorage.removeItem(CONFIG.CACHE_KEY || 'pesquisa_preco_cache');
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
        window.location.reload();
    }

    /**
     * Registra tentativa de login falha
     */
    registrarTentativa() {
        try {
            const tentativas = this.obterTentativas();
            tentativas.count++;
            tentativas.lastAttempt = Date.now();
            localStorage.setItem(this.attemptsKey, JSON.stringify(tentativas));
        } catch (error) {
            console.error('Erro ao registrar tentativa:', error);
        }
    }

    /**
     * Obtém tentativas de login
     * @returns {Object} Tentativas
     */
    obterTentativas() {
        try {
            const tentativasJSON = localStorage.getItem(this.attemptsKey);
            const tentativas = tentativasJSON ? JSON.parse(tentativasJSON) : { count: 0, lastAttempt: 0 };
            
            // Reseta se passou do tempo de bloqueio
            if (Date.now() - tentativas.lastAttempt > this.lockoutDuration) {
                return { count: 0, lastAttempt: 0 };
            }
            
            return tentativas;
        } catch (error) {
            return { count: 0, lastAttempt: 0 };
        }
    }

    /**
     * Limpa tentativas de login
     */
    limparTentativas() {
        try {
            localStorage.removeItem(this.attemptsKey);
        } catch (error) {
            console.error('Erro ao limpar tentativas:', error);
        }
    }

    /**
     * Verifica se está bloqueado
     * @returns {boolean} True se bloqueado
     */
    estaBloqueado() {
        const tentativas = this.obterTentativas();
        
        if (tentativas.count >= this.maxAttempts) {
            const tempoRestante = this.lockoutDuration - (Date.now() - tentativas.lastAttempt);
            
            if (tempoRestante > 0) {
                return true;
            } else {
                this.limparTentativas();
            }
        }
        
        return false;
    }

    /**
     * Obtém tempo restante de bloqueio
     * @returns {number} Tempo em milissegundos
     */
    obterTempoBloqueio() {
        const tentativas = this.obterTentativas();
        if (tentativas.count >= this.maxAttempts) {
            return Math.max(0, this.lockoutDuration - (Date.now() - tentativas.lastAttempt));
        }
        return 0;
    }

    /**
     * Sanitiza input do usuário
     * @param {string} input - Input do usuário
     * @returns {string} Input sanitizado
     */
    sanitizarInput(input) {
        if (!input) return '';
        return String(input).replace(/[<>]/g, '').trim();
    }
}

// Instância global de autenticação
let auth = null;

// Aguarda o CONFIG ser carregado
try {
    auth = new Auth();
    console.log('✅ Auth instanciado com sucesso');
} catch (error) {
    console.error('❌ Erro ao instanciar Auth:', error);
    // Cria uma instância com valores padrão
    auth = new (class AuthFallback {
        constructor() {
            this.usuario = 'PriceFribal';
            this.sessionKey = 'pesquisa_preco_session';
            this.attemptsKey = 'pesquisa_preco_attempts';
            console.log('⚠️ Auth usando fallback (CONFIG não disponível)');
        }
        async login(usuario, senha) {
            if (usuario === 'PriceFribal' && senha === 'Fr1b4l') {
                sessionStorage.setItem(this.sessionKey, JSON.stringify({
                    usuario: usuario,
                    loginTime: Date.now(),
                    expiraEm: Date.now() + 8 * 60 * 60 * 1000
                }));
                return true;
            }
            throw new Error('Usuário ou senha incorretos');
        }
        estaAutenticado() {
            return !!sessionStorage.getItem(this.sessionKey);
        }
        logout() {
            sessionStorage.removeItem(this.sessionKey);
            window.location.reload();
        }
        sanitizarInput(input) {
            return String(input || '').replace(/[<>]/g, '').trim();
        }
        estaBloqueado() { return false; }
        obterTempoBloqueio() { return 0; }
    })();
}
