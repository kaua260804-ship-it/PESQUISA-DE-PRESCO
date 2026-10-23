/**
 * AUTH.JS
 * Sistema de autenticação com suporte a múltiplos usuários e bloqueio de tentativas.
 */

class Auth {
    constructor() {
        // Fallback caso o config.js não tenha carregado
        if (typeof CONFIG === 'undefined') {
            window.CONFIG = { 
                AUTH: { 
                    SESSION_KEY: 'pesquisa_preco_session', 
                    ATTEMPTS_KEY: 'pesquisa_preco_attempts' 
                } 
            };
        }
        
        // Usuários e Senhas (Ambos usam a senha FR1B4L)
        this.usuariosValidos = {
            'JOAOPRICE': this.gerarHash('FR1B4L'),
            'KAUAPRICE': this.gerarHash('FR1B4L')
        };

        this.sessionKey = CONFIG.AUTH.SESSION_KEY || 'pesquisa_preco_session';
        this.attemptsKey = CONFIG.AUTH.ATTEMPTS_KEY || 'pesquisa_preco_attempts';
        this.maxAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutos de bloqueio
        this.sessionDuration = 8 * 60 * 60 * 1000; // 8 horas de sessão
    }

    /**
     * Gera um hash simples para não salvar senhas em texto puro
     */
    gerarHash(texto) {
        let hash = 0;
        for (let i = 0; i < texto.length; i++) {
            hash = ((hash << 5) - hash) + texto.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    }

    /**
     * Verifica as credenciais e cria a sessão
     */
    async login(usuario, senha) {
        try {
            // Verifica se o usuário está bloqueado por excesso de tentativas
            if (this.estaBloqueado()) {
                const tempoRestante = Math.ceil(this.obterTempoBloqueio() / 60000);
                throw new Error(`Muitas tentativas. Aguarde ${tempoRestante} minutos.`);
            }

            const userUpper = usuario.trim().toUpperCase();
            const passHash = this.gerarHash(senha);

            // Verifica se o usuário existe e se a senha bate
            if (this.usuariosValidos[userUpper] && this.usuariosValidos[userUpper] === passHash) {
                this.limparTentativas(); // Zera tentativas em caso de sucesso
                this.criarSessao(userUpper);
                return true;
            } else {
                this.registrarTentativa(); // Adiciona +1 na contagem de erro
                throw new Error('Usuário ou senha incorretos');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            throw error;
        }
    }

    criarSessao(usuario) {
        const sessao = {
            usuario: usuario,
            loginTime: Date.now(),
            expiraEm: Date.now() + this.sessionDuration
        };
        sessionStorage.setItem(this.sessionKey, JSON.stringify(sessao));
    }

    estaAutenticado() {
        try {
            const sessaoJSON = sessionStorage.getItem(this.sessionKey);
            if (!sessaoJSON) return false;
            
            const sessao = JSON.parse(sessaoJSON);
            if (Date.now() > sessao.expiraEm) {
                this.logout();
                return false;
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    logout() {
        sessionStorage.removeItem(this.sessionKey);
        window.location.reload();
    }

    // --- CONTROLE DE TENTATIVAS E BLOQUEIO ---
    obterTentativas() {
        try {
            const t = localStorage.getItem(this.attemptsKey);
            const dados = t ? JSON.parse(t) : { count: 0, lastAttempt: 0 };
            
            // Se já passou do tempo de bloqueio, reseta
            if (Date.now() - dados.lastAttempt > this.lockoutDuration) {
                return { count: 0, lastAttempt: 0 };
            }
            return dados;
        } catch (e) {
            return { count: 0, lastAttempt: 0 };
        }
    }

    registrarTentativa() {
        const t = this.obterTentativas();
        t.count++;
        t.lastAttempt = Date.now();
        localStorage.setItem(this.attemptsKey, JSON.stringify(t));
    }

    limparTentativas() {
        localStorage.removeItem(this.attemptsKey);
    }

    estaBloqueado() {
        const t = this.obterTentativas();
        return t.count >= this.maxAttempts;
    }

    obterTempoBloqueio() {
        const t = this.obterTentativas();
        if (t.count >= this.maxAttempts) {
            return Math.max(0, this.lockoutDuration - (Date.now() - t.lastAttempt));
        }
        return 0;
    }

    sanitizarInput(input) {
        return String(input || '').replace(/[<>]/g, '').trim();
    }
}

// Instância global
const auth = new Auth();
