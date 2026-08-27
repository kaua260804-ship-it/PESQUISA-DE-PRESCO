/**
 * API.JS
 * Comunicação com o Google Apps Script
 * Otimizado para 120.000+ produtos usando IndexedDB
 */

class API {
    constructor() {
        this.baseUrl = CONFIG.APPS_SCRIPT_URL;
        this.cache = new IndexedDBCache();
        this.indiceBusca = null;
        this.dadosCarregados = false;
        this.todosProdutos = [];
    }

    /**
     * Busca todos os produtos processados
     */
    async buscarTodosProdutos() {
        try {
            // Tenta carregar do IndexedDB primeiro
            const cachedData = await this.cache.get();
            
            if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
                console.log(`${cachedData.length} produtos carregados do IndexedDB`);
                this.todosProdutos = cachedData;
                this.construirIndice(cachedData);
                this.dadosCarregados = true;
                return cachedData;
            }

            // Busca da API
            console.log('Buscando TODOS os produtos da API...');
            const produtos = await this.buscarDaAPI();
            
            return produtos;
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
            throw error;
        }
    }

    /**
     * Busca todos os produtos da API
     */
    async buscarDaAPI() {
        try {
            // Busca em lotes para evitar timeout
            let todosProdutos = [];
            let offset = 0;
            const loteTamanho = 10000; // Busca 10.000 por vez
            
            console.log('Iniciando busca em lotes...');
            
            while (true) {
                const url = `${this.baseUrl}?action=buscarLote&offset=${offset}&limit=${loteTamanho}`;
                console.log(`Buscando lote: offset=${offset}, limit=${loteTamanho}`);
                
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.success === false) {
                    throw new Error(data.message || 'Erro ao buscar dados');
                }
                
                const produtosLote = data.data || [];
                
                if (produtosLote.length === 0) {
                    break; // Não há mais produtos
                }
                
                todosProdutos = todosProdutos.concat(produtosLote);
                console.log(`Recebidos ${produtosLote.length} produtos (total: ${todosProdutos.length})`);
                
                // Se o lote veio menor que o tamanho máximo, é o último
                if (produtosLote.length < loteTamanho) {
                    break;
                }
                
                offset += loteTamanho;
            }
            
            console.log(`Total de produtos carregados: ${todosProdutos.length}`);
            
            // Armazena todos os produtos
            this.todosProdutos = todosProdutos;
            
            // Constrói índice
            this.construirIndice(todosProdutos);
            
            // Salva no IndexedDB
            await this.cache.set(todosProdutos);
            
            this.dadosCarregados = true;
            return todosProdutos;
            
        } catch (error) {
            console.error('Erro ao buscar da API:', error);
            throw error;
        }
    }

    /**
     * Constrói índice de busca otimizado
     */
    construirIndice(produtos) {
        try {
            console.time('Construção do índice');
            console.log(`Construindo índice para ${produtos.length} produtos...`);
            
            this.indiceBusca = {
                porSeqProd: new Map(),
                porCodAcesso: new Map(),
                porDescricao: new Map()
            };
            
            // Usa chunks para não travar a UI
            const chunkSize = 5000;
            let index = 0;
            
            const processarChunk = () => {
                const fim = Math.min(index + chunkSize, produtos.length);
                
                for (let i = index; i < fim; i++) {
                    const produto = produtos[i];
                    
                    if (produto.seqProd) {
                        const seqProd = String(produto.seqProd).toLowerCase();
                        if (!this.indiceBusca.porSeqProd.has(seqProd)) {
                            this.indiceBusca.porSeqProd.set(seqProd, produto);
                        }
                    }
                    
                    if (produto.codAcesso) {
                        const codAcesso = String(produto.codAcesso).toLowerCase();
                        if (!this.indiceBusca.porCodAcesso.has(codAcesso)) {
                            this.indiceBusca.porCodAcesso.set(codAcesso, produto);
                        }
                    }
                }
                
                index = fim;
                
                if (index < produtos.length) {
                    // Processa próximo chunk de forma assíncrona
                    setTimeout(processarChunk, 0);
                } else {
                    console.timeEnd('Construção do índice');
                    console.log('Índice construído:', {
                        porSeqProd: this.indiceBusca.porSeqProd.size,
                        porCodAcesso: this.indiceBusca.porCodAcesso.size
                    });
                }
            };
            
            processarChunk();
            
        } catch (error) {
            console.error('Erro ao construir índice:', error);
        }
    }

    /**
     * Busca produto localmente
     */
    buscarProdutoLocal(codigo) {
        try {
            if (!this.indiceBusca) {
                return null;
            }
            
            const codigoNormalizado = String(codigo).trim().toLowerCase();
            
            if (this.indiceBusca.porCodAcesso.has(codigoNormalizado)) {
                return this.indiceBusca.porCodAcesso.get(codigoNormalizado);
            }
            
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
     */
    buscarProdutosLocal(termo, limite = 50) {
        try {
            if (!this.indiceBusca || !termo || termo.length < 2) {
                return [];
            }
            
            const termoNormalizado = termo.toLowerCase().trim();
            const resultados = [];
            const resultadosSet = new Set();
            
            for (let [key, produto] of this.indiceBusca.porCodAcesso) {
                if (key.includes(termoNormalizado)) {
                    if (!resultadosSet.has(produto.seqProd)) {
                        resultadosSet.add(produto.seqProd);
                        resultados.push(produto);
                        if (resultados.length >= limite) break;
                    }
                }
            }
            
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

/**
 * Cache usando IndexedDB (suporta grandes volumes)
 */
class IndexedDBCache {
    constructor() {
        this.dbName = CONFIG.CACHE_DB_NAME;
        this.dbVersion = CONFIG.CACHE_DB_VERSION;
        this.storeName = CONFIG.CACHE_STORE_NAME;
        this.db = null;
    }

    /**
     * Abre conexão com IndexedDB
     */
    async abrirDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    /**
     * Obtém dados do cache
     */
    async get() {
        try {
            await this.abrirDB();
            
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('produtos');
                
                request.onsuccess = () => {
                    const result = request.result;
                    
                    if (!result) {
                        resolve(null);
                        return;
                    }
                    
                    // Verifica se expirou
                    if (Date.now() - result.timestamp > CONFIG.CACHE_TTL) {
                        this.clear();
                        resolve(null);
                        return;
                    }
                    
                    resolve(result.data);
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Erro ao ler IndexedDB:', error);
            return null;
        }
    }

    /**
     * Salva dados no cache
     */
    async set(data) {
        try {
            await this.abrirDB();
            
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                
                const cacheData = {
                    id: 'produtos',
                    data: data,
                    timestamp: Date.now()
                };
                
                const request = store.put(cacheData);
                
                request.onsuccess = () => {
                    console.log(`IndexedDB salvo com ${data.length} produtos`);
                    resolve();
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Erro ao salvar no IndexedDB:', error);
        }
    }

    /**
     * Limpa o cache
     */
    async clear() {
        try {
            await this.abrirDB();
            
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.delete('produtos');
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Erro ao limpar IndexedDB:', error);
        }
    }
}

// Instância global da API
const api = new API();
