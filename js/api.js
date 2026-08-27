/**
 * API.JS
 * Comunicação com timeout
 */

class API {
    constructor() {
        this.baseUrl = CONFIG.APPS_SCRIPT_URL;
        this.timeout = 30000; // 30 segundos
    }

    /**
     * Faz fetch com timeout
     */
    async fetchComTimeout(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const response = await fetch(url, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Tempo esgotado. Tente novamente.');
            }
            throw error;
        }
    }

    /**
     * Busca por EAN
     */
    async buscarPorEAN(ean) {
        try {
            const url = `${this.baseUrl}?action=buscarPorEAN&ean=${encodeURIComponent(ean)}`;
            console.log('Buscando por EAN:', ean);
            
            const response = await this.fetchComTimeout(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success === false) {
                return null;
            }
            
            return data.data;
        } catch (error) {
            console.error('Erro ao buscar por EAN:', error);
            throw error;
        }
    }

    /**
     * Busca por SEQ
     */
    async buscarPorSeq(seq) {
        try {
            const url = `${this.baseUrl}?action=buscarPorSeq&seq=${encodeURIComponent(seq)}`;
            console.log('Buscando por SEQ:', seq);
            
            const response = await this.fetchComTimeout(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success === false) {
                return null;
            }
            
            return data.data;
        } catch (error) {
            console.error('Erro ao buscar por SEQ:', error);
            throw error;
        }
    }

    /**
     * Busca por descrição
     */
    async buscarPorDescricao(termo) {
        try {
            const url = `${this.baseUrl}?action=buscarPorDescricao&termo=${encodeURIComponent(termo)}`;
            
            const response = await this.fetchComTimeout(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success === false) {
                return [];
            }
            
            return data.data || [];
        } catch (error) {
            console.error('Erro ao buscar por descrição:', error);
            return [];
        }
    }

    /**
     * Atualiza campo
     */
    async atualizarCampo(seqProd, campo, valor) {
        try {
            const url = `${this.baseUrl}?action=atualizar&seqProd=${encodeURIComponent(seqProd)}&campo=${encodeURIComponent(campo)}&valor=${encodeURIComponent(valor)}`;
            
            const response = await this.fetchComTimeout(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success === false) {
                throw new Error(data.message || 'Erro ao atualizar');
            }
            
            return data;
        } catch (error) {
            console.error('Erro ao atualizar campo:', error);
            throw error;
        }
    }
}

const api = new API();
