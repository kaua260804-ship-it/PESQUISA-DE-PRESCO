/**
 * API.JS
 * Comunicação com o Google Apps Script
 * Otimizado para grandes volumes de dados
 */

class API {
    constructor() {
        this.baseUrl = CONFIG.APPS_SCRIPT_URL;
        this.cache = new CacheManager();
        this.indiceBusca = null;
        this.dadosCarregados = false;
    }

    /**
     * Busca todos os produtos processados
     * @returns {Promise<Array>} Array de produtos processados
     */
    async buscarTodosProdutos() {
        try {
            // Verifica cache primeiro
            const cachedData = this.cache.get();
            if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
                console.log(`${cachedData.length} produtos carregados do cache`);
                this.construirIndice(cachedData);
                this.dadosCarregados = true;
                return cachedData;
            }

            // Busca da API
            const url = `${this.baseUrl}?action=buscarTodos`;
            console.log('Buscando dados da API...');
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success === false) {
                throw new Error(data.message || 'Erro ao buscar dados');
            }

            // Extrai o array de produtos da resposta
            const produtos = data.data || [];
            
            // Verifica se é um array válido
            if (!Array.isArray(produtos)) {
                console.error('Resposta da API não contém um array válido');
                throw new Error('Formato de resposta inválido');
            }

            // Constrói índice de busca
            this.construirIndice(produtos);
            
            // Salva no cache (limitado)
            if (produtos.length > 0) {
                this.cache.set(produtos.slice(0, CONFIG.CACHE_MAX_PRODUTOS));
            }
            
            this.dadosCarregados = true;
            console.log(`${produtos.length} produtos carregados da API`);
            return produtos;
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
            throw error;
        }
    }

    /**
     * Constrói índice de busca otimizado
     * @param {Array} produtos - Lista de produtos
     */
    construirIndice(produtos) {
        try {
            console.time('Construção do índice');
            
            this.indiceBusca = {
                porSeqProd: new Map(),
                porCodAcesso: new Map(),
                porDescricao: new Map()
            };
            
            // Constrói índices de forma otimizada
            for (let i = 0; i < produtos.length; i++) {
                const produto = produtos[i];
                
                // Índice por SEQ PROD
                if (produto.seqProd) {
                    const seqProd = String(produto.seqProd).toLowerCase();
                    if (!this.indiceBusca.porSeqProd.has(seqProd)) {
                        this.indiceBusca.porSeqProd.set(seqProd, produto);
                    }
                }
                
                // Índice por código de acesso
                if (produto.codAcesso) {
                    const codAcesso = String(produto.codAcesso).toLowerCase();
                    if (!this.indiceBusca.porCodAcesso.has(codAcesso)) {
                        this.indiceBusca.porCodAcesso.set(codAcesso, produto);
                    }
                }
                
                // Índice por descrição (primeira palavra)
                if (produto.descricao) {
                    const primeiraPalavra = produto.descricao.toLowerCase().split(/\s+/)[0];
                    if (primeiraPalavra && primeiraPalavra.length >= 2) {
                        if (!this.indiceBusca.porDescricao.has(primeiraPalavra)) {
                            this.indiceBusca.porDescricao.set(primeiraPalavra, []);
                        }
                        const lista = this.indiceBusca.porDescricao.get(primeiraPalavra);
                        if (lista.length < 100) { // Limita lista por palavra
                            lista.push(produto);
                        }
                    }
                }
            }
            
            console.timeEnd('Construção do índice');
        } catch (error) {
            console.error('Erro ao construir índice:', error);
        }
    }

    /**
     * Busca produto localmente usando índice
     * @param {string} codigo - Código a ser buscado
     * @returns {Object|null} Produto encontrado ou null
     */
    buscarProdutoLocal(codigo) {
        try {
            if (!this.indiceBusca) {
                return null;
            }
            
            const codigoNormalizado = String(codigo).trim().toLowerCase();
            
            // Busca exata por código de acesso
            if (this.indiceBusca.porCodAcesso.has(codigoNormalizado)) {
                return this.indiceBusca.porCodAcesso.get(codigoNormalizado);
            }
            
            // Busca exata por SEQ PROD
            if (this.indiceBusca.porSeqProd.has(codigoNormalizado)) {
                return this.indiceBusca.porSeqProd.get(codigoNormalizado);
            }
            
            return null;
        } catch (error) {
            console.error('Erro na busca local:', error);
            return null;
        }
    }

    /**
     * Busca produtos por termo
     * @param {string} termo - Termo de busca
     * @param {number} limite - Limite de resultados
     * @returns {Array} Lista de produtos encontrados
     */
    buscarProdutosLocal(termo, limite = 50) {
        try {
            if (!this.indiceBusca || !termo || termo.length < 2) {
                return [];
            }
            
            const termoNormalizado = termo.toLowerCase().trim();
            const resultados = [];
            const resultadosSet = new Set();
            
            // Busca por código de acesso
            for (let [key, produto] of this.indiceBusca.porCodAcesso) {
                if (key.includes(termoNormalizado)) {
                    if (!resultadosSet.has(produto.seqProd)) {
                        resultadosSet.add(produto.seqProd);
                        resultados.push(produto);
                        if (resultados.length >= limite) break;
                    }
                }
            }
            
            // Busca por SEQ PROD
            if (resultados.length < limite) {
                for (let [key, produto] of this.indiceBusca.porSeqProd) {
                    if (key.includes(termoNormalizado)) {
                        if (!resultadosSet.has(produto.seqProd)) {
                            resultadosSet.add(produto.seqProd);
                            resultados.push(produto);
                            if (resultados.length >= limite) break;
                        }
                    }
                }
            }
            
            // Busca por descrição
            if (resultados.length < limite) {
                const primeiraPalavra = termoNormalizado.split(/\s+/)[0];
                if (this.indiceBusca.porDescricao.has(primeiraPalavra)) {
                    const produtosPalavra = this.indiceBusca.porDescricao.get(primeiraPalavra);
                    for (let produto of produtosPalavra) {
                        if (produto.descricao && 
                            produto.descricao.toLowerCase().includes(termoNormalizado) &&
                            !resultadosSet.has(produto.seqProd)) {
                            resultadosSet.add(produto.seqProd);
                            resultados.push(produto);
                            if (resultados.length >= limite) break;
                        }
                    }
                }
            }
            
            return resultados;
        } catch (error) {
            console.error('Erro na busca local:', error);
            return [];
        }
    }

    /**
     * Atualiza um campo editável
     * @param {string} seqProd - SEQ PROD do produto
     * @param {string} campo - Campo a ser atualizado
     * @param {string|number} valor - Novo valor
     * @returns {Promise<Object>} Resposta da API
     */
    async atualizarCampo(seqProd, campo, valor) {
        try {
            const url = `${this.baseUrl}?action=atualizar&seqProd=${encodeURIComponent(seqProd)}&campo=${encodeURIComponent(campo)}&valor=${encodeURIComponent(valor)}`;
            console.log('Atualizando campo...');
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success === false) {
                throw new Error(data.message || 'Erro ao atualizar');
            }

            console.log('Campo atualizado com sucesso');
            return data;
        } catch (error) {
            console.error('Erro ao atualizar campo:', error);
            throw error;
        }
    }
}

