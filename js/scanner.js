/**
 * SCANNER.JS
 * Lógica do leitor de código de barras
 */

class Scanner {
    constructor() {
        this.html5QrCode = null;
        this.isScanning = false;
        this.onScanCallback = null;
    }

    /**
     * Inicializa o scanner
     * @param {string} elementId - ID do elemento HTML para o scanner
     */
    async initialize(elementId) {
        try {
            // Verifica se Html5Qrcode está disponível
            if (!Html5Qrcode) {
                throw new Error('Biblioteca Html5Qrcode não carregada');
            }

            this.html5QrCode = new Html5Qrcode(elementId);
            console.log('Scanner inicializado');
        } catch (error) {
            console.error('Erro ao inicializar scanner:', error);
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
            
            await this.html5QrCode.start(
                { facingMode: "environment" }, // Usa câmera traseira
                config,
                (decodedText) => {
                    // Código detectado
                    console.log('Código detectado:', decodedText);
                    this.playBeep();
                    
                    if (this.onScanCallback) {
                        this.onScanCallback(decodedText);
                    }
                    
                    // Para o scanner após leitura
                    this.stop();
                },
                (errorMessage) => {
                    // Erro de leitura (ignorado silenciosamente)
                    console.debug('Erro de leitura:', errorMessage);
                }
            );

            console.log('Scanner iniciado');
        } catch (error) {
            console.error('Erro ao iniciar scanner:', error);
            this.isScanning = false;
            throw error;
        }
    }

    /**
     * Para o scanner
     */
    async stop() {
        try {
            if (this.html5QrCode && this.isScanning) {
                await this.html5QrCode.stop();
                this.isScanning = false;
                console.log('Scanner parado');
            }
        } catch (error) {
            console.error('Erro ao parar scanner:', error);
        }
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
            
            oscillator.frequency.value = CONFIG.BEEP_CONFIG.frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(CONFIG.BEEP_CONFIG.volume, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + CONFIG.BEEP_CONFIG.duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + CONFIG.BEEP_CONFIG.duration);
            
            console.log('Beep tocado');
        } catch (error) {
            console.error('Erro ao tocar beep:', error);
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
            console.error('Erro ao verificar câmera:', error);
            return false;
        }
    }
}

// Instância global do scanner
const scanner = new Scanner();