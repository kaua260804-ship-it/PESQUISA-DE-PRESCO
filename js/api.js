class API {
    constructor() {
        this.apiKey = CONFIG.SHEETS_API_KEY;
        this.spreadsheetId = CONFIG.SPREADSHEET_ID;
        this.clientId = CONFIG.OAUTH_CLIENT_ID;
        this.timeout = CONFIG.TIMEOUT;
        this.cache = { arvore: null, base: null, timestamp: 0 };
        
        this.tokenClient = null;
        this.accessToken = null;
        this.gapiIniciada = false;
    }

    // --- AUTENTICAÇÃO OAUTH ---
    async initAuth() {
        if (this.gapiIniciada) return;
        
        await new Promise((resolve) => gapi.load('client', resolve));
        await gapi.client.init({ discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"] });
        
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.clientId,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    this.accessToken = tokenResponse.access_token;
                    gapi.client.setToken({ access_token: this.accessToken });
                }
            },
        });
        this.gapiIniciada = true;
    }

    async requestToken() {
        return new Promise((resolve, reject) => {
            if (this.accessToken) return resolve(true);
            
            this.tokenClient.callback = (resp) => {
                if (resp.error) return reject(resp.error);
                this.accessToken = resp.access_token;
                gapi.client.setToken({ access_token: this.accessToken });
                resolve(true);
            };
            this.tokenClient.requestAccessToken();
        });
    }

    // --- LEITURA (API KEY) ---
    async buscarAba(nomeAba) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${nomeAba}?key=${this.apiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return data.values || [];
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    async carregarArvore(forcar = false) {
        if (!forcar && this.cache.arvore && (Date.now() - this.cache.timestamp < CONFIG.CACHE_DURATION)) {
            return this.cache.arvore;
        }
        
        const dados = await this.buscarAba(CONFIG.SHEET_ARVORE);
        const col = CONFIG.ARVORE_COLUNAS;
        const mapPorSeq = {}, mapPorFml = {}, lista = [];
        
        for (let i = 1; i < dados.length; i++) {
            const row = dados[i];
            const seqProd = (row[col.SEQ_PROD] || '').trim();
            if (!seqProd) continue;
            
            const item = {
                seqFml: (row[col.SEQ_FML] || '').trim(),
                seqProd: seqProd,
                desc: (row[col.DESC] || '').trim(),
                divisao: (row[col.DIVISAO] || '').trim(),
                comprador: (row[col.COMPRADOR] || '').trim(),
                categoria: (row[col.CATEGORIA] || '').trim(),
                grupo: (row[col.GRUPO] || '').trim(),
                subgrupo: (row[col.SUBGRUPO] || '').trim(),
                nossoPreco: row[col.NOSSO_PRECO] || '',
                precoConcorrente: row[col.PRECO_CONCORRENTE] || '',
                observacao: row[col.OBSERVACAO] || '',
                linha: i + 1 // Guarda a linha exata para o batchUpdate
            };
            mapPorSeq[seqProd] = item;
            if (item.seqFml) mapPorFml[item.seqFml] = item;
            lista.push(item);
        }
        
        this.cache.arvore = { map: mapPorSeq, mapFml: mapPorFml, list: lista };
        this.cache.timestamp = Date.now();
        return this.cache.arvore;
    }

    async carregarBase(forcar = false) {
        if (!forcar && this.cache.base) return this.cache.base;
        
        const dados = await this.buscarAba(CONFIG.SHEET_BASE);
        const col = CONFIG.BASE_COLUNAS;
        const porEAN = {}, porSeq = {};
        
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
        return this.cache.base;
    }

    async buscarPorEAN(ean) {
        const base = await this.carregarBase();
        const baseItem = base.porEAN[String(ean).trim()];
        if (!baseItem) return null;
        
        const arvore = await this.carregarArvore();
        const arvoreItem = arvore.map[baseItem.seqProd];
        
        if (!arvoreItem) return null;
        return { ...arvoreItem, tipoCodigo: baseItem.tipoCodigo, codAcesso: baseItem.codAcesso };
    }

    async buscarPorSeq(seq) {
        const arvore = await this.carregarArvore();
        const item = arvore.map[String(seq).trim()] || arvore.mapFml[String(seq).trim()];
        return item || null;
    }

    async buscarPorDescricao(termo) {
        if (!termo || termo.length < 2) return [];
        const arvore = await this.carregarArvore();
        const termoLower = termo.toLowerCase();
        return arvore.list.filter(item => item.desc.toLowerCase().includes(termoLower)).slice(0, 30);
    }

    // --- ESCRITA EM LOTE (OAUTH) ---
    async atualizarLote(alteracoes) {
        await this.initAuth();
        await this.requestToken();

        const colunasMap = { 'nossoPreco': 'L', 'precoConcorrente': 'M', 'observacao': 'N' };
        const data = [];

        for (const alt of alteracoes) {
            const col = colunasMap[alt.campo];
            if (col && alt.linha) {
                data.push({
                    range: `ARVORE!${col}${alt.linha}`,
                    values: [[alt.valor]]
                });
            }
        }

        if (data.length === 0) return { success: true, total: 0 };

        const response = await gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            resource: {
                valueInputOption: 'RAW',
                data: data
            }
        });

        this.cache.arvore = null; // Invalida cache após escrita
        return { success: true, total: response.result.totalUpdatedCells };
    }
}

const api = new API();
