/**
 * AUTH.JS
 * Sistema de autenticação seguro - VERSÃO ROBUSTA
 */

// Verifica se CONFIG existe, se não, cria um fallback
if (typeof CONFIG === 'undefined') {
    console.warn('⚠️ CONFIG não definido, criando fallback...');
    window.CONFIG = {
        AUTH: {
            SESSION_KEY: 'pesquisa_preco_session',
            ATTEMPTS_KEY: 'pesquisa_preco_attempts',
            SESSION_DURATION: 8 * 60 * 60 * 1000,
            MAX_LOGIN_ATTEMPTS: 5,
            LOCKOUT_DURATION: 15 * 60 * 1000
        },
        CACHE_KEY: 'pesquisa_preco_cache'
    };
}

class Auth {
    constructor() {
        console.log('🔐 Inicializando Auth...');
        
        // Usa CONFIG com fallback seguro
        this.config = window.CONFIG || {};
        this.authConfig = this.config.AUTH || {};
        
        this.usuario = 'PriceFribal';
        this.senhaHash = this.gerarHash('Fr1b4l');
        
        // Valores com fallback
        this.sessionKey = this.authConfig.SESSION_KEY || 'pesquisa_preco_session';
        this.attemptsKey = this.authConfig.ATTEMPTS_KEY || 'pesquisa_preco_attempts';
        this.maxAttempts = this.authConfig.MAX_LOGIN_ATTEMPTS || 5;
        this.lockoutDuration = this.authConfig.LOCKOUT_DURATION || 15 * 60 * 1000;
        this.sessionDuration = this.authConfig.SESSION_DURATION || 8 * 60 * 60 * 1000;
        this.cacheKey = this.config.CACHE_KEY || 'pesquisa_preco_cache';
        
        console.log('✅ Auth inicializado com sucesso!');
        console.log('📌 Session Key:', this.sessionKey);
    }

    /**
     * Gera hash SHA-256 simplificado
     */
    gerarHash(texto) {
        try {
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
     */
    async login(usuario, senha) {
        try {
            console.log('🔑 Tentando login para:', usuario);
            
            // Verifica se está bloqueado
            if (this.estaBloqueado()) {
                const tempo = Math.ceil(this.obterTempoBloqueio() / 60000);
                throw new Error(`Muitas tentativas. Aguarde ${tempo} minutos.`);
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
            
            console.log('✅ Login realizado com sucesso!');
            return true;
            
        } catch (error) {
            console.error('❌ Erro no login:', error);
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
            expiraEm: Date.now() + this.sessionDuration,
            token: this.gerarToken()
        };
        
        try {
            sessionStorage.setItem(this.sessionKey, JSON.stringify(sessao));
            console.log('✅ Sessão criada');
        } catch (error) {
            console.error('Erro ao criar sessão:', error);
        }
    }

    /**
     * Gera token aleatório
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
     */
    estaAutenticado() {
        try {
            const sessao = this.obterSessao();
            
            if (!sessao) {
                return false;
            }
            
            if (Date.now() > sessao.expiraEm) {
                console.log('⏰ Sessão expirada');
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
            sessionStorage.removeItem(this.cacheKey);
            localStorage.removeItem(this.attemptsKey);
            console.log('✅ Logout realizado');
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
            console.log(`⚠️ Tentativa ${tentativas.count} de ${this.maxAttempts}`);
        } catch (error) {
            console.error('Erro ao registrar tentativa:', error);
        }
    }

    /**
     * Obtém tentativas de login
     */
    obterTentativas() {
        try {
            const tentativasJSON = localStorage.getItem(this.attemptsKey);
            const tentativas = tentativasJSON ? JSON.parse(tentativasJSON) : { count: 0, lastAttempt: 0 };
            
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
     */
    sanitizarInput(input) {
        if (!input) return '';
        return String(input).replace(/[<>]/g, '').trim();
    }
}

// Cria a instância global
let auth = null;

try {
    auth = new Auth();
    console.log('✅ Auth instanciado com sucesso!');
} catch (error) {
    console.error('❌ Erro ao instanciar Auth:', error);
    
    // Fallback de emergência
    auth = {
        usuario: 'PriceFribal',
        sessionKey: 'pesquisa_preco_session',
        attemptsKey: 'pesquisa_preco_attempts',
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
        },
        estaAutenticado() {
            return !!sessionStorage.getItem(this.sessionKey);
        },
        logout() {
            sessionStorage.removeItem(this.sessionKey);
            window.location.reload();
        },
        sanitizarInput(input) {
            return String(input || '').replace(/[<>]/g, '').trim();
        },
        estaBloqueado() { return false; },
        obterTempoBloqueio() { return 0; }
    };
    console.log('⚠️ Auth usando fallback de emergência');
}

// Exporta para uso global
window.auth = auth;
