export class AudioManager {
    constructor() {
        this.context = null;
        this.isReady = false;
        // Frequency map for "talking"
        this.talkFrequencies = [200, 250, 300, 350, 400];
    }

    init() {
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.isReady = true;
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.context.destination);
        } else if (this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    playTone(freq, type = 'sine', duration = 0.1, volume = 0.1) {
        if (!this.isReady) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.context.currentTime);

        gain.gain.setValueAtTime(volume, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.context.currentTime + duration);
    }

    speak() {
        // Play a random blip for "speaking"
        if (!this.isReady) return;
        const freq = this.talkFrequencies[Math.floor(Math.random() * this.talkFrequencies.length)];
        // Add some variation
        const variation = (Math.random() - 0.5) * 50;
        this.playTone(freq + variation, 'triangle', 0.08, 0.1);
    }

    playJumpSound() {
        if (!this.isReady) return;
        // Slide pitch up
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, this.context.currentTime);
        osc.frequency.linearRampToValueAtTime(300, this.context.currentTime + 0.2);

        gain.gain.setValueAtTime(0.2, this.context.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.context.currentTime + 0.2);
    }

    playImpactSound() {
        if (!this.isReady) return;
        // Noise burst or low frequency thud
        this.playTone(80, 'square', 0.1, 0.3);
    }

    playStepSound() {
        if (!this.isReady) return;
        // Soft noise or high click
        this.playTone(800, 'sine', 0.05, 0.05);
    }
}
