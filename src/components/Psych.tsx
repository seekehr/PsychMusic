import React, { useRef, useEffect, useCallback } from 'react';
import { AudioProperties } from './AudioProperties';

interface PsychProps {
    audioProperties: AudioProperties;
    className?: string;
}

export const Psych: React.FC<PsychProps> = ({ audioProperties, className = '' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    const timeRef = useRef<number>(0);
    const particlesRef = useRef<Particle[]>([]);

    interface Particle {
        x: number;
        y: number;
        vx: number;
        vy: number;
        size: number;
        hue: number;
        life: number;
        maxLife: number;
    }

    const createParticles = useCallback((count: number, centerX: number, centerY: number) => {
        const particles: Particle[] = [];
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 2 + audioProperties.energy * 8;
            particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + audioProperties.volume * 8,
                hue: (i * 360) / count,
                life: 0,
                maxLife: 60 + audioProperties.energy * 120
            });
        }
        return particles;
    }, [audioProperties.energy, audioProperties.volume]);

    const drawPsychedelicVisuals = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = canvas;
        const centerX = width / 2;
        const centerY = height / 2;

        timeRef.current += 0.02;
        const time = timeRef.current;

        // Create trailing effect with subtle color shifts
        const bgHue = (time * 20 + audioProperties.frequency / 50) % 360;
        const trailAlpha = 0.02 + audioProperties.energy * 0.03;
        ctx.fillStyle = `hsla(${bgHue}, 40%, 5%, ${trailAlpha})`;
        ctx.fillRect(0, 0, width, height);

        // Psychedelic spiral patterns
        const spiralCount = 8 + Math.floor(audioProperties.bassLevel * 12);
        const spiralRadius = Math.min(width, height) * 0.3;

        for (let spiral = 0; spiral < spiralCount; spiral++) {
            const spiralOffset = (spiral / spiralCount) * Math.PI * 2;
            const points = 200;

            ctx.beginPath();
            for (let i = 0; i < points; i++) {
                const t = i / points;
                const angle = spiralOffset + t * Math.PI * 8 + time * (1 + audioProperties.frequency / 1000);
                const radius = spiralRadius * t * (1 + audioProperties.volume * 2);

                // Add audio-reactive distortion
                const distortion = Math.sin(t * 20 + time * 5) * audioProperties.energy * 50;
                const finalRadius = radius + distortion;

                const x = centerX + Math.cos(angle) * finalRadius;
                const y = centerY + Math.sin(angle) * finalRadius;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            // Psychedelic colors
            const hue = (spiral * 45 + time * 100 + audioProperties.frequency / 10) % 360;
            const saturation = 80 + audioProperties.energy * 20;
            const lightness = 50 + audioProperties.volume * 30;
            const alpha = 0.6 + audioProperties.volume * 0.4;

            ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
            ctx.lineWidth = 1 + audioProperties.bassLevel * 4;
            ctx.stroke();
        }

        // Kaleidoscope effect
        const segments = 12;
        for (let seg = 0; seg < segments; seg++) {
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate((seg * Math.PI * 2) / segments + time * 0.5);

            // Draw fractal-like patterns
            const fractalDepth = 5;
            for (let depth = 0; depth < fractalDepth; depth++) {
                const scale = 1 - depth * 0.15;
                const offset = depth * 20 + audioProperties.midLevel * 100;

                ctx.save();
                ctx.scale(scale, scale);
                ctx.translate(offset, 0);

                // Morphing shapes
                const shapeRadius = 30 + audioProperties.trebleLevel * 80;
                const sides = 3 + Math.floor(audioProperties.energy * 8);

                ctx.beginPath();
                for (let i = 0; i <= sides; i++) {
                    const angle = (i / sides) * Math.PI * 2;
                    const waveOffset = Math.sin(time * 3 + depth + i) * audioProperties.volume * 20;
                    const x = Math.cos(angle) * (shapeRadius + waveOffset);
                    const y = Math.sin(angle) * (shapeRadius + waveOffset);

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }

                const hue = (depth * 60 + seg * 30 + time * 200) % 360;
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, shapeRadius);
                gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.8)`);
                gradient.addColorStop(1, `hsla(${(hue + 180) % 360}, 100%, 30%, 0.2)`);

                ctx.fillStyle = gradient;
                ctx.fill();

                ctx.restore();
            }

            ctx.restore();
        }

        // Particle system
        if (audioProperties.energy > 0.3) {
            // Create new particles on beats
            if (Math.random() < audioProperties.bassLevel * 0.5) {
                const newParticles = createParticles(
                    Math.floor(5 + audioProperties.energy * 15),
                    centerX + (Math.random() - 0.5) * width * 0.5,
                    centerY + (Math.random() - 0.5) * height * 0.5
                );
                particlesRef.current.push(...newParticles);
            }
        }

        // Update and draw particles
        particlesRef.current = particlesRef.current.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life++;

            // Gravity and audio influence
            particle.vy += 0.1;
            particle.vx += (Math.random() - 0.5) * audioProperties.energy * 2;
            particle.vy += (Math.random() - 0.5) * audioProperties.energy * 2;

            const lifeRatio = particle.life / particle.maxLife;
            const alpha = 1 - lifeRatio;

            if (alpha > 0) {
                ctx.save();
                ctx.globalAlpha = alpha;

                const gradient = ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.size
                );

                const hue = (particle.hue + time * 100) % 360;
                gradient.addColorStop(0, `hsl(${hue}, 100%, 80%)`);
                gradient.addColorStop(1, `hsl(${(hue + 60) % 360}, 100%, 20%)`);

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
                return true;
            }

            return false;
        });

        // Frequency-based wave distortions
        const waveCount = 6;
        for (let wave = 0; wave < waveCount; wave++) {
            ctx.beginPath();
            const waveY = (height / waveCount) * wave;
            const amplitude = 50 + audioProperties.volume * 200;
            const frequency = 0.01 + audioProperties.frequency / 100000;

            for (let x = 0; x <= width; x += 2) {
                const y = waveY +
                    Math.sin(x * frequency + time * 2 + wave) * amplitude * audioProperties.energy +
                    Math.sin(x * frequency * 2 + time * 3) * amplitude * 0.3 * audioProperties.midLevel +
                    Math.sin(x * frequency * 0.5 + time) * amplitude * 0.5 * audioProperties.bassLevel;

                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            const hue = (wave * 60 + time * 150) % 360;
            ctx.strokeStyle = `hsla(${hue}, 90%, 60%, ${0.3 + audioProperties.energy * 0.4})`;
            ctx.lineWidth = 2 + audioProperties.trebleLevel * 6;
            ctx.stroke();
        }

        animationRef.current = requestAnimationFrame(drawPsychedelicVisuals);
    }, [audioProperties, createParticles]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const resizeCanvas = () => {
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
            };

            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);

            // Start animation
            drawPsychedelicVisuals();

            return () => {
                window.removeEventListener('resize', resizeCanvas);
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                }
            };
        }
    }, [drawPsychedelicVisuals]);

    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={`w-full h-full ${className}`}
            style={{ width: '100%', height: '100%' }}
        />
    );
};