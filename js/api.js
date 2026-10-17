class API {
    constructor() {
        this.cache = { arvore: null, base: null, timestamp: 0 };
        this.tokenClient = null;
        this.accessToken = null;
        this.gapiIniciada = false;
    }

    // --- AUTENTICAÇÃO PARA ESCRITA ---
    async initAuth() {
        if (this.gapiIniciada) return;
        await new Promise((resolve) => gapi.load('client', resolve));
        await gapi.client.init({ discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"] });
        
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CONFIG.OAUTH_CLIENT_ID,
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
                if (resp.error) return reject(new Error('Autorização negada.'));
                this.accessToken = resp.access_token;
                gapi.client.setToken({ access_token: this.accessToken });
                resolve(true);
            };
            this.tokenClient.requestAccessToken();
        });
    }

    // --- LEITURA (API KEY) ---
    async buscarAba(nomeAba) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${nomeAba}?key=${CONFIG.SHEETS_API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
        const data = await response.json();
        return data.values || [];
    }

    async carregarArvore(forcar = false) {
        if (!forcar && this.cache.arvore && (Date.now() - this.cache.timestamp < CONFIG.CACHE_DURATION)) {
            return this.cache.arvore;
        }
        
        const dados = await this.buscarAba(CONFIG.SHEET_ARVORE);
        const col = CONFIG.ARVORE_COLUNAS;
        const mapPorSeq = {}, lista = [];
        
        for (let i = 1; i < dados.length; i++) {
            const row = dados[i];
            const seqProd = (row[col.SEQ_PROD] || '').trim();
            if (!seqProd) continue;
            
            const item = {
                seqProd: seqProd,
                desc: (row[col.DESC] || '').trim(),
                comprador: (row[col.COMPRADOR] || '').trim(),
                categoria: (row[col.CATEGORIA] || '').trim(),
                grupo: (row[col.GRUPO] || '').trim(),
                subgrupo: (row[col.SUBGRUPO] || '').trim(),
                nossoPreco: row[col.NOSSO_PRECO] || '',
                precoConcorrente: row[col.PRECO_CONCORRENTE] || '',
                observacao: row[col.OBSERVACAO] || '',
                linha: i + 1 // Linha exata na planilha
            };
            mapPorSeq[seqProd] = item;
            lista.push(item);
        }
        
        this.cache.arvore = { map: mapPorSeq, list: lista };
        this.cache.timestamp = Date.now();
        return this.cache.arvore;
    }

    async carregarBase() {
        if (this.cache.base) return this.cache.base;
        const dados = await this.buscarAba(CONFIG.SHEET_BASE);
        const col = CONFIG.BASE_COLUNAS;
        const porEAN = {};
        
        for (let i = 1; i < dados.length; i++) {
            const row = dados[i];
            const seqProd = (row[col.SEQ_PROD] || '').trim();
            const codAcesso = (row[col.COD_ACESSO] || '').trim();
            if (!seqProd || !codAcesso) continue;
            
            porEAN[codAcesso] = { seqProd, tipoCodigo: (row[col.TIPO_CODIGO] || '').trim(), codAcesso };
        }
        this.cache.base = { porEAN };
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
        return arvore.map[String(seq).trim()] || null;
    }

    async buscarPorDescricao(termo) {
        if (!termo || termo.length < 2) return [];
        const arvore = await this.carregarArvore();
        return arvore.list.filter(i => i.desc.toLowerCase().includes(termo.toLowerCase())).slice(0, 30);
    }

    // --- ESCRITA EM LOTE ULTRA-RÁPIDA ---
    async atualizarLote(alteracoes) {
        await this.initAuth();
        await this.requestToken();

        const colunas = { 'nossoPreco': 'L', 'precoConcorrente': 'M', 'observacao': 'N' };
        const data = [];

        for (const alt of alteracoes) {
            if (colunas[alt.campo] && alt.linha) {
                data.push({
                    range: `${CONFIG.SHEET_ARVORE}!${colunas[alt.campo]}${alt.linha}`,
                    values: [[alt.valor]]
                });
            }
        }

        if (data.length === 0) return { success: true, total: 0 };

        const response = await gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: CONFIG.SPREADSHEET_ID,
            resource: { valueInputOption: 'RAW', data: data }
        });

        this.cache.arvore = null; // Invalida cache após escrita para puxar dados novos
        return { success: true, total: response.result.totalUpdatedCells };
    }
}

const api = new API();
