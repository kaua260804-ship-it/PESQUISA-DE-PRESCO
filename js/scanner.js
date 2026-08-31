/**
 * SCANNER.JS
 * Lógica do leitor de código de barras
 */

class Scanner {
    constructor() {
        this.html5QrCode = null;
        this.isScanning = false;
        this.onScanCallback = null;
        this.scannerElementId = 'qr-reader';
    }

    /**
     * Inicializa o scanner
     * @param {string} elementId - ID do elemento HTML para o scanner
     */
    async initialize(elementId) {
        try {
            // Verifica se Html5Qrcode está disponível
            if (typeof Html5Qrcode === 'undefined') {
                throw new Error('Biblioteca Html5Qrcode não carregada');
            }

            this.scannerElementId = elementId || 'qr-reader';
            this.html5QrCode = new Html5Qrcode(this.scannerElementId);
            console.log('✅ Scanner inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar scanner:', error);
            throw error;
        }
    }

    /**
     * Inicia a leitura de código de barras
     * @param {Function} onScanCallback - Callback chamado quando um código é lido
     */
    async start(onScanCallback) {
        try {
            if (!this.html5QrCode) {
                throw new Error('Scanner não inicializado');
            }

            if (this.isScanning) {
                await this.stop();
            }

            this.onScanCallback = onScanCallback;
            this.isScanning = true;

            const config = CONFIG.SCANNER_CONFIG;
            
            // Limpa o elemento antes de iniciar
            const element = document.getElementById(this.scannerElementId);
            if (element) {
                element.innerHTML = '';
            }
            
            await this.html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    // Código detectado
                    console.log('📷 Código detectado:', decodedText);
                    this.playBeep();
                    
                    if (this.onScanCallback) {
                        this.onScanCallback(decodedText);
                    }
                    
                    // PARA O SCANNER AUTOMATICAMENTE após a leitura
                    this.stop();
                },
                (errorMessage) => {
                    // Erro de leitura (ignorado silenciosamente)
                    console.debug('Erro de leitura:', errorMessage);
                }
            );

            console.log('📷 Scanner iniciado');
        } catch (error) {
            console.error('❌ Erro ao iniciar scanner:', error);
            this.isScanning = false;
            throw error;
        }
    }

    /**
     * Para o scanner e limpa a área
     */
    async stop() {
        try {
            if (this.html5QrCode && this.isScanning) {
                await this.html5QrCode.stop();
                this.isScanning = false;
                console.log('📷 Scanner parado');
                
                // Limpa o elemento do scanner
                const element = document.getElementById(this.scannerElementId);
                if (element) {
                    element.innerHTML = '';
                }
                
                // Fecha a área do scanner (chama o callback de fechamento)
                if (typeof this.onStopCallback === 'function') {
                    this.onStopCallback();
                }
            }
        } catch (error) {
            console.error('❌ Erro ao parar scanner:', error);
            this.isScanning = false;
        }
    }

    /**
     * Define callback para quando o scanner parar
     */
    onStop(callback) {
        this.onStopCallback = callback;
    }

    /**
     * Toca um beep de feedback
     */
    playBeep() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = CONFIG.BEEP_CONFIG.frequency || 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(CONFIG.BEEP_CONFIG.volume || 0.5, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + (CONFIG.BEEP_CONFIG.duration || 0.2));
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + (CONFIG.BEEP_CONFIG.duration || 0.2));
            
            console.log('🔊 Beep tocado');
        } catch (error) {
            console.error('❌ Erro ao tocar beep:', error);
        }
    }

    /**
     * Verifica se o dispositivo tem câmera
     * @returns {Promise<boolean>} True se tem câmera
     */
    async hasCamera() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                return false;
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('❌ Erro ao verificar câmera:', error);
            return false;
        }
    }
}

// Instância global do scanner
const scanner = new Scanner();
