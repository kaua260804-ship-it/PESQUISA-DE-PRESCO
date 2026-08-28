/**
 * API.JS - VERSÃO OTIMIZADA
 * ARVORE como base principal, BASE como índice de códigos
 */

class API {
    constructor() {
        this.apiKey = CONFIG.SHEETS_API_KEY;
        this.spreadsheetId = CONFIG.SPREADSHEET_ID;
        this.timeout = CONFIG.TIMEOUT || 15000;
        
        // Cache em memória
        this.cache = {
            arvore: null,
            base: null,
            timestamp: 0
        };
    }

    /**
     * Busca uma aba da planilha via API
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
     * CARREGA ARVORE - Base principal com todos os dados
     */
    async carregarArvore(forcarRecarga = false) {
        const agora = Date.now();
        
        if (!forcarRecarga && this.cache.arvore && (agora - this.cache.timestamp < CONFIG.CACHE_DURATION)) {
            console.log('📦 ARVORE do cache local');
            return this.cache.arvore;
        }
        
        try {
            const dados = await this.buscarAba(CONFIG.SHEET_ARVORE);
            const col = CONFIG.ARVORE_COLUNAS;
            
            const mapPorSeq = {};
            const mapPorFml = {};
            const lista = [];
            
            for (let i = 1; i < dados.length; i++) {
                const row = dados[i];
                const seqProd = (row[col.SEQ_PROD] || '').trim();
                const seqFml = (row[col.SEQ_FML] || '').trim();
                
                if (!seqProd) continue;
                
                const item = {
                    // Identificação
                    seqFml: seqFml,
                    seqProd: seqProd,
                    
                    // Dados principais
                    desc: (row[col.DESC] || '').trim(),
                    divisao: (row[col.DIVISAO] || '').trim(),
                    comprador: (row[col.COMPRADOR] || '').trim(),
                    categoria: (row[col.CATEGORIA] || '').trim(),
                    grupo: (row[col.GRUPO] || '').trim(),
                    subgrupo: (row[col.SUBGRUPO] || '').trim(),
                    subgrupo1: (row[col.SUBGRUPO_1] || '').trim(),
                    subgrupo2: (row[col.SUBGRUPO_2] || '').trim(),
                    subgrupo3: (row[col.SUBGRUPO_3] || '').trim(),
                    
                    // Campos editáveis (agora na ARVORE)
                    nossoPreco: row[col.NOSSO_PRECO] || '',
                    precoConcorrente: row[col.PRECO_CONCORRENTE] || '',
                    observacao: row[col.OBSERVACAO] || '',
                    
                    // Metadados
                    linha: i + 1 // Para atualizações
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
     * CARREGA BASE - Apenas índice de códigos de barras
     */
    async carregarBase(forcarRecarga = false) {
        const agora = Date.now();
        
        if (!forcarRecarga && this.cache.base && (agora - this.cache.timestamp < CONFIG.CACHE_DURATION)) {
            console.log('📦 BASE do cache local');
            return this.cache.base;
        }
        
        try {
            const dados = await this.buscarAba(CONFIG.SHEET_BASE);
            const col = CONFIG.BASE_COLUNAS;
            
            const porEAN = {};
            const porSeq = {};
            
            for (let i = 1; i < dados.length; i++) {
                const row = dados[i];
                const seqProd = (row[col.SEQ_PROD] || '').trim();
                const codAcesso = (row[col.COD_ACESSO] || '').trim();
                
                if (!seqProd && !codAcesso) continue;
                
                const item = {
                    seqProd: seqProd,
                    produto: (row[col.PRODUTO] || '').trim(),
                    tipoCodigo: (row[col.TIPO_CODIGO] || '').trim(),
                    codAcesso: codAcesso
                };
                
                if (codAcesso) porEAN[codAcesso] = item;
                if (seqProd) porSeq[seqProd] = item;
            }
            
            this.cache.base = { porEAN, porSeq };
            
            console.log(`✅ BASE cache: ${Object.keys(porEAN).length} EANs`);
            return this.cache.base;
            
        } catch (error) {
            console.error('❌ Erro ao carregar BASE:', error);
            throw error;
        }
    }

    /**
     * BUSCA POR EAN
     * 1. Encontra o SEQ na BASE
     * 2. Busca os dados completos na ARVORE
     */
    async buscarPorEAN(ean) {
        try {
            const eanNormalizado = String(ean).trim();
            console.log('🔍 Buscando EAN:', eanNormalizado);
            
            if (!eanNormalizado) {
                return null;
            }
            
            // PASSO 1: Busca o SEQ na BASE
            const base = await this.carregarBase();
            const baseItem = base.porEAN[eanNormalizado];
            
            if (!baseItem) {
                console.log('❌ EAN não encontrado na BASE');
                return null;
            }
            
            console.log('✅ EAN encontrado na BASE, SEQ:', baseItem.seqProd);
            
            // PASSO 2: Busca os dados completos na ARVORE
            const arvore = await this.carregarArvore();
            const arvoreItem = arvore.map[baseItem.seqProd];
            
            if (!arvoreItem) {
                console.log('⚠️ SEQ não encontrado na ARVORE, retornando dados básicos');
                return {
                    seqFml: '',
                    seqProd: baseItem.seqProd,
                    desc: baseItem.produto || 'Produto sem descrição',
                    divisao: '',
                    comprador: '',
                    categoria: '',
                    grupo: '',
                    subgrupo: '',
                    subgrupo1: '',
                    subgrupo2: '',
                    subgrupo3: '',
                    tipoCodigo: baseItem.tipoCodigo || '',
                    codAcesso: baseItem.codAcesso || '',
                    nossoPreco: '',
                    precoConcorrente: '',
                    observacao: ''
                };
            }
            
            // PASSO 3: Combina os dados (ARVORE tem prioridade)
            return {
                // Dados da ARVORE
                seqFml: arvoreItem.seqFml || '',
                seqProd: arvoreItem.seqProd || '',
                desc: arvoreItem.desc || baseItem.produto || '',
                divisao: arvoreItem.divisao || '',
                comprador: arvoreItem.comprador || '',
                categoria: arvoreItem.categoria || '',
                grupo: arvoreItem.grupo || '',
                subgrupo: arvoreItem.subgrupo || '',
                subgrupo1: arvoreItem.subgrupo1 || '',
                subgrupo2: arvoreItem.subgrupo2 || '',
                subgrupo3: arvoreItem.subgrupo3 || '',
                // Campos editáveis da ARVORE
                nossoPreco: arvoreItem.nossoPreco || '',
                precoConcorrente: arvoreItem.precoConcorrente || '',
                observacao: arvoreItem.observacao || '',
                // Dados da BASE (complementares)
                tipoCodigo: baseItem.tipoCodigo || '',
                codAcesso: baseItem.codAcesso || ''
            };
            
        } catch (error) {
            console.error('❌ Erro ao buscar por EAN:', error);
            throw error;
        }
    }

    /**
     * BUSCA POR SEQ
     * Busca direto na ARVORE
     */
    async buscarPorSeq(seq) {
        try {
            const seqNormalizado = String(seq).trim();
            console.log('🔍 Buscando SEQ:', seqNormalizado);
            
            if (!seqNormalizado) {
                return null;
            }
            
            // Busca direto na ARVORE
            const arvore = await this.carregarArvore();
            let arvoreItem = arvore.map[seqNormalizado];
            
            if (!arvoreItem) {
                arvoreItem = arvore.mapFml[seqNormalizado];
            }
            
            if (!arvoreItem) {
                console.log('❌ SEQ não encontrado na ARVORE');
                return null;
            }
            
            // Busca dados complementares na BASE
            const base = await this.carregarBase();
            const baseItem = base.porSeq[seqNormalizado];
            
            return {
                // Dados da ARVORE
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
                // Campos editáveis da ARVORE
                nossoPreco: arvoreItem.nossoPreco || '',
                precoConcorrente: arvoreItem.precoConcorrente || '',
                observacao: arvoreItem.observacao || '',
                // Dados da BASE
                tipoCodigo: baseItem ? baseItem.tipoCodigo : '',
                codAcesso: baseItem ? baseItem.codAcesso : ''
            };
            
        } catch (error) {
            console.error('❌ Erro ao buscar por SEQ:', error);
            throw error;
        }
    }

    /**
     * BUSCA POR DESCRIÇÃO
     * Busca apenas na ARVORE (mais rápida)
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
                    resultados.push({
                        seqFml: item.seqFml,
                        seqProd: item.seqProd,
                        desc: item.desc,
                        divisao: item.divisao,
                        comprador: item.comprador,
                        categoria: item.categoria,
                        grupo: item.grupo
                    });
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
     * ATUALIZA CAMPO NA ARVORE
     * Usa Apps Script para escrita direta na planilha
     */
    async atualizarCampo(seqProd, campo, valor) {
        let controller = null;
        let timeoutId = null;
        
        try {
            // Mapeia os campos para os nomes corretos
            const campoMap = {
                'nossoPreco': 'nossoPreco',
                'precoConcorrente': 'precoConcorrente',
                'observacao': 'observacao'
            };
            
            const campoReal = campoMap[campo];
            if (!campoReal) {
                throw new Error('Campo inválido');
            }
            
            // Usa o Apps Script para escrever na ARVORE
            const url = `${CONFIG.APPS_SCRIPT_URL}?action=atualizarArvore&seqProd=${encodeURIComponent(seqProd)}&campo=${encodeURIComponent(campoReal)}&valor=${encodeURIComponent(valor)}`;
            
            console.log('✏️ Atualizando campo na ARVORE:', campoReal, 'para:', valor);
            
            controller = new AbortController();
            timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            const response = await fetch(url, { 
                signal: controller.signal 
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success === false) {
                throw new Error(data.message || 'Erro ao atualizar');
            }
            
            // Invalida o cache da ARVORE para forçar recarga
            this.cache.arvore = null;
            this.cache.timestamp = 0;
            
            console.log('✅ Atualização realizada com sucesso na planilha!');
            
            // Recarrega a ARVORE para ter os dados atualizados no cache
            await this.carregarArvore(true);
            
            return data;
            
        } catch (error) {
            if (timeoutId) clearTimeout(timeoutId);
            console.error('❌ Erro ao atualizar campo:', error);
            throw error;
        }
    }

    /**
     * PRÉ-CARREGA TODOS OS DADOS
     */
    async preCarregar() {
        console.log('🚀 Pré-carregando dados...');
        const inicio = Date.now();
        
        try {
            await Promise.all([
                this.carregarArvore(),
                this.carregarBase()
            ]);
            
            const fim = Date.now();
            console.log(`✅ Dados pré-carregados em ${fim - inicio}ms`);
            
        } catch (error) {
            console.error('❌ Erro ao pré-carregar:', error);
            throw error;
        }
    }
}

// Instância global da API
const api = new API();
