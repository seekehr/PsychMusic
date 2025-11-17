import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { AudioAnalyzer, AudioProperties } from './AudioProperties';
import { Psych } from './Psych';

interface AudioVisualizerProps {
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number>();
  const analyzerRef = useRef<AudioAnalyzer>();

  const [isPlaying, setIsPlaying] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioProperties, setAudioProperties] = useState<AudioProperties>({
    bpm: 0,
    volume: 0,
    frequency: 0,
    bassLevel: 0,
    midLevel: 0,
    trebleLevel: 0,
    energy: 0
  });

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'audio/mp3' || file.type === 'audio/wav' || file.type === 'audio/mpeg')) {
      setAudioFile(file);

      if (audioRef.current) {
        const url = URL.createObjectURL(file);
        audioRef.current.src = url;
        audioRef.current.load();
      }
    }
  }, []);

  const startVisualization = useCallback(async () => {
    if (!audioRef.current || !audioFile) return;

    try {
      analyzerRef.current = new AudioAnalyzer();
      await analyzerRef.current.initialize(audioRef.current);

      audioRef.current.play();
      setIsPlaying(true);

      // Start animation loop
      const animate = () => {
        if (analyzerRef.current) {
          const properties = analyzerRef.current.getAudioProperties();
          setAudioProperties(properties);
          drawVisualization(properties);
        }
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    } catch (error) {
      console.error('Error starting visualization:', error);
    }
  }, [audioFile]);

  // Auto-play when file is selected
  useEffect(() => {
    if (audioFile && audioRef.current) {
      audioRef.current.onloadeddata = () => {
        startVisualization();
      };
    }
  }, [audioFile, startVisualization]);

  const stopVisualization = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    if (analyzerRef.current) {
      analyzerRef.current.cleanup();
    }

    setIsPlaying(false);
    setAudioFile(null);

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  const drawVisualization = useCallback((properties: AudioProperties) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear canvas completely
    ctx.clearRect(0, 0, width, height);

    // Calculate dynamic values based on audio properties
    const baseRadius = Math.min(width, height) * 0.25;
    const radiusMultiplier = 1 + properties.volume * 2;
    const radius = baseRadius * radiusMultiplier;

    // Color based on frequency and energy
    const hue = (properties.frequency / 1000) % 360;
    const saturation = 70 + properties.energy * 30;
    const lightness = 40 + properties.volume * 40;
    const time = Date.now() * 0.001;

    // Central sphere with energy-based effects and volume-based border
    const centralRadius = radius * 0.8;
    const centralGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, centralRadius);
    centralGradient.addColorStop(0, `hsla(${hue}, 90%, 70%, 0.8)`);
    centralGradient.addColorStop(0.5, `hsla(${(hue + 60) % 360}, 80%, 50%, 0.4)`);
    centralGradient.addColorStop(1, `hsla(${(hue + 120) % 360}, 70%, 30%, 0.1)`);

    ctx.fillStyle = centralGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, centralRadius, 0, Math.PI * 2);
    ctx.fill();

    // Add volume-based border to the central sphere
    const borderWidth = 2 + properties.volume * 8;
    const borderAlpha = 0.6 + properties.volume * 0.4;
    ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${borderAlpha})`;
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.arc(centerX, centerY, centralRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Create rainbow line around the circumference with white filling
    const numPoints = 128; // More points for smoother line
    const circumferenceRadius = centralRadius + 20;
    const points: { x: number; y: number; hue: number }[] = [];

    // Generate points for the rainbow line
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const volumeEffect = properties.volume * 30 + Math.sin(time * 4 + i * 0.1) * 15;
      const pointRadius = circumferenceRadius + volumeEffect;

      const x = centerX + Math.cos(angle) * pointRadius;
      const y = centerY + Math.sin(angle) * pointRadius;
      const pointHue = (i * (360 / numPoints) + time * 30) % 360;

      points.push({ x, y, hue: pointHue });
    }

    // Fill the area between the circle and the rainbow line with white
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();

    // Start from the circle edge
    ctx.arc(centerX, centerY, centralRadius, 0, Math.PI * 2);

    // Create the outer boundary (rainbow line path)
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();

    // Use even-odd fill rule to create the ring
    ctx.fill('evenodd');

    // Draw the rainbow line
    ctx.lineWidth = 3 + properties.volume * 5;

    for (let i = 0; i < points.length; i++) {
      const currentPoint = points[i];
      const nextPoint = points[(i + 1) % points.length];

      // Create gradient for each line segment
      const segmentGradient = ctx.createLinearGradient(
        currentPoint.x, currentPoint.y,
        nextPoint.x, nextPoint.y
      );

      const alpha = 0.8 + properties.volume * 0.2;
      segmentGradient.addColorStop(0, `hsla(${currentPoint.hue}, 100%, 60%, ${alpha})`);
      segmentGradient.addColorStop(1, `hsla(${nextPoint.hue}, 100%, 60%, ${alpha})`);

      ctx.strokeStyle = segmentGradient;
      ctx.beginPath();
      ctx.moveTo(currentPoint.x, currentPoint.y);
      ctx.lineTo(nextPoint.x, nextPoint.y);
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const resizeCanvas = () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      };

      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      return () => window.removeEventListener('resize', resizeCanvas);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (analyzerRef.current) {
        analyzerRef.current.cleanup();
      }
    };
  }, []);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Original visualization canvas (background layer) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full bg-black"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Psychedelic visualization (foreground layer) */}
      {isPlaying && (
        <div className="absolute inset-0 w-full h-full">
          <Psych audioProperties={audioProperties} className="w-full h-full" />
        </div>
      )}

      <audio ref={audioRef} className="hidden" />

      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="absolute inset-0 flex items-center justify-center">
        {!isPlaying ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-8 py-4 bg-white hover:bg-gray-100 text-black font-semibold rounded-lg shadow-lg transition-colors duration-200 z-10"
          >
            Choose Audio
          </button>
        ) : (
          <button
            onClick={stopVisualization}
            className="w-16 h-16 bg-white bg-opacity-20 backdrop-blur-md border border-white border-opacity-30 hover:bg-opacity-30 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 z-10"
            style={{
              backdropFilter: 'blur(10px)',
              background: 'rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            }}
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* Footer text - only show when audio button is present */}
      {!isPlaying && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <p className="text-gray-400 text-sm font-medium">
            Made @ seekehr.github.io
          </p>
        </div>
      )}

      {/* Audio properties display (for debugging) */}
      {isPlaying && (
        <div className="absolute top-4 left-4 text-white text-sm bg-black bg-opacity-50 p-2 rounded z-10">
          <div>BPM: {audioProperties.bpm.toFixed(0)}</div>
          <div>Volume: {(audioProperties.volume * 100).toFixed(1)}%</div>
          <div>Frequency: {audioProperties.frequency.toFixed(0)}Hz</div>
          <div>Bass: {(audioProperties.bassLevel * 100).toFixed(1)}%</div>
          <div>Mid: {(audioProperties.midLevel * 100).toFixed(1)}%</div>
          <div>Treble: {(audioProperties.trebleLevel * 100).toFixed(1)}%</div>
        </div>
      )}
    </div>
  );
};