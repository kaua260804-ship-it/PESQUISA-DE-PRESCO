class API {
    constructor() {
        this.cache = { arvore: null, base: null, timestamp: 0 };
        this.tokenClient = null;
        this.accessToken = null;
        this.gapiIniciada = false;
    }

    // ... (Métodos initAuth, requestToken, carregarArquivoExcel, carregarArvore, carregarBase, buscarPorEAN, buscarPorSeq, buscarPorDescricao mantidos iguais)

    // --- ESCRITA NA PLANILHA "RESULTADO" ---
    async enviarResultadosLote(resultados) {
        await this.initAuth();
        await this.requestToken();

        // Formato esperado na planilha: CODIGO, PRODUTO, CATEGORIA, NOSSO PRECO, PRECO CONCORRENTE, USUARIO, DATA
        const agora = new Date().toLocaleString('pt-BR'); // Data e hora local

        // Pega o usuário logado na sessão
        let usuarioLogado = 'Desconhecido';
        try {
            const sessao = JSON.parse(sessionStorage.getItem(CONFIG.AUTH.SESSION_KEY));
            if (sessao && sessao.usuario) {
                usuarioLogado = sessao.usuario;
            }
        } catch (e) {
            console.warn('Não foi possível obter o usuário logado.');
        }

        // Monta as linhas com os dados
        const valores = resultados.map(res => [
            res.seqProd,           // Coluna A: CODIGO
            res.desc,              // Coluna B: PRODUTO
            res.categoria,         // Coluna C: CATEGORIA
            res.nossoPreco,        // Coluna D: NOSSO PRECO
            res.precoConcorrente,  // Coluna E: PRECO CONCORRENTE
            usuarioLogado,         // Coluna F: USUARIO
            agora                  // Coluna G: DATA
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
