
import React, { useState, useCallback, useEffect } from 'react';
import { AppStep, ImageFile } from './types';
import { Button } from './components/Button';
import { processPersonaSwap } from './services/gemini';

const MAX_SOURCE_IMAGES = 10;
const MAX_TARGET_IMAGES = 3;

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD_SOURCE);
  const [sourceImages, setSourceImages] = useState<ImageFile[]>([]);
  const [targetImages, setTargetImages] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSourceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // FIX: Cast Array.from result to File[] to ensure correct type inference for downstream operations
    const files = Array.from(e.target.files || []) as File[];
    if (sourceImages.length + files.length > MAX_SOURCE_IMAGES) {
      alert(`You can only upload up to ${MAX_SOURCE_IMAGES} source images.`);
      return;
    }

    const newImages: ImageFile[] = await Promise.all(
      files.map(async (file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file),
        base64: await fileToBase64(file),
        status: 'pending' as const
      }))
    );

    setSourceImages(prev => [...prev, ...newImages]);
  };

  const handleTargetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // FIX: Cast Array.from result to File[] to ensure correct type inference for downstream operations
    const files = Array.from(e.target.files || []) as File[];
    if (targetImages.length + files.length > MAX_TARGET_IMAGES) {
      alert(`You can only upload up to ${MAX_TARGET_IMAGES} target persona images.`);
      return;
    }

    const newImages: ImageFile[] = await Promise.all(
      files.map(async (file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file),
        base64: await fileToBase64(file),
        status: 'pending' as const
      }))
    );

    setTargetImages(prev => [...prev, ...newImages]);
  };

  const removeSource = (id: string) => {
    setSourceImages(prev => prev.filter(img => img.id !== id));
  };

  const removeTarget = (id: string) => {
    setTargetImages(prev => prev.filter(img => img.id !== id));
  };

  const startSwapping = async () => {
    if (sourceImages.length === 0 || targetImages.length === 0) return;
    
    setStep(AppStep.PROCESSING);
    setIsProcessing(true);
    setCurrentIndex(0);

    const targetBase64List = targetImages.map(img => img.base64);

    for (let i = 0; i < sourceImages.length; i++) {
      setCurrentIndex(i);
      setSourceImages(prev => {
        const next = [...prev];
        next[i].status = 'processing';
        return next;
      });

      try {
        const resultUrl = await processPersonaSwap(sourceImages[i].base64, targetBase64List);
        setSourceImages(prev => {
          const next = [...prev];
          next[i].status = 'completed';
          next[i].result = resultUrl;
          return next;
        });
      } catch (err: any) {
        console.error(err);
        setSourceImages(prev => {
          const next = [...prev];
          next[i].status = 'error';
          next[i].error = err.message || "Unknown error occurred";
          return next;
        });
      }
    }

    setIsProcessing(false);
    setStep(AppStep.RESULTS);
  };

  const reset = () => {
    setSourceImages([]);
    setTargetImages([]);
    setStep(AppStep.UPLOAD_SOURCE);
    setCurrentIndex(0);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-5xl mb-12 text-center">
        <div className="inline-block p-3 rounded-2xl bg-blue-600/10 mb-4 border border-blue-500/20">
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          PersonaSwap AI
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Advanced persona injection. Upload source scenes and target portraits to swap identity, hair, and clothing while keeping everything else perfectly intact.
        </p>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-5xl bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl">
        
        {/* Progress Stepper */}
        <div className="flex items-center justify-between mb-10 w-full max-w-md mx-auto">
          {[
            { step: AppStep.UPLOAD_SOURCE, label: 'Source' },
            { step: AppStep.UPLOAD_TARGET, label: 'Target' },
            { step: AppStep.RESULTS, label: 'Done' }
          ].map((item, idx) => {
            const isActive = step === item.step;
            const isCompleted = (idx === 0 && (step === AppStep.UPLOAD_TARGET || step === AppStep.PROCESSING || step === AppStep.RESULTS)) ||
                                (idx === 1 && (step === AppStep.PROCESSING || step === AppStep.RESULTS));
            
            return (
              <React.Fragment key={item.step}>
                <div className="flex flex-col items-center relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                    isActive ? 'border-blue-500 bg-blue-500 text-white' : 
                    isCompleted ? 'border-emerald-500 bg-emerald-500 text-white' : 
                    'border-slate-700 text-slate-500'
                  }`}>
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${isActive ? 'text-blue-400' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                </div>
                {idx < 2 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-colors duration-300 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step: Upload Source Images */}
        {step === AppStep.UPLOAD_SOURCE && (
          <section className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold mb-2">Upload Source Images</h2>
              <p className="text-slate-500 text-sm">Add 1-10 photos you want to edit. We'll swap the character in these.</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {sourceImages.map(img => (
                <div key={img.id} className="relative aspect-square group">
                  <img src={img.preview} className="w-full h-full object-cover rounded-xl border border-slate-700" alt="Source" />
                  <button 
                    onClick={() => removeSource(img.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              {sourceImages.length < MAX_SOURCE_IMAGES && (
                <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl hover:border-blue-500 hover:bg-blue-500/5 transition-all cursor-pointer">
                  <input type="file" multiple accept="image/*" onChange={handleSourceUpload} className="hidden" />
                  <svg className="w-8 h-8 text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg>
                  <span className="text-xs font-medium text-slate-500">Upload</span>
                </label>
              )}
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-800">
              <Button 
                disabled={sourceImages.length === 0} 
                onClick={() => setStep(AppStep.UPLOAD_TARGET)}
              >
                Next Step
              </Button>
            </div>
          </section>
        )}

        {/* Step: Upload Target Persona */}
        {step === AppStep.UPLOAD_TARGET && (
          <section className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold mb-2">Upload Target Persona</h2>
              <p className="text-slate-500 text-sm">Add 1-3 photos of the target person (different angles recommended).</p>
            </div>
            
            <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
              {targetImages.map(img => (
                <div key={img.id} className="relative aspect-square group">
                  <img src={img.preview} className="w-full h-full object-cover rounded-xl border border-slate-700 ring-2 ring-blue-500/50" alt="Target" />
                  <button 
                    onClick={() => removeTarget(img.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              {targetImages.length < MAX_TARGET_IMAGES && (
                <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl hover:border-blue-500 hover:bg-blue-500/5 transition-all cursor-pointer">
                  <input type="file" multiple accept="image/*" onChange={handleTargetUpload} className="hidden" />
                  <svg className="w-8 h-8 text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg>
                  <span className="text-xs font-medium text-slate-500">Add Image</span>
                </label>
              )}
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-800">
              <Button variant="ghost" onClick={() => setStep(AppStep.UPLOAD_SOURCE)}>
                Back
              </Button>
              <Button 
                disabled={targetImages.length === 0} 
                onClick={startSwapping}
                className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20"
              >
                Start Persona Swap
              </Button>
            </div>
          </section>
        )}

        {/* Step: Processing */}
        {step === AppStep.PROCESSING && (
          <div className="flex flex-col items-center justify-center py-20 space-y-8">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold">Processing Image {currentIndex + 1} of {sourceImages.length}</h3>
              <p className="text-slate-400">Our AI is meticulously swapping persona details...</p>
            </div>
            
            {/* Visual Queue */}
            <div className="flex gap-2 w-full max-w-md">
              {sourceImages.map((img, idx) => (
                <div 
                  key={img.id} 
                  className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                    idx < currentIndex ? 'bg-emerald-500' :
                    idx === currentIndex ? 'bg-blue-500 animate-pulse' :
                    'bg-slate-700'
                  }`} 
                />
              ))}
            </div>
          </div>
        )}

        {/* Step: Results */}
        {step === AppStep.RESULTS && (
          <section className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Results Ready</h2>
              <p className="text-slate-500">Verify the transformations below.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {sourceImages.map(img => (
                <div key={img.id} className="bg-slate-800/30 rounded-2xl overflow-hidden border border-slate-700 p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Original</span>
                      <img src={img.preview} className="w-full aspect-[4/3] object-cover rounded-lg" alt="Original" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-blue-400">Swapped</span>
                      {img.status === 'completed' && img.result ? (
                        <img src={img.result} className="w-full aspect-[4/3] object-cover rounded-lg border border-blue-500/30 shadow-xl" alt="Swapped" />
                      ) : img.status === 'error' ? (
                        <div className="w-full aspect-[4/3] flex items-center justify-center bg-red-900/10 border border-red-900/30 rounded-lg text-red-500 p-4 text-center">
                          <p className="text-xs">{img.error}</p>
                        </div>
                      ) : (
                        <div className="w-full aspect-[4/3] flex items-center justify-center bg-slate-900/50 rounded-lg animate-pulse">
                          <span className="text-xs text-slate-600">Skipped</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {img.status === 'completed' && img.result && (
                    <a 
                      href={img.result} 
                      download={`persona_swap_${img.id}.png`}
                      className="block w-full text-center py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                    >
                      Download Result
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-8 border-t border-slate-800">
              <Button onClick={reset} variant="secondary">
                Start Over
              </Button>
            </div>
          </section>
        )}
      </main>

      {/* Footer Disclaimer */}
      <footer className="w-full max-w-5xl mt-12 py-8 text-center border-t border-slate-800/50">
        <p className="text-slate-600 text-xs uppercase tracking-widest font-semibold mb-2">Powered by Google Gemini 2.5 Flash</p>
        <p className="text-slate-500 text-xs">This tool is for creative demonstration. Ensure you have the rights to use the uploaded images.</p>
      </footer>
    </div>
  );
};

export default App;