/**
 * Gerenciador de Cache
 */
class CacheManager {
    /**
     * Obtém dados do cache
     * @returns {Array|null} Dados cacheados ou null
     */
    get() {
        try {
            const cached = localStorage.getItem(CONFIG.CACHE_KEY);
            
            if (!cached) {
                return null;
            }
            
            const { data, timestamp } = JSON.parse(cached);
            const now = Date.now();
            
            // Verifica se o cache expirou
            if (now - timestamp > CONFIG.CACHE_TTL) {
                this.clear();
                return null;
            }
            
            return data;
        } catch (error) {
            console.error('Erro ao ler cache:', error);
            return null;
        }
    }

    /**
     * Salva dados no cache
     * @param {Array} data - Dados a serem cacheados
     */
    set(data) {
        try {
            const cacheData = {
                data: data,
                timestamp: Date.now()
            };
            
            const jsonString = JSON.stringify(cacheData);
            
            // Verifica se o tamanho é aceitável
            if (jsonString.length < CONFIG.STORAGE_MAX_BYTES) {
                localStorage.setItem(CONFIG.CACHE_KEY, jsonString);
                console.log(`Cache salvo com ${data.length} produtos`);
            } else {
                // Tenta salvar metade
                const metade = Math.floor(data.length / 2);
                if (metade > 100) {
                    console.log(`Cache muito grande, salvando ${metade} produtos`);
                    this.set(data.slice(0, metade));
                } else {
                    console.warn('Cache desativado - dados muito grandes');
                    this.clear();
                }
            }
        } catch (error) {
            console.error('Erro ao salvar cache:', error);
            this.clear();
        }
    }

    /**
     * Limpa o cache
     */
    clear() {
        try {
            localStorage.removeItem(CONFIG.CACHE_KEY);
        } catch (error) {
            console.error('Erro ao limpar cache:', error);
        }
    }
}

// Instância global da API
const api = new API();