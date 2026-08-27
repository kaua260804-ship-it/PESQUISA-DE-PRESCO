/**
 * AUTH.JS
 * Sistema de autenticação seguro
 */

class Auth {
    constructor() {
        this.usuario = 'PriceFribal';
        // Hash SHA-256 da senha 'Fr1b4l'
        this.senhaHash = this.gerarHash('Fr1b4l');
        this.sessionKey = CONFIG.AUTH.SESSION_KEY;
        this.attemptsKey = CONFIG.AUTH.ATTEMPTS_KEY;
    }

    /**
     * Gera hash SHA-256
     * @param {string} texto - Texto para gerar hash
     * @returns {string} Hash hexadecimal
     */
    async gerarHash(texto) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(texto);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('Erro ao gerar hash:', error);
            // Fallback simples (não usar em produção)
            let hash = 0;
            for (let i = 0; i < texto.length; i++) {
                const char = texto.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash).toString(16);
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

            // Verifica senha (com hash)
            const senhaHash = await this.gerarHash(senha);
            const senhaHashEsperada = await this.gerarHash('Fr1b4l');
            
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
            expiraEm: Date.now() + CONFIG.AUTH.SESSION_DURATION,
            token: this.gerarToken()
        };
        
        // Armazena sessão de forma segura
        sessionStorage.setItem(this.sessionKey, JSON.stringify(sessao));
    }

    /**
     * Gera token aleatório
     * @returns {string} Token aleatório
     */
    gerarToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
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
        sessionStorage.removeItem(this.sessionKey);
        localStorage.removeItem(CONFIG.CACHE_KEY);
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
            if (Date.now() - tentativas.lastAttempt > CONFIG.AUTH.LOCKOUT_DURATION) {
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
        localStorage.removeItem(this.attemptsKey);
    }

    /**
     * Verifica se está bloqueado
     * @returns {boolean} True se bloqueado
     */
    estaBloqueado() {
        const tentativas = this.obterTentativas();
        
        if (tentativas.count >= CONFIG.AUTH.MAX_LOGIN_ATTEMPTS) {
            const tempoRestante = CONFIG.AUTH.LOCKOUT_DURATION - (Date.now() - tentativas.lastAttempt);
            
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
        if (tentativas.count >= CONFIG.AUTH.MAX_LOGIN_ATTEMPTS) {
            return Math.max(0, CONFIG.AUTH.LOCKOUT_DURATION - (Date.now() - tentativas.lastAttempt));
        }
        return 0;
    }

    /**
     * Sanitiza input do usuário
     * @param {string} input - Input do usuário
     * @returns {string} Input sanitizado
     */
    sanitizarInput(input) {
        return input.replace(/[<>]/g, '').trim();
    }
}

// Instância global de autenticação
const auth = new Auth();
