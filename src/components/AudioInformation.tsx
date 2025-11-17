import { useRef, useCallback } from 'react';

export interface AudioInfo {
  bpm: number;
  bass: number;
  mid: number;
  treble: number;
  volume: number;
  frequencyData: Uint8Array;
}

interface BPMDetection {
  peaks: number[];
  lastPeakTime: number;
  intervals: number[];
}

export class AudioInformationExtractor {
  private bpmDetection: BPMDetection = { peaks: [], lastPeakTime: 0, intervals: [] };
  private currentBPM: number = 120;

  detectBPM(bass: number): number {
    const currentTime = Date.now();
    
    // Detect peaks in bass frequency
    if (bass > 180 && currentTime - this.bpmDetection.lastPeakTime > 200) {
      this.bpmDetection.peaks.push(currentTime);
      
      if (this.bpmDetection.peaks.length > 1) {
        const interval = currentTime - this.bpmDetection.peaks[this.bpmDetection.peaks.length - 2];
        this.bpmDetection.intervals.push(interval);
        
        // Keep only recent intervals for BPM calculation
        if (this.bpmDetection.intervals.length > 8) {
          this.bpmDetection.intervals.shift();
        }
        
        // Calculate average interval and convert to BPM
        if (this.bpmDetection.intervals.length >= 4) {
          const avgInterval = this.bpmDetection.intervals.reduce((a, b) => a + b, 0) / this.bpmDetection.intervals.length;
          const calculatedBPM = Math.round(60000 / avgInterval);
          
          // Only update BPM if it's within reasonable range
          if (calculatedBPM >= 60 && calculatedBPM <= 200) {
            this.currentBPM = calculatedBPM;
          }
        }
      }
      
      this.bpmDetection.lastPeakTime = currentTime;
      
      // Keep only recent peaks
      if (this.bpmDetection.peaks.length > 10) {
        this.bpmDetection.peaks.shift();
      }
    }
    
    return this.currentBPM;
  }

  extractFrequencyBands(frequencyData: Uint8Array): { bass: number; mid: number; treble: number } {
    const bass = frequencyData.slice(0, 50).reduce((a, b) => a + b, 0) / 50;
    const mid = frequencyData.slice(50, 150).reduce((a, b) => a + b, 0) / 100;
    const treble = frequencyData.slice(150, 256).reduce((a, b) => a + b, 0) / 106;
    
    return { bass, mid, treble };
  }

  calculateVolume(frequencyData: Uint8Array): number {
    const sum = frequencyData.reduce((a, b) => a + b, 0);
    return sum / frequencyData.length;
  }

  analyzeAudio(frequencyData: Uint8Array): AudioInfo {
    const { bass, mid, treble } = this.extractFrequencyBands(frequencyData);
    const bpm = this.detectBPM(bass);
    const volume = this.calculateVolume(frequencyData);

    return {
      bpm,
      bass,
      mid,
      treble,
      volume,
      frequencyData
    };
  }

  reset(): void {
    this.bpmDetection = { peaks: [], lastPeakTime: 0, intervals: [] };
    this.currentBPM = 120;
  }

  getCurrentBPM(): number {
    return this.currentBPM;
  }
}

export function useAudioInformation() {
  const extractorRef = useRef<AudioInformationExtractor>(new AudioInformationExtractor());

  const analyzeAudio = useCallback((frequencyData: Uint8Array): AudioInfo => {
    return extractorRef.current.analyzeAudio(frequencyData);
  }, []);

  const reset = useCallback(() => {
    extractorRef.current.reset();
  }, []);

  const getCurrentBPM = useCallback(() => {
    return extractorRef.current.getCurrentBPM();
  }, []);

  return {
    analyzeAudio,
    reset,
    getCurrentBPM
  };
}

export default function AudioInformation() {
  // This component can be used for displaying audio information
  // Currently just exports the hook and classes
  return null;
}