class API {
    constructor() {
        this.cache = { arvore: null, base: null, timestamp: 0 };
        this.tokenClient = null;
        this.accessToken = null;
        this.gapiIniciada = false;
    }

    // ==========================================
    // AUTENTICAÇÃO (Para Escrita na Planilha)
    // ==========================================
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
                if (resp.error) return reject(new Error('Autorização negada pelo usuário.'));
                this.accessToken = resp.access_token;
                gapi.client.setToken({ access_token: this.accessToken });
                resolve(true);
            };
            this.tokenClient.requestAccessToken();
        });
    }

    // ==========================================
    // LEITURA LOCAL (Arquivos XLSX)
    // ==========================================
    async carregarArquivoExcel(caminho) {
        console.log(`📂 Lendo arquivo local: ${caminho}`);
        const response = await fetch(caminho);
        if (!response.ok) throw new Error(`Erro ao carregar ${caminho}. Verifique se o arquivo existe na pasta 'data'.`);
        
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const primeiraAba = workbook.SheetNames[0];
        return XLSX.utils.sheet_to_json(workbook.Sheets[primeiraAba], { header: 1 });
    }

    async carregarArvore(forcar = false) {
        if (!forcar && this.cache.arvore && (Date.now() - this.cache.timestamp < CONFIG.CACHE_DURATION)) {
            return this.cache.arvore;
        }
        
        const dados = await this.carregarArquivoExcel(CONFIG.ARQUIVO_ARVORE);
        
        const mapPorSeq = {}, lista = [];
        for (let i = 1; i < dados.length; i++) {
            const row = dados[i];
            const seqProd = String(row[1] || '').trim(); // Coluna B (SEQ PROD)
            if (!seqProd) continue;
            
            const item = {
                seqProd: seqProd,
                desc: String(row[2] || '').trim(),       // C
                comprador: String(row[4] || '').trim(),  // E
                categoria: String(row[5] || '').trim(),  // F
                grupo: String(row[6] || '').trim(),      // G
                subgrupo: String(row[7] || '').trim(),   // H
                nossoPreco: row[11] || '',               // L
                precoConcorrente: row[12] || '',         // M
                observacao: row[13] || ''                // N
            };
            mapPorSeq[seqProd] = item;
            lista.push(item);
        }
        
        this.cache.arvore = { map: mapPorSeq, list: lista };
        this.cache.timestamp = Date.now();
        console.log(`✅ ARVORE carregada na memória: ${lista.length} itens`);
        return this.cache.arvore;
    }

    async carregarBase() {
        if (this.cache.base) return this.cache.base;
        
        const dados = await this.carregarArquivoExcel(CONFIG.ARQUIVO_BASE);
        const porEAN = {};
        
        for (let i = 1; i < dados.length; i++) {
            const row = dados[i];
            const seqProd = String(row[0] || '').trim(); // A
            const codAcesso = String(row[3] || '').trim(); // D (EAN)
            if (!seqProd || !codAcesso) continue;
            
            porEAN[codAcesso] = { 
                seqProd, 
                tipoCodigo: String(row[2] || '').trim(), // C
                codAcesso 
            };
        }
        this.cache.base = { porEAN };
        console.log(`✅ BASE carregada na memória: ${Object.keys(porEAN).length} EANs`);
        return this.cache.base;
    }

    // ==========================================
    // BUSCAS
    // ==========================================
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

    // ==========================================
    // ESCRITA EM LOTE (Google Sheets API)
    // ==========================================
    async enviarResultadosLote(resultados) {
        await this.initAuth();
        await this.requestToken();

        // Formato esperado na planilha: CODIGO, PRODUTO, CATEGORIA, NOSSO PRECO, PRECO CONCORRENTE
        const valores = resultados.map(res => [
            res.seqProd,
            res.desc,
            res.categoria,
            res.nossoPreco,
            res.precoConcorrente
        ]);

        if (valores.length === 0) return { success: true, total: 0 };

        console.log(`📤 Enviando ${valores.length} linhas para o Google Sheets...`);
        
        // Append: Adiciona os dados ao final da aba "RESULTADO"
        const response = await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: CONFIG.SPREADSHEET_ID,
            range: 'RESULTADO!A1', 
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: valores
            }
        });

        return { success: true, total: response.result.updates.updatedRows };
    }
}

const api = new API();
