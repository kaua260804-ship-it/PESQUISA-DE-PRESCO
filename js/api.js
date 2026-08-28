/**
 * API.JS - VERSÃO COM GOOGLE SHEETS API
 * Busca direta na planilha sem Apps Script
 */

class API {
    constructor() {
        this.apiKey = CONFIG.SHEETS_API_KEY;
        this.spreadsheetId = CONFIG.SPREADSHEET_ID;
        this.timeout = CONFIG.TIMEOUT;
        
        // Cache em memória
        this.cache = {
            arvore: null,
            base: null,
            timestamp: 0
        };
    }

    /**
     * Busca uma aba da planilha
     */
    async buscarAba(nomeAba) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${nomeAba}?key=${this.apiKey}`;
        
        console.log(`📊 Buscando aba: ${nomeAba}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const response = await fetch(url, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.values || data.values.length < 2) {
                throw new Error(`Aba ${nomeAba} vazia ou não encontrada`);
            }
            
            console.log(`✅ ${nomeAba}: ${data.values.length - 1} linhas`);
            return data.values;
            
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Tempo esgotado. Tente novamente.');
            }
            throw error;
        }
    }

    /**
     * Carrega ARVORE com cache
     */
    async carregarArvore(forcarRecarga = false) {
        const agora = Date.now();
        
        if (!forcarRecarga && this.cache.arvore && (agora - this.cache.timestamp < CONFIG.CACHE_DURATION)) {
            console.log('📦 ARVORE do cache local');
            return this.cache.arvore;
        }
        
        try {
            const dados = await this.buscarAba(CONFIG.SHEET_ARVORE);
            const headers = dados[0];
            
            const mapPorSeq = {};
            const mapPorFml = {};
            const lista = [];
            
            for (let i = 1; i < dados.length; i++) {
                const row = dados[i];
                const seqProd = (row[1] || '').trim();
                const seqFml = (row[0] || '').trim();
                
                if (!seqProd) continue;
                
                const item = {
                    seqFml: seqFml,
                    seqProd: seqProd,
                    desc: (row[2] || '').trim(),
                    divisao: (row[3] || '').trim(),
                    comprador: (row[4] || '').trim(),
                    categoria: (row[5] || '').trim(),
                    grupo: (row[6] || '').trim(),
                    subgrupo: (row[7] || '').trim(),
                    subgrupo1: (row[8] || '').trim(),
                    subgrupo2: (row[9] || '').trim(),
                    subgrupo3: (row[10] || '').trim()
                };
                
                mapPorSeq[seqProd] = item;
                if (seqFml) mapPorFml[seqFml] = item;
                lista.push(item);
            }
            
            this.cache.arvore = { map: mapPorSeq, mapFml: mapPorFml, list: lista };
            this.cache.timestamp = agora;
            
            console.log(`✅ ARVORE cache: ${lista.length} itens`);
            return this.cache.arvore;
            
        } catch (error) {
            console.error('❌ Erro ao carregar ARVORE:', error);
            throw error;
        }
    }

    /**
     * Carrega BASE com cache
     */
    async carregarBase(forcarRecarga = false) {
        const agora = Date.now();
        
        if (!forcarRecarga && this.cache.base && (agora - this.cache.timestamp < CONFIG.CACHE_DURATION)) {
            console.log('📦 BASE do cache local');
            return this.cache.base;
        }
        
        try {
            const dados = await this.buscarAba(CONFIG.SHEET_BASE);
            
            const porEAN = {};
            const porSeq = {};
            
            for (let i = 1; i < dados.length; i++) {
                const row = dados[i];
                const seqProd = (row[0] || '').trim();
                const codAcesso = (row[5] || '').trim();
                
                if (!seqProd && !codAcesso) continue;
                
                const item = {
                    linha: i + 1,
                    seqProduto: seqProd,
                    produto: (row[1] || '').trim(),
                    tipoCodigo: (row[3] || '').trim(),
                    qtdeEmbalagem: (row[4] || '').trim(),
                    codAcesso: codAcesso,
                    observacao: (row[6] || '').trim(),
                    nossoPreco: row[7] || '',
                    precoConcorrente: row[8] || ''
                };
                
                if (codAcesso) porEAN[codAcesso] = item;
                if (seqProd) porSeq[seqProd] = item;
            }
            
            this.cache.base = { porEAN, porSeq };
            this.cache.timestamp = agora;
            
            console.log(`✅ BASE cache: ${Object.keys(porEAN).length} EANs`);
            return this.cache.base;
            
        } catch (error) {
            console.error('❌ Erro ao carregar BASE:', error);
            throw error;
        }
    }

    /**
     * Busca por EAN
     */
    async buscarPorEAN(ean) {
        try {
            const eanNormalizado = String(ean).trim();
            console.log('🔍 Buscando EAN:', eanNormalizado);
            
            if (!eanNormalizado) {
                return null;
            }
            
            // Carrega BASE
            const base = await this.carregarBase();
            const baseItem = base.porEAN[eanNormalizado];
            
            if (!baseItem) {
                console.log('❌ EAN não encontrado');
                return null;
            }
            
            console.log('✅ EAN encontrado, SEQ:', baseItem.seqProduto);
            
            // Carrega ARVORE
            const arvore = await this.carregarArvore();
            const arvoreItem = arvore.map[baseItem.seqProduto];
            
            // Combina os dados
            return {
                seqFml: arvoreItem ? arvoreItem.seqFml : '',
                seqProd: baseItem.seqProduto,
                desc: arvoreItem ? arvoreItem.desc : baseItem.produto,
                divisao: arvoreItem ? arvoreItem.divisao : '',
                comprador: arvoreItem ? arvoreItem.comprador : '',
                categoria: arvoreItem ? arvoreItem.categoria : '',
                grupo: arvoreItem ? arvoreItem.grupo : '',
                subgrupo: arvoreItem ? arvoreItem.subgrupo : '',
                subgrupo1: arvoreItem ? arvoreItem.subgrupo1 : '',
                subgrupo2: arvoreItem ? arvoreItem.subgrupo2 : '',
                subgrupo3: arvoreItem ? arvoreItem.subgrupo3 : '',
                tipoCodigo: baseItem.tipoCodigo || '',
                qtdeEmbalagem: baseItem.qtdeEmbalagem || '',
                codAcesso: baseItem.codAcesso || '',
                observacao: baseItem.observacao || '',
                nossoPreco: baseItem.nossoPreco || '',
                precoConcorrente: baseItem.precoConcorrente || ''
            };
            
        } catch (error) {
            console.error('❌ Erro ao buscar por EAN:', error);
            throw error;
        }
    }

    /**
     * Busca por SEQ
     */
    async buscarPorSeq(seq) {
        try {
            const seqNormalizado = String(seq).trim();
            console.log('🔍 Buscando SEQ:', seqNormalizado);
            
            if (!seqNormalizado) {
                return null;
            }
            
            // Carrega ARVORE
            const arvore = await this.carregarArvore();
            let arvoreItem = arvore.map[seqNormalizado];
            
            if (!arvoreItem) {
                arvoreItem = arvore.mapFml[seqNormalizado];
            }
            
            // Carrega BASE
            const base = await this.carregarBase();
            const baseItem = base.porSeq[seqNormalizado];
            
            if (!arvoreItem && !baseItem) {
                console.log('❌ SEQ não encontrado');
                return null;
            }
            
            if (!arvoreItem) {
                return {
                    seqFml: '',
                    seqProd: baseItem.seqProduto,
                    desc: baseItem.produto || '',
                    divisao: '',
                    comprador: '',
                    categoria: '',
                    grupo: '',
                    subgrupo: '',
                    subgrupo1: '',
                    subgrupo2: '',
                    subgrupo3: '',
                    tipoCodigo: baseItem.tipoCodigo || '',
                    qtdeEmbalagem: baseItem.qtdeEmbalagem || '',
                    codAcesso: baseItem.codAcesso || '',
                    observacao: baseItem.observacao || '',
                    nossoPreco: baseItem.nossoPreco || '',
                    precoConcorrente: baseItem.precoConcorrente || ''
                };
            }
            
            return {
                seqFml: arvoreItem.seqFml || '',
                seqProd: arvoreItem.seqProd || '',
                desc: arvoreItem.desc || '',
                divisao: arvoreItem.divisao || '',
                comprador: arvoreItem.comprador || '',
                categoria: arvoreItem.categoria || '',
                grupo: arvoreItem.grupo || '',
                subgrupo: arvoreItem.subgrupo || '',
                subgrupo1: arvoreItem.subgrupo1 || '',
                subgrupo2: arvoreItem.subgrupo2 || '',
                subgrupo3: arvoreItem.subgrupo3 || '',
                tipoCodigo: baseItem ? baseItem.tipoCodigo : '',
                qtdeEmbalagem: baseItem ? baseItem.qtdeEmbalagem : '',
                codAcesso: baseItem ? baseItem.codAcesso : '',
                observacao: baseItem ? baseItem.observacao : '',
                nossoPreco: baseItem ? baseItem.nossoPreco : '',
                precoConcorrente: baseItem ? baseItem.precoConcorrente : ''
            };
            
        } catch (error) {
            console.error('❌ Erro ao buscar por SEQ:', error);
            throw error;
        }
    }

    /**
     * Busca por descrição
     */
    async buscarPorDescricao(termo) {
        try {
            const termoLimpo = String(termo).trim();
            
            if (!termoLimpo || termoLimpo.length < 2) {
                return [];
            }
            
            console.log('🔍 Buscando por descrição:', termoLimpo);
            
            const arvore = await this.carregarArvore();
            const termoLower = termoLimpo.toLowerCase();
            const resultados = [];
            
            for (const item of arvore.list) {
                if (item.desc && item.desc.toLowerCase().includes(termoLower)) {
                    resultados.push(item);
                    if (resultados.length >= 30) break;
                }
            }
            
            console.log(`✅ Encontrados ${resultados.length} resultados`);
            return resultados;
            
        } catch (error) {
            console.error('❌ Erro ao buscar por descrição:', error);
            return [];
        }
    }

    /**
     * Atualiza campo (ainda usa Apps Script para escrita)
     * Mas a leitura já é pela API
     */
    async atualizarCampo(seqProd, campo, valor) {
        try {
            // Para escrita, ainda usamos o Apps Script (é mais simples)
            const url = `${CONFIG.APPS_SCRIPT_URL}?action=atualizar&seqProd=${encodeURIComponent(seqProd)}&campo=${encodeURIComponent(campo)}&valor=${encodeURIComponent(valor)}`;
            
            console.log('✏️ Atualizando campo:', campo, 'para:', valor);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success === false) {
                throw new Error(data.message || 'Erro ao atualizar');
            }
            
            // Invalida cache da BASE
            this.cache.base = null;
            
            console.log('✅ Atualização realizada com sucesso');
            return data;
            
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('❌ Erro ao atualizar campo:', error);
            throw error;
        }
    }

    /**
     * Pré-carrega todos os dados (chamar no login)
     */
    async preCarregar() {
        console.log('🚀 Pré-carregando dados...');
        try {
            await Promise.all([
                this.carregarArvore(),
                this.carregarBase()
            ]);
            console.log('✅ Dados pré-carregados com sucesso');
        } catch (error) {
            console.error('❌ Erro ao pré-carregar:', error);
        }
    }
}

const api = new API();
