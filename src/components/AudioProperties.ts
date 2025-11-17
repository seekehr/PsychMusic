export interface AudioProperties {
  bpm: number;
  volume: number;
  frequency: number;
  bassLevel: number;
  midLevel: number;
  trebleLevel: number;
  energy: number;
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private audio: HTMLAudioElement | null = null;

  constructor() {}

  async initialize(audioElement: HTMLAudioElement): Promise<void> {
    this.audio = audioElement;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    
    this.source = this.audioContext.createMediaElementSource(audioElement);
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  getAudioProperties(): AudioProperties {
    if (!this.analyser || !this.dataArray) {
      return {
        bpm: 0,
        volume: 0,
        frequency: 0,
        bassLevel: 0,
        midLevel: 0,
        trebleLevel: 0,
        energy: 0
      };
    }

    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Calculate volume (RMS)
    const volume = this.calculateVolume();
    
    // Calculate frequency bands
    const bassLevel = this.calculateBassLevel();
    const midLevel = this.calculateMidLevel();
    const trebleLevel = this.calculateTrebleLevel();
    
    // Calculate dominant frequency
    const frequency = this.calculateDominantFrequency();
    
    // Calculate energy
    const energy = this.calculateEnergy();
    
    // Simple BPM detection (placeholder - real BPM detection is complex)
    const bpm = this.estimateBPM(energy);

    return {
      bpm,
      volume,
      frequency,
      bassLevel,
      midLevel,
      trebleLevel,
      energy
    };
  }

  private calculateVolume(): number {
    if (!this.dataArray) return 0;
    
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i] * this.dataArray[i];
    }
    return Math.sqrt(sum / this.dataArray.length) / 255;
  }

  private calculateBassLevel(): number {
    if (!this.dataArray) return 0;
    
    const bassEnd = Math.floor(this.dataArray.length * 0.1); // First 10% for bass
    let sum = 0;
    for (let i = 0; i < bassEnd; i++) {
      sum += this.dataArray[i];
    }
    return (sum / bassEnd) / 255;
  }

  private calculateMidLevel(): number {
    if (!this.dataArray) return 0;
    
    const midStart = Math.floor(this.dataArray.length * 0.1);
    const midEnd = Math.floor(this.dataArray.length * 0.6);
    let sum = 0;
    for (let i = midStart; i < midEnd; i++) {
      sum += this.dataArray[i];
    }
    return (sum / (midEnd - midStart)) / 255;
  }

  private calculateTrebleLevel(): number {
    if (!this.dataArray) return 0;
    
    const trebleStart = Math.floor(this.dataArray.length * 0.6);
    let sum = 0;
    for (let i = trebleStart; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    return (sum / (this.dataArray.length - trebleStart)) / 255;
  }

  private calculateDominantFrequency(): number {
    if (!this.dataArray || !this.audioContext) return 0;
    
    let maxIndex = 0;
    let maxValue = 0;
    
    for (let i = 0; i < this.dataArray.length; i++) {
      if (this.dataArray[i] > maxValue) {
        maxValue = this.dataArray[i];
        maxIndex = i;
      }
    }
    
    return (maxIndex * this.audioContext.sampleRate) / (2 * this.dataArray.length);
  }

  private calculateEnergy(): number {
    if (!this.dataArray) return 0;
    
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    return (sum / this.dataArray.length) / 255;
  }

  private estimateBPM(energy: number): number {
    // Simple BPM estimation based on energy fluctuations
    // This is a placeholder - real BPM detection requires beat tracking
    return Math.max(60, Math.min(180, 120 + (energy - 0.5) * 60));
  }

  cleanup(): void {
    if (this.source) {
      this.source.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}