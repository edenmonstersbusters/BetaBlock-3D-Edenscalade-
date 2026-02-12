
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Hexagon, X, Pipette, Upload, Check } from 'lucide-react';

interface CustomColorModalProps {
    initialColor: string;
    onClose: () => void;
    onConfirm: (color: string) => void;
}

export const CustomColorModal: React.FC<CustomColorModalProps> = ({ initialColor, onClose, onConfirm }) => {
    const [color, setColor] = useState(initialColor);
    const [hexInput, setHexInput] = useState(initialColor);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isEyeDropperSupported] = useState(typeof window !== 'undefined' && 'EyeDropper' in window);

    useEffect(() => {
        if (/^#[0-9A-F]{6}$/i.test(hexInput)) {
            setColor(hexInput);
        }
    }, [hexInput]);

    const handleScreenPick = async () => {
        if (!isEyeDropperSupported) return;
        try {
            // @ts-ignore
            const eyeDropper = new window.EyeDropper();
            const result = await eyeDropper.open();
            setColor(result.sRGBHex);
            setHexInput(result.sRGBHex);
        } catch (e) {
            console.log("EyeDropper canceled");
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => setImageSrc(evt.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        if (imageSrc && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            const img = new Image();
            img.onload = () => {
                if (canvasRef.current) {
                    const containerWidth = 300; 
                    const ratio = img.height / img.width;
                    canvasRef.current.width = containerWidth;
                    canvasRef.current.height = containerWidth * ratio;
                    if (ctx) ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
                }
            };
            img.src = imageSrc;
        }
    }, [imageSrc]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            const hex = "#" + [pixel[0], pixel[1], pixel[2]].map(x => x.toString(16).padStart(2, '0')).join('');
            setColor(hex);
            setHexInput(hex);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-gray-950">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <Hexagon size={16} className="text-blue-500" /> Couleur Personnalisée
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={20}/></button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="flex gap-4 items-center">
                        <div 
                            className="w-16 h-16 rounded-full border-4 border-white/10 shadow-inner shrink-0 transition-colors duration-300"
                            style={{ backgroundColor: color }}
                        />
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase block">Code Hexadécimal</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={hexInput} 
                                    onChange={(e) => setHexInput(e.target.value)} 
                                    className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-blue-500 outline-none uppercase"
                                    maxLength={7}
                                />
                                <input 
                                    type="color" 
                                    value={color} 
                                    onChange={(e) => { setColor(e.target.value); setHexInput(e.target.value); }}
                                    className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent p-0" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    <div className="space-y-4">
                        <label className="text-[10px] font-bold text-gray-500 uppercase block">Outils de sélection</label>
                        
                        {isEyeDropperSupported && (
                            <button 
                                onClick={handleScreenPick}
                                className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-white/5 rounded-xl flex items-center justify-center gap-3 text-sm text-gray-300 transition-all font-medium"
                            >
                                <Pipette size={16} className="text-pink-400" />
                                <span>Pipette d'écran</span>
                            </button>
                        )}

                        <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
                            {!imageSrc ? (
                                <label className="flex flex-col items-center justify-center gap-2 p-8 cursor-pointer hover:bg-gray-800 transition-colors group">
                                    <div className="p-3 bg-gray-900 rounded-full group-hover:scale-110 transition-transform">
                                        <Upload size={20} className="text-blue-400" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-400">Importer une image</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                            ) : (
                                <div className="relative group">
                                    <canvas 
                                        ref={canvasRef} 
                                        onClick={handleCanvasClick}
                                        className="w-full cursor-crosshair block"
                                    />
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        <button 
                                            onClick={() => setImageSrc(null)}
                                            className="p-1.5 bg-black/60 text-white rounded-lg backdrop-blur-sm hover:bg-red-600 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/5 bg-gray-950 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-white transition-colors">Annuler</button>
                    <button 
                        onClick={() => { onConfirm(color); onClose(); }}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all"
                    >
                        <Check size={16} />
                        <span>Valider</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
