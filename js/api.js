/**
 * API.JS
 * Comunicação com o Google Apps Script
 * Busca otimizada
 */

class API {
    constructor() {
        this.baseUrl = CONFIG.APPS_SCRIPT_URL;
        this.indiceBusca = null;
        this.dadosCarregados = false;
    }

    /**
     * Busca produto por EAN (CODACESSO)
     */
    async buscarPorEAN(ean) {
        try {
            const url = `${this.baseUrl}?action=buscarPorEAN&ean=${encodeURIComponent(ean)}`;
            console.log('Buscando por EAN:', ean);
            
            const response = await fetch(url);
            
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
            return null;
        }
    }

    /**
     * Busca produto por SEQ PROD ou SEQ FML
     */
    async buscarPorSeq(seq) {
        try {
            const url = `${this.baseUrl}?action=buscarPorSeq&seq=${encodeURIComponent(seq)}`;
            console.log('Buscando por SEQ:', seq);
            
            const response = await fetch(url);
            
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
            return null;
        }
    }

    /**
     * Busca produtos por descrição
     */
    async buscarPorDescricao(termo) {
        try {
            const url = `${this.baseUrl}?action=buscarPorDescricao&termo=${encodeURIComponent(termo)}`;
            console.log('Buscando por descrição:', termo);
            
            const response = await fetch(url);
            
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
     * Atualiza um campo editável
     */
    async atualizarCampo(seqProd, campo, valor) {
        try {
            const url = `${this.baseUrl}?action=atualizar&seqProd=${encodeURIComponent(seqProd)}&campo=${encodeURIComponent(campo)}&valor=${encodeURIComponent(valor)}`;
            
            const response = await fetch(url);
            
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

// Instância global da API
const api = new API();
