import { useRef, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAudioInformation, type AudioInfo } from './AudioInformation';
import ChromeSphere from './ChromeSphere';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'circle' | 'square' | 'triangle';
  scale: number;
  scaleVel: number;
  rotation: number;
  rotationVel: number;
  saturation: number;
  lightness: number;
}

export default function AudioVisualizer() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioInfo, setAudioInfo] = useState<AudioInfo>({
    bpm: 120,
    bass: 0,
    mid: 0,
    treble: 0,
    volume: 0,
    frequencyData: new Uint8Array(0)
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>(0);

  const { analyzeAudio, reset: resetAudioInfo } = useAudioInformation();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'audio/mpeg' || file.type === 'audio/wav')) {
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);

      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration > 10) {
          setAudioFile(file);
          playAudio(file);
        } else {
          alert('Please select an audio file longer than 10 seconds');
        }
      });
    }
  };

  const playAudio = (file: File) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    const audio = new Audio(URL.createObjectURL(file));
    audioRef.current = audio;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyserRef.current = analyser;

    const source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    dataArrayRef.current = dataArray;

    audio.play();
    setIsPlaying(true);
    startVisualization();

    audio.addEventListener('ended', handleStop);
  };

  const handleStop = () => {
    cancelAnimationFrame(animationFrameRef.current);
    particlesRef.current = [];

    // Reset audio information
    resetAudioInfo();
    setAudioInfo({
      bpm: 120,
      bass: 0,
      mid: 0,
      treble: 0,
      volume: 0,
      frequencyData: new Uint8Array(0)
    });

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    setIsPlaying(false);
    setAudioFile(null);
  };

  const getFrequencyColor = (bass: number, mid: number, treble: number): { hue: number; saturation: number; lightness: number } => {
    const bassHue = 280;
    const midHue = 120;
    const trebleHue = 20;
    const noiseHue = Math.random() * 360;

    if (bass > 200) {
      return {
        hue: bassHue + (Math.random() - 0.5) * 60,
        saturation: 100,
        lightness: 40 + Math.random() * 30
      };
    }
    if (mid > 180) {
      return {
        hue: midHue + (Math.random() - 0.5) * 60,
        saturation: 90 + Math.random() * 10,
        lightness: 45 + Math.random() * 25
      };
    }
    if (treble > 160) {
      return {
        hue: trebleHue + (Math.random() - 0.5) * 80,
        saturation: 85 + Math.random() * 15,
        lightness: 50 + Math.random() * 20
      };
    }

    return {
      hue: noiseHue,
      saturation: 70 + Math.random() * 30,
      lightness: 55 + Math.random() * 20
    };
  };



  const createParticles = (audioInfo: AudioInfo) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { bass, mid, treble, bpm } = audioInfo;

    const maxParticles = 250;
    const particleCount = Math.max(1, Math.floor((bass / 255) * 8) + Math.floor((mid / 255) * 5) + Math.floor((treble / 255) * 3) + 1);

    // Calculate BPM-based speed multiplier (reduced by 0.3 factor)
    const bpmSpeedMultiplier = (bpm / 120) * 0.3; // Reduced speed factor
    const baseSpeed = (mid / 255) * 6 + 1.5; // Reduced base speed

    for (let i = 0; i < particleCount; i++) {
      const types: Array<'circle' | 'square' | 'triangle'> = ['circle', 'square', 'triangle'];
      const type = types[Math.floor(Math.random() * types.length)];

      const speed = baseSpeed * bpmSpeedMultiplier;
      const angle = Math.random() * Math.PI * 2;
      const { hue, saturation, lightness } = getFrequencyColor(bass, mid, treble);

      const explosionForce = Math.pow(bass / 255, 0.5) * 6 * bpmSpeedMultiplier; // Reduced explosion force

      const particle: Particle = {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: Math.cos(angle) * speed * (0.5 + Math.random() * 1.5) + (Math.random() - 0.5) * explosionForce,
        vy: Math.sin(angle) * speed * (0.5 + Math.random() * 1.5) + (Math.random() - 0.5) * explosionForce,
        size: Math.pow(bass / 255, 0.3) * Math.random() * 25 + 4,
        hue,
        saturation,
        lightness,
        alpha: 0.7 + Math.random() * 0.3,
        life: 0,
        maxLife: 50 + Math.random() * 80,
        type,
        scale: 1.1 + Math.random() * 1.2,
        scaleVel: -0.012 - Math.random() * 0.018,
        rotation: Math.random() * Math.PI * 2,
        rotationVel: (Math.random() - 0.5) * 0.15 * bpmSpeedMultiplier // BPM-based rotation
      };

      particlesRef.current.push(particle);
    }

    if (particlesRef.current.length > maxParticles) {
      particlesRef.current = particlesRef.current.slice(-maxParticles);
    }
  };

  const drawParticle = (ctx: CanvasRenderingContext2D, particle: Particle) => {
    ctx.save();

    const lifeFade = 1 - particle.life / particle.maxLife;
    const easeOut = Math.pow(lifeFade, 2);
    ctx.globalAlpha = particle.alpha * easeOut;

    const scaledSize = particle.size * particle.scale;
    ctx.fillStyle = `hsl(${particle.hue}, ${particle.saturation}%, ${particle.lightness}%)`;
    ctx.strokeStyle = `hsl(${(particle.hue + 180) % 360}, ${Math.max(0, particle.saturation - 20)}%, ${Math.min(100, particle.lightness + 20)}%)`;
    ctx.lineWidth = Math.max(1, scaledSize * 0.1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);

    if (particle.type === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, scaledSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = `hsla(${(particle.hue + 90) % 360}, 100%, 60%, ${0.5 * easeOut})`;
      ctx.lineWidth = scaledSize * 0.08;
      ctx.beginPath();
      ctx.arc(0, 0, scaledSize * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    } else if (particle.type === 'square') {
      ctx.fillRect(-scaledSize / 2, -scaledSize / 2, scaledSize, scaledSize);
      ctx.strokeRect(-scaledSize / 2, -scaledSize / 2, scaledSize, scaledSize);

      ctx.strokeStyle = `hsla(${(particle.hue + 120) % 360}, 100%, 70%, ${0.4 * easeOut})`;
      ctx.lineWidth = scaledSize * 0.06;
      ctx.strokeRect(-scaledSize * 0.55 / 2, -scaledSize * 0.55 / 2, scaledSize * 0.55, scaledSize * 0.55);
    } else if (particle.type === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(0, -scaledSize);
      ctx.lineTo(scaledSize, scaledSize);
      ctx.lineTo(-scaledSize, scaledSize);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = `hsla(${(particle.hue - 60) % 360}, 100%, 60%, ${0.45 * easeOut})`;
      ctx.lineWidth = scaledSize * 0.09;
      ctx.beginPath();
      ctx.moveTo(0, -scaledSize * 0.5);
      ctx.lineTo(scaledSize * 0.5, scaledSize * 0.5);
      ctx.lineTo(-scaledSize * 0.5, scaledSize * 0.5);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  };

  const startVisualization = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      const frequencyData = dataArrayRef.current;

      // Analyze audio using the AudioInformation component
      const currentAudioInfo = analyzeAudio(frequencyData);
      setAudioInfo(currentAudioInfo);

      const { bass, mid, treble, bpm } = currentAudioInfo;

      const trailAlpha = 0.03 + (bass / 255) * 0.08 + (treble / 255) * 0.05;
      ctx.fillStyle = `rgba(0, 0, 5, ${trailAlpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (Math.random() < 0.1) {
        ctx.fillStyle = `rgba(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, 255, 0.01)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      createParticles(currentAudioInfo);

      particlesRef.current = particlesRef.current.filter(particle => {
        // BPM-based movement multiplier (reduced)
        const bpmMovementMultiplier = (bpm / 120) * 0.4;

        particle.x += particle.vx * bpmMovementMultiplier;
        particle.y += particle.vy * bpmMovementMultiplier;
        particle.life++;

        particle.vx *= 0.975;
        particle.vy *= 0.975;
        particle.vy += 0.15 * bpmMovementMultiplier; // Reduced gravity effect

        particle.scale += particle.scaleVel;
        particle.scale = Math.max(0.1, particle.scale);
        particle.rotation += particle.rotationVel * bpmMovementMultiplier;
        particle.hue = (particle.hue + 0.5 * bpmMovementMultiplier) % 360;
        particle.lightness = Math.min(100, particle.lightness + 0.1);

        if (particle.x < -100) particle.x = canvas.width + 100;
        if (particle.x > canvas.width + 100) particle.x = -100;
        if (particle.y < -100) particle.y = canvas.height + 100;
        if (particle.y > canvas.height + 100) particle.y = -100;

        drawParticle(ctx, particle);

        return particle.life < particle.maxLife;
      });

      const waveHeight = (bass / 255) * 100 + 50;
      ctx.strokeStyle = `hsla(${(Date.now() / 20) % 360}, 100%, 50%, 0.3)`;
      ctx.lineWidth = 3;
      ctx.beginPath();

      for (let i = 0; i < currentAudioInfo.frequencyData.length; i++) {
        const x = (i / currentAudioInfo.frequencyData.length) * canvas.width;
        const y = canvas.height - (currentAudioInfo.frequencyData[i] / 255) * waveHeight;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* ChromeSphere with centered X button */}
      <ChromeSphere 
        audioInfo={audioInfo}
        onStop={handleStop}
        isVisible={isPlaying}
      />

      {/* File selection button when no audio is playing */}
      {!audioFile && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-4 bg-white text-black font-semibold rounded-lg shadow-lg hover:bg-gray-100 transition-all transform hover:scale-105"
            >
              Choose Audio
            </button>
          </div>
        </div>
      )}

      {/* BPM Display */}
      {isPlaying && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
          <div className="text-sm font-medium">BPM: {audioInfo.bpm}</div>
          <div className="text-xs opacity-75">Volume: {Math.round(audioInfo.volume)}</div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,audio/mpeg,audio/wav"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
