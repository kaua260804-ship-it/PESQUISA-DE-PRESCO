/**
 * API.JS
 * Comunicação com o Google Apps Script
 * Corrigido para carregar todos os produtos
 */

class API {
    constructor() {
        this.baseUrl = CONFIG.APPS_SCRIPT_URL;
        this.cache = new CacheManager();
        this.indiceBusca = null;
        this.dadosCarregados = false;
        this.todosProdutos = []; // Armazena todos os produtos
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
                
                // Se o cache tem menos de 10000 produtos, busca da API
                if (cachedData.length < 10000) {
                    console.log('Cache incompleto, buscando todos da API...');
                    return await this.buscarDaAPI();
                }
                
                this.todosProdutos = cachedData;
                this.construirIndice(cachedData);
                this.dadosCarregados = true;
                return cachedData;
            }

            // Busca da API
            return await this.buscarDaAPI();
            
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
            throw error;
        }
    }

    /**
     * Busca todos os produtos da API
     * @returns {Promise<Array>} Array de produtos
     */
    async buscarDaAPI() {
        try {
            const url = `${this.baseUrl}?action=buscarTodos`;
            console.log('Buscando TODOS os dados da API...');
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success === false) {
                throw new Error(data.message || 'Erro ao buscar dados');
            }

            const produtos = data.data || [];
            
            if (!Array.isArray(produtos)) {
                throw new Error('Formato de resposta inválido');
            }

            console.log(`${produtos.length} produtos recebidos da API`);
            
            // Armazena todos os produtos
            this.todosProdutos = produtos;
            
            // Constrói índice com TODOS os produtos
            this.construirIndice(produtos);
            
            // Salva no cache (tenta salvar o máximo possível)
            if (produtos.length > 0) {
                this.cache.set(produtos);
            }
            
            this.dadosCarregados = true;
            return produtos;
            
        } catch (error) {
            console.error('Erro ao buscar da API:', error);
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
                        if (lista.length < 100) {
                            lista.push(produto);
                        }
                    }
                }
            }
            
            console.timeEnd('Construção do índice');
            console.log('Índice construído:', {
                porSeqProd: this.indiceBusca.porSeqProd.size,
                porCodAcesso: this.indiceBusca.porCodAcesso.size,
                porDescricao: this.indiceBusca.porDescricao.size
            });
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
                console.warn('Índice não construído');
                return null;
            }
            
            const codigoNormalizado = String(codigo).trim().toLowerCase();
            
            // Busca exata por código de acesso
            if (this.indiceBusca.porCodAcesso.has(codigoNormalizado)) {
                console.log('Produto encontrado por código de acesso:', codigoNormalizado);
                return this.indiceBusca.porCodAcesso.get(codigoNormalizado);
            }
            
            // Busca exata por SEQ PROD
            if (this.indiceBusca.porSeqProd.has(codigoNormalizado)) {
                console.log('Produto encontrado por SEQ PROD:', codigoNormalizado);
                return this.indiceBusca.porSeqProd.get(codigoNormalizado);
            }
            
            // Busca parcial (começa com)
            for (let [key, produto] of this.indiceBusca.porCodAcesso) {
                if (key.startsWith(codigoNormalizado)) {
                    console.log('Produto encontrado por código parcial:', key);
                    return produto;
                }
            }
            
            for (let [key, produto] of this.indiceBusca.porSeqProd) {
                if (key.startsWith(codigoNormalizado)) {
                    console.log('Produto encontrado por SEQ parcial:', key);
                    return produto;
                }
            }
            
            console.warn('Produto não encontrado:', codigoNormalizado);
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
            console.log('Atualizando campo:', campo, 'para', valor);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success === false) {
                throw new Error(data.message || 'Erro ao atualizar');
            }
            
            // Atualiza o produto no índice local
            if (this.indiceBusca) {
                const produto = this.indiceBusca.porSeqProd.get(String(seqProd).toLowerCase());
                if (produto) {
                    produto[campo] = valor;
                }
            }
            
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
            // Tenta salvar todos os dados
            const cacheData = {
                data: data,
                timestamp: Date.now()
            };
            
            const jsonString = JSON.stringify(cacheData);
            
            // Verifica o tamanho
            console.log(`Tamanho do cache: ${(jsonString.length / 1024 / 1024).toFixed(2)} MB`);
            
            if (jsonString.length < CONFIG.STORAGE_MAX_BYTES) {
                localStorage.setItem(CONFIG.CACHE_KEY, jsonString);
                console.log(`Cache salvo com ${data.length} produtos`);
            } else {
                // Tenta salvar metade
                const metade = Math.floor(data.length / 2);
                if (metade > 1000) {
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
            console.log('Cache limpo');
        } catch (error) {
            console.error('Erro ao limpar cache:', error);
        }
    }
}

// Instância global da API
const api = new API();
