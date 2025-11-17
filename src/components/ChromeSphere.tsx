import { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { type AudioInfo } from './AudioInformation';

interface ChromeSphereProps {
    audioInfo: AudioInfo;
    onStop: () => void;
    isVisible: boolean;
}

export default function ChromeSphere({ audioInfo, onStop, isVisible }: ChromeSphereProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>(0);

    useEffect(() => {
        if (!isVisible) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const baseRadius = Math.min(canvas.width, canvas.height) * 0.15;

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const { bass, mid, treble, volume, bpm } = audioInfo;

            // Calculate dynamic radius based on audio
            const audioIntensity = (bass + mid + treble) / 3;
            const radiusVariation = (audioIntensity / 255) * 50;
            const currentRadius = baseRadius + radiusVariation;

            // Create multiple concentric circles for depth
            const circles = 5;
            for (let i = 0; i < circles; i++) {
                const circleRadius = currentRadius * (0.3 + (i * 0.2));
                const alpha = 0.8 - (i * 0.15);

                // Different frequency bands affect different circles
                let frequencyValue;
                if (i < 2) frequencyValue = bass;
                else if (i < 4) frequencyValue = mid;
                else frequencyValue = treble;

                // Create pulsing effect based on BPM
                const bpmPulse = Math.sin((Date.now() / 1000) * (bpm / 60) * Math.PI) * 0.3 + 1;
                const pulsingRadius = circleRadius * bpmPulse;

                // Color based on frequency content
                const hue = (frequencyValue / 255) * 360 + (Date.now() / 50) % 360;
                const saturation = 70 + (volume / 255) * 30;
                const lightness = 40 + (frequencyValue / 255) * 40;

                // Draw outer glow
                const gradient = ctx.createRadialGradient(
                    centerX, centerY, pulsingRadius * 0.7,
                    centerX, centerY, pulsingRadius * 1.2
                );
                gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`);
                gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness}%, 0)`);

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(centerX, centerY, pulsingRadius * 1.2, 0, Math.PI * 2);
                ctx.fill();

                // Draw main circle with dynamic circumference
                ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness + 20}%, ${alpha})`;
                ctx.lineWidth = 2 + (frequencyValue / 255) * 3;
                ctx.beginPath();

                // Create wavy circumference like the waveform
                const segments = 64;
                for (let j = 0; j <= segments; j++) {
                    const angle = (j / segments) * Math.PI * 2;

                    // Use frequency data to create variations in the circumference
                    const freqIndex = Math.floor((j / segments) * audioInfo.frequencyData.length);
                    const freqValue = audioInfo.frequencyData[freqIndex] || 0;
                    const waveVariation = (freqValue / 255) * 20;

                    const x = centerX + Math.cos(angle) * (pulsingRadius + waveVariation);
                    const y = centerY + Math.sin(angle) * (pulsingRadius + waveVariation);

                    if (j === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.closePath();
                ctx.stroke();

                // Add inner sparkles
                if (i === circles - 1) {
                    const sparkleCount = Math.floor((audioIntensity / 255) * 20);
                    for (let s = 0; s < sparkleCount; s++) {
                        const sparkleAngle = Math.random() * Math.PI * 2;
                        const sparkleDistance = Math.random() * pulsingRadius * 0.8;
                        const sparkleX = centerX + Math.cos(sparkleAngle) * sparkleDistance;
                        const sparkleY = centerY + Math.sin(sparkleAngle) * sparkleDistance;

                        ctx.fillStyle = `hsla(${hue + Math.random() * 60}, 100%, 80%, ${Math.random() * 0.8})`;
                        ctx.beginPath();
                        ctx.arc(sparkleX, sparkleY, Math.random() * 3 + 1, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationFrameRef.current);
        };
    }, [audioInfo, isVisible]);

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

    if (!isVisible) return null;

    return (
        <div className="absolute inset-0 pointer-events-none">
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
            />

            {/* Centered X button that remains pressable */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <button
                    onClick={onStop}
                    className="pointer-events-auto p-4 bg-white bg-opacity-20 backdrop-blur-sm rounded-full shadow-lg hover:bg-opacity-30 transition-all transform hover:scale-110 border border-white border-opacity-30"
                >
                    <X size={32} className="text-white drop-shadow-lg" />
                </button>
            </div>
        </div>
    );
}