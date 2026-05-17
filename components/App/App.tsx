/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useState, useRef } from 'react';
import { em } from '@lib/engine/engine_manager';
import { screenManager } from '@lib/screen/screen_manager';
import { gfx3Manager } from '@lib/gfx3/gfx3_manager';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Crosshair, 
    Fire, 
    ArrowsOut, 
    Monitor, 
    DeviceMobile, 
    Gear,
    Info,
    BoundingBox
} from 'phosphor-react';
import { GameScreen } from './game/GameScreen';

// --- DESIGN TOKENS ---
const Tokens = {
    colors: {
        surface: 'rgba(0, 0, 0, 0.4)',
        surfaceLight: 'rgba(255, 255, 255, 0.05)',
        border: 'rgba(255, 255, 255, 0.1)',
        content: '#FFFFFF',
        contentDim: 'rgba(255, 255, 255, 0.5)',
        accent: '#FF3E3E',
        accentLight: 'rgba(255, 62, 62, 0.2)',
    },
    fonts: {
        hero: '"Bebas Neue", sans-serif',
        body: '"Inter", sans-serif',
        data: '"Victor Mono", monospace',
    },
    spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
    },
    radius: {
        sm: '4px',
        md: '8px',
        lg: '16px',
        full: '9999px',
    }
};

