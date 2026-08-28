// api.js - Versão usando Google Sheets API diretamente
class API {
    constructor() {
        // Usa a API do Google Sheets diretamente
        this.sheetId = '19vs25NDrGCbcfB3sNSmLjPlDS92sbOzwlwjUjmjqPd8';
        this.baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values`;
        // Precisa de uma chave de API
        this.apiKey = 'SUA_CHAVE_API_AQUI';
    }

    async buscarPorEAN(ean) {
        try {
            // Usa a API de Query do Google Sheets
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/BASE!A:I?key=${this.apiKey}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            // Filtra pelo EAN
            const rows = data.values || [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const codAcesso = row[5]; // Coluna F
                if (codAcesso === ean) {
                    // Encontrou, busca na ARVORE
                    const seqProd = row[0];
                    const arvore = await this.buscarArvore(seqProd);
                    return { ...this.formatarProduto(row), ...arvore };
                }
            }
            return null;
        } catch (error) {
            console.error('Erro:', error);
            throw error;
        }
    }

    async buscarArvore(seqProd) {
        try {
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/ARVORE!A:K?key=${this.apiKey}`;
            const response = await fetch(url);
            const data = await response.json();
            
            const rows = data.values || [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row[1] === seqProd) { // Coluna B = SEQ PROD
                    return {
                        seqFml: row[0] || '',
                        desc: row[2] || '',
                        divisao: row[3] || '',
                        comprador: row[4] || '',
                        categoria: row[5] || '',
                        grupo: row[6] || ''
                    };
                }
            }
            return {};
        } catch (error) {
            console.error('Erro ao buscar ARVORE:', error);
            return {};
        }
    }

    formatarProduto(row) {
        return {
            seqProd: row[0] || '',
            desc: row[1] || '',
            tipoCodigo: row[3] || '',
            qtdeEmbalagem: row[4] || '',
            codAcesso: row[5] || '',
            observacao: row[6] || '',
            nossoPreco: row[7] || '',
            precoConcorrente: row[8] || ''
        };
    }
}