// --- HOOKS ---
const useWindowSize = () => {
    const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    useEffect(() => {
        const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return size;
};

// --- UI COMPONENTS ---

const StatBlock = ({ label, value, icon: Icon }: { label: string, value: string | number, icon?: any }) => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: Tokens.spacing.xs,
        backgroundColor: Tokens.colors.surface,
        padding: `${Tokens.spacing.sm} ${Tokens.spacing.md}`,
        border: `1px solid ${Tokens.colors.border}`,
        borderRadius: Tokens.radius.md,
        backdropFilter: 'blur(10px)',
        minWidth: '80px',
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {Icon && <Icon size={12} color={Tokens.colors.contentDim} />}
            <span style={{ 
                color: Tokens.colors.contentDim, 
                fontSize: '10px', 
                fontFamily: Tokens.fonts.data, 
                textTransform: 'uppercase', 
                letterSpacing: '1px' 
            }}>{label}</span>
        </div>
        <span style={{ 
            color: Tokens.colors.content, 
            fontSize: '18px', 
            fontFamily: Tokens.fonts.data, 
            fontWeight: 600 
        }}>{value}</span>
    </div>
);

const ActionButton = ({ icon: Icon, onClick, color = Tokens.colors.surface, onDown, onUp, size = 64 }: any) => (
    <motion.button
        whileTap={{ scale: 0.9, backgroundColor: Tokens.colors.accent }}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        style={{
            width: size,
            height: size,
            borderRadius: Tokens.radius.full,
            backgroundColor: color,
            border: `1px solid ${Tokens.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: Tokens.colors.content,
            backdropFilter: 'blur(10px)',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            pointerEvents: 'auto',
            position: 'relative',
        }}
    >
        <Icon size={size * 0.5} weight="bold" />
        <div style={{ position: 'absolute', inset: '-8px', borderRadius: Tokens.radius.full }} />
    </motion.button>
);

const Joystick = ({ onChange }: { onChange: (dir: { x: number, y: number }) => void }) => {
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragging || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let dx = e.clientX - centerX;
        let dy = e.clientY - centerY;
        const maxDist = rect.width / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxDist) { dx *= maxDist / dist; dy *= maxDist / dist; }
        setPos({ x: dx, y: dy });
        onChange({ x: dx / maxDist, y: dy / maxDist });
    };

    return (
        <div 
            ref={containerRef}
            style={{
                width: 140,
                height: 140,
                borderRadius: Tokens.radius.full,
                background: Tokens.colors.surface,
                border: `1px solid ${Tokens.colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                touchNone: 'none',
                pointerEvents: 'auto',
            }}
            onPointerDown={(e) => {
                setDragging(true);
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={() => { setDragging(false); setPos({ x: 0, y: 0 }); onChange({ x: 0, y: 0 }); }}
        >
            <motion.div 
                animate={{ x: pos.x, y: pos.y }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                style={{
                    width: 50,
                    height: 50,
                    borderRadius: Tokens.radius.full,
                    backgroundColor: Tokens.colors.content,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                }}
            />
        </div>
    );
};

// --- MAIN APP ---

const App = () => {
    const [isReady, setIsReady] = useState(false);
    const [enemyCount, setEnemyCount] = useState(3);
    const [playerHp, setPlayerHp] = useState(100);
    const [isZoomed, setIsZoomed] = useState(false);
    const gameScreenRef = useRef<GameScreen | null>(null);
    const { width } = useWindowSize();
    
    const isMobile = width < 600;
    const isTablet = width >= 600 && width < 1024;
    const isDesktop = width >= 1024;

    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();
        document.addEventListener('contextmenu', handleContextMenu);

        const init = async () => {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const screen = new GameScreen();
            gameScreenRef.current = screen;
            screenManager.requestSetScreen(screen);
            await screen.onEnter();
            em.startup(false);
            setIsReady(true);
        };
        init();

        const interval = setInterval(() => {
            if (gameScreenRef.current) {
                const count = gameScreenRef.current.enemies.filter(e => e.hp > 0).length;
                setEnemyCount(count);
                if (gameScreenRef.current.tank) {
                    setPlayerHp(gameScreenRef.current.tank.hp);
                }
                setIsZoomed(gameScreenRef.current.isSniperMode);
            }
        }, 100);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            clearInterval(interval);
            em.pause();
        };
    }, []);

    const handleFire = (type: 'normal' | 'grenade', active: boolean, e: any) => {
        if (e.cancelable) e.preventDefault();
        if (gameScreenRef.current) {
            if (type === 'normal') gameScreenRef.current.virtualFireNormal = active;
            else gameScreenRef.current.virtualFireGrenade = active;
        }
        if (active) (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: Tokens.fonts.body,
        }}>
            <AnimatePresence>
                {!isReady && (
                    <motion.div 
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: '#0A0A0A',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 100,
                            pointerEvents: 'auto',
                        }}
                    >
                        <motion.div
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            style={{
                                fontSize: '24px',
                                fontFamily: Tokens.fonts.hero,
                                color: Tokens.colors.content,
                                letterSpacing: '4px',
                            }}
                        >
                            ARCADEGPU_INIT
                        </motion.div>
                        <div style={{ 
                            width: '200px', 
                            height: '2px', 
                            background: Tokens.colors.border, 
                            marginTop: '16px',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <motion.div 
                                animate={{ x: [-200, 200] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    width: '100px',
                                    background: Tokens.colors.accent
                                }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* TOP BAR */}
            <div style={{
                position: 'absolute',
                top: Tokens.spacing.lg,
                left: Tokens.spacing.lg,
                right: Tokens.spacing.lg,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: Tokens.spacing.sm }}>
                    <h1 style={{
                        margin: 0,
                        fontSize: isMobile ? '32px' : '48px',
                        fontFamily: Tokens.fonts.hero,
                        color: Tokens.colors.content,
                        lineHeight: 1,
                        letterSpacing: '2px',
                        textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                    }}>ARCADE_GPU</h1>
                    <div style={{ display: 'flex', gap: Tokens.spacing.sm }}>
                        <StatBlock label="Enemies" value={enemyCount} icon={Crosshair} />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: Tokens.spacing.sm, pointerEvents: 'auto' }}>
                    {isDesktop && (
                        <div style={{
                            backgroundColor: Tokens.colors.surface,
                            padding: Tokens.spacing.md,
                            color: Tokens.colors.contentDim,
                            textAlign: 'right',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            minWidth: '220px',
                            border: `1px solid ${Tokens.colors.border}`,
                            borderRadius: Tokens.radius.md,
                            backdropFilter: 'blur(10px)',
                        }}>
                            <div style={{ fontSize: '10px', fontFamily: Tokens.fonts.body, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'left', marginBottom: '8px' }}>Control Schema</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: Tokens.fonts.data }}><span>MOVE</span><span>WASD / ARROWS</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: Tokens.fonts.data }}><span>LOOK / AIM</span><span>MOUSE</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: Tokens.fonts.data }}><span>FIRE</span><span>L-CLICK / SPACE</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: Tokens.fonts.data }}><span>GRENADE</span><span>R-CLICK / SHIFT / G</span></div>
                        </div>
                    )}
                    
                    <div style={{
                        backgroundColor: Tokens.colors.surface,
                        padding: Tokens.spacing.md,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: Tokens.spacing.sm,
                        minWidth: '220px',
                        border: `1px solid ${Tokens.colors.border}`,
                        borderRadius: Tokens.radius.md,
                        backdropFilter: 'blur(10px)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: Tokens.colors.contentDim, fontSize: '10px', fontFamily: Tokens.fonts.body, letterSpacing: '1px', textTransform: 'uppercase' }}>COMBAT POINTS</span>
                            <span style={{ color: Tokens.colors.content, fontSize: '18px', fontFamily: Tokens.fonts.data, fontWeight: 600 }}>000000</span>
                        </div>
                    </div>
                    
                    <div style={{
                        backgroundColor: Tokens.colors.surface,
                        padding: Tokens.spacing.md,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: Tokens.spacing.sm,
                        minWidth: '220px',
                        border: `1px solid ${Tokens.colors.border}`,
                        borderRadius: Tokens.radius.md,
                        backdropFilter: 'blur(10px)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: Tokens.colors.contentDim, fontSize: '10px', fontFamily: Tokens.fonts.body, letterSpacing: '1px', textTransform: 'uppercase' }}>HEALTH BAR</span>
                            <span style={{ color: Tokens.colors.content, fontSize: '12px', fontFamily: Tokens.fonts.data, fontWeight: 600 }}>{Math.max(0, Math.floor(playerHp))}%</span>
                        </div>
                        <div style={{ width: '100%', height: '2px', backgroundColor: Tokens.colors.surfaceLight, position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${Math.max(0, Math.min(100, playerHp))}%`, backgroundColor: '#39FF14', boxShadow: '0 0 8px rgba(57, 255, 20, 0.5)' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* RETICLE */}
            <div style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
            }}>
                <motion.div 
                    animate={{ 
                        scale: isZoomed ? 1.5 : 1.0,
                        opacity: isZoomed ? 1.0 : 0.7 
                    }}
                    style={{
                        width: '40px',
                        height: '40px',
                        border: `1px solid ${isZoomed ? Tokens.colors.accent : Tokens.colors.contentDim}`,
                        borderRadius: '2px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <div style={{ position: 'absolute', top: '-10px', left: '50%', width: '1px', height: '6px', background: Tokens.colors.accent }} />
                    <div style={{ position: 'absolute', bottom: '-10px', left: '50%', width: '1px', height: '6px', background: Tokens.colors.accent }} />
                    <div style={{ position: 'absolute', left: '-10px', top: '50%', width: '6px', height: '1px', background: Tokens.colors.accent }} />
                    <div style={{ position: 'absolute', right: '-10px', top: '50%', width: '6px', height: '1px', background: Tokens.colors.accent }} />
                    <div style={{ width: '4px', height: '4px', backgroundColor: Tokens.colors.content, borderRadius: '100%' }} />
                    
                    {isZoomed && (
                        <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            style={{ 
                                position: 'absolute',
                                width: '120%',
                                height: '120%',
                                border: `1px solid ${Tokens.colors.accent}`,
                                opacity: 0.3,
                                borderRadius: '100%'
                            }} 
                        />
                    )}
                </motion.div>
            </div>

            {/* BOTTOM CONTROLS */}
            <div style={{
                position: 'absolute',
                bottom: Tokens.spacing.lg,
                left: Tokens.spacing.lg,
                right: Tokens.spacing.lg,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
            }}>
            </div>

            <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '10px',
                fontFamily: Tokens.fonts.data,
                color: Tokens.colors.contentDim,
                letterSpacing: '1px'
            }}>
            </div>

            {/* GLOBAL STYLES FIX FOR CANVAS */}
            <style>{`
                canvas {
                    image-rendering: auto;
                    width: 100% !important;
                    height: 100% !important;
                }
                * {
                    user-select: none;
                    -webkit-tap-highlight-color: transparent;
                }
            `}</style>
        </div>
    );
};

export default App;
