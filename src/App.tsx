// import React, { useEffect, useRef, useState } from 'react';
// import { AudioWaveformIcon as WaveformIcon } from 'lucide-react';

// interface AudioMetrics {
//   frequency: number;
//   amplitude: number;
//   energy: number;
// }

// function App() {
//   const audioRef = useRef<HTMLAudioElement>(null);
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
//   const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
//   const [audioUrl, setAudioUrl] = useState<string>('');
//   const [error, setError] = useState<string>('');
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [metrics, setMetrics] = useState<AudioMetrics>({
//     frequency: 0,
//     amplitude: 0,
//     energy: 0,
//     totalenergy: 0,
//   });
//   const animationRef = useRef<number>();
//   const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

//   const cleanupAudioNodes = () => {
//     if (sourceRef.current) {
//       sourceRef.current.disconnect();
//       sourceRef.current = null;
//     }
//     if (analyser) {
//       analyser.disconnect();
//     }
//     if (animationRef.current) {
//       cancelAnimationFrame(animationRef.current);
//     }
//   };

//   // Send metrics to parent app
//   useEffect(() => {
//     if (metrics.frequency > 0 || metrics.amplitude > 0 || metrics.energy > 0) {
//       window.parent.postMessage({
//         type: 'audioMetrics',
//         metrics
//       }, '*');
//     }
//   }, [metrics]);

//   useEffect(() => {
//     const handleMessage = async (event: MessageEvent) => {
//       try {
//         const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
//         if (data.audioUrl) {
//           cleanupAudioNodes();
//           setAudioUrl(data.audioUrl);
//           setError('');
          
//           if (audioContext?.state === 'suspended') {
//             await audioContext.resume();
//           }
//           // Optional: If autoplay is specified, attempt to play
//         if (data.autoplay && audioRef.current) {
//           try {
//             await audioRef.current.play();
//           } catch (err) {
//             console.error('Autoplay failed:', err);
//           }
//         }
//         }
//       } catch (err) {
//         console.error('Error processing message:', err);
//         setError('Invalid message format');
//       }
//     };

//     window.addEventListener('message', handleMessage);

//     return () => {
//       window.removeEventListener('message', handleMessage);
//       cleanupAudioNodes();
//       audioContext?.close();
//     };
//   }, [audioContext, analyser]);

//   useEffect(() => {
//     const context = new AudioContext();
//     const analyserNode = context.createAnalyser();
//     analyserNode.fftSize = 2048;
//     analyserNode.smoothingTimeConstant = 0.5;
    
//     setAudioContext(context);
//     setAnalyser(analyserNode);

//     return () => {
//       cleanupAudioNodes();
//       context.close();
//     };
//   }, []);

//   const calculateMetrics = (
//     analyserNode: AnalyserNode, 
//     audioCtx: AudioContext, 
//     bufferLength: number
//   ) => {
//     const dataArray = new Float32Array(bufferLength);
//     const timeDataArray = new Float32Array(bufferLength);

//     analyserNode.getFloatFrequencyData(dataArray);
//     analyserNode.getFloatTimeDomainData(timeDataArray);

//     // Calculate dominant frequency using weighted average
//     let maxEnergy = 0;
//     let weightedFreqSum = 0;
//     let totalEnergy = 0;

//     for (let i = 0; i < bufferLength; i++) {
//       // Convert dB to linear scale
//       const magnitude = Math.pow(10, dataArray[i] / 20);
//       const frequency = (i * audioCtx.sampleRate) / analyserNode.fftSize;
//       const energy = magnitude * magnitude;
      
//       weightedFreqSum += frequency * energy;
//       totalEnergy += energy;
      
//       if (energy > maxEnergy) {
//         maxEnergy = energy;
//       }
//     }

//     // Dominant frequency is the weighted average
//     const dominantFrequency = totalEnergy > 0 ? weightedFreqSum / totalEnergy : 0;

//     // Calculate RMS amplitude from time domain
//     let sumSquares = 0;
//     for (let i = 0; i < timeDataArray.length; i++) {
//       sumSquares += timeDataArray[i] * timeDataArray[i];
//     }
//     const rms = Math.sqrt(sumSquares / timeDataArray.length);

//     // Calculate energy using RMS and frequency distribution
//     const normalizedEnergy = Math.min(100, Math.max(0, 
//       (Math.log(totalEnergy + 1) / Math.log(bufferLength)) * 100
//     ));

//     return {
//       frequency: (dominantFrequency/1000),
//       amplitude: (rms),
//       energy: (normalizedEnergy * 10),
//       totalenergy: (totalEnergy * 10),
//     };
//   };

//   useEffect(() => {
//     if (!audioUrl || !audioContext || !analyser || !audioRef.current) return;

//     const setupAudio = async () => {
//       try {
//         cleanupAudioNodes();

//         const audio = audioRef.current!;
//         audio.load();

//         try {
//         await audio.play();
//       } catch (err) {
//         console.error('Autoplay was prevented:', err);
//       }
        
//         const source = audioContext.createMediaElementSource(audio);
//         sourceRef.current = source;
        
//         source.connect(analyser);
//         analyser.connect(audioContext.destination);

//         const canvas = canvasRef.current;
//         if (!canvas) return;

//         const ctx = canvas.getContext('2d');
//         if (!ctx) return;

//         const bufferLength = analyser.frequencyBinCount;

//         const draw = () => {
//           animationRef.current = requestAnimationFrame(draw);

//           if (!isPlaying && audioRef.current?.paused) {
//             return;
//           }

//           // Update metrics
//           const newMetrics = calculateMetrics(analyser, audioContext, bufferLength);
//           setMetrics(newMetrics);
//           // console.log(newMetrics,'newMetrics')
//            if (window.ReactNativeWebView) {
//                 window.ReactNativeWebView.postMessage(JSON.stringify(newMetrics));
//             }

//           // Visualization
//           const visualizationArray = new Uint8Array(bufferLength);
//           analyser.getByteFrequencyData(visualizationArray);

//           ctx.fillStyle = '#1a1a1a';
//           ctx.fillRect(0, 0, canvas.width, canvas.height);

//           const barWidth = (canvas.width / bufferLength) * 2.5;
//           let x = 0;

//           for (let i = 0; i < bufferLength; i++) {
//             const barHeight = (visualizationArray[i] / 255) * canvas.height;
//             const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
//             gradient.addColorStop(0, '#3b82f6');
//             gradient.addColorStop(1, '#60a5fa');
            
//             ctx.fillStyle = gradient;
//             ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
//             x += barWidth + 1;
//           }
//         };

//         // Start animation immediately
//         draw();

//         audio.addEventListener('play', () => {
//           setIsPlaying(true);
//         });

//         audio.addEventListener('pause', () => {
//           setIsPlaying(false);
//         });

//         audio.addEventListener('ended', () => {
//           setIsPlaying(false);
//         });
//       } catch (err) {
//         console.error('Error setting up audio:', err);
//         setError('Failed to set up audio visualization');
//       }
//     };

//     setupAudio();
//   }, [audioUrl, audioContext, analyser]);

//   const handleSampleAudio = async () => {
//     try {
//       if (audioContext?.state === 'suspended') {
//         await audioContext.resume();
//       }
//       setAudioUrl('https://fadhi690mk.github.io/myweddingalbum/bgm.mp3');
//       setError('');
//     } catch (err) {
//       console.error('Error playing sample audio:', err);
//       setError('Failed to play sample audio');
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800 rounded-lg shadow-xl p-6">
//         <div className="flex items-center justify-center mb-6">
//           <WaveformIcon className="w-8 h-8 text-blue-500 mr-2" />
//           <h1 className="text-2xl font-bold text-white">Audio Analyzer</h1>
//         </div>
        
//         <canvas 
//           ref={canvasRef}
//           className="w-full h-48 bg-gray-900 rounded-lg mb-4"
//           width={800}
//           height={200}
//         />

//         <div className="grid grid-cols-3 gap-4 mb-4">
//           <div className="bg-gray-700 p-4 rounded-lg">
//             <h3 className="text-blue-400 text-sm font-semibold mb-1">Frequency</h3>
//             <p className="text-white text-lg font-bold">{metrics.frequency} Hz</p>
//           </div>
//           <div className="bg-gray-700 p-4 rounded-lg">
//             <h3 className="text-blue-400 text-sm font-semibold mb-1">Amplitude</h3>
//             <p className="text-white text-lg font-bold">{metrics.amplitude}%</p>
//           </div>
//           <div className="bg-gray-700 p-4 rounded-lg">
//             <h3 className="text-blue-400 text-sm font-semibold mb-1">Energy</h3>
//             <p className="text-white text-lg font-bold">{metrics.energy}%</p>
//           </div>
//           <div className="bg-gray-700 p-4 rounded-lg">
//             <h3 className="text-blue-400 text-sm font-semibold mb-1">Total Energy</h3>
//             <p className="text-white text-lg font-bold">{metrics.totalenergy}%</p>
//           </div>
//         </div>

//         <button
//           onClick={handleSampleAudio}
//           className="w-full mb-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
//         >
//           Play Sample Audio
//         </button>

//         {audioUrl && (
//           <audio 
//             ref={audioRef}
//             src={audioUrl}
//             className="w-full"
//             controls
//             crossOrigin="anonymous"
//           />
//         )}

//         {error ? (
//           <p className="text-red-400 text-sm mt-4 text-center">
//             Error: {error}
//           </p>
//         ) : !audioUrl ? (
//           <p className="text-gray-400 text-sm mt-4 text-center">
//             Waiting for audio input from React Native app...
//           </p>
//         ) : null}

//         <div className="mt-4 text-gray-400 text-sm text-center">
//           {audioUrl && (
//             <p>Currently playing: {audioUrl}</p>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// export default App;



// import React, { useEffect, useRef, useState } from 'react';
// import { AudioWaveformIcon as WaveformIcon } from 'lucide-react';

// interface AudioMetrics {
//   frequency: number;
//   amplitude: number;
//   energy: number;
//   totalenergy: number;
// }

// function App() {
//   const audioRef = useRef<HTMLAudioElement>(null);
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
//   const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
//   const [audioUrl, setAudioUrl] = useState<string>('');
//   const [error, setError] = useState<string>('');
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [metrics, setMetrics] = useState<AudioMetrics>({
//     frequency: 0,
//     amplitude: 0,
//     energy: 0,
//     totalenergy: 0,
//   });
//   const animationRef = useRef<number>();
//   const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

//   const cleanupAudioNodes = () => {
//     if (sourceRef.current) {
//       sourceRef.current.disconnect();
//       sourceRef.current = null;
//     }
//     if (analyser) {
//       analyser.disconnect();
//     }
//     if (animationRef.current) {
//       cancelAnimationFrame(animationRef.current);
//     }
//   };

//   // Send metrics to parent app
//   useEffect(() => {
//     if (metrics.frequency > 0 || metrics.amplitude > 0 || metrics.energy > 0) {
//       window.parent.postMessage({
//         type: 'audioMetrics',
//         metrics
//       }, '*');
//     }
//   }, [metrics]);

//   useEffect(() => {
//     const handleMessage = async (event: MessageEvent) => {
//       try {
//         const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
//         // Handle audio URL loading
//         if (data.audioUrl) {
//           cleanupAudioNodes();
//           setAudioUrl(data.audioUrl);
//           setError('');
          
//           if (audioContext?.state === 'suspended') {
//             await audioContext.resume();
//           }
//         }

//         // Handle playback commands
//         if (data.type === 'audioCommand') {
//           switch (data.command) {
//             case 'play':
//               if (audioRef.current) {
//                 try {
//                   await audioRef.current.play();
//                   setIsPlaying(true);
//                 } catch (err) {
//                   console.error('Play error:', err);
//                   setError('Failed to play audio');
//                 }
//               }
//               break;
//             case 'pause':
//               if (audioRef.current) {
//                 audioRef.current.pause();
//                 setIsPlaying(false);
//               }
//               break;
//             case 'stop':
//               if (audioRef.current) {
//                 audioRef.current.pause();
//                 audioRef.current.currentTime = 0;
//                 setIsPlaying(false);
//               }
//               break;
//           }
//         }
//       } catch (err) {
//         console.error('Error processing message:', err);
//         setError('Invalid message format');
//       }
//     };

//     window.addEventListener('message', handleMessage);

//     return () => {
//       window.removeEventListener('message', handleMessage);
//       cleanupAudioNodes();
//       audioContext?.close();
//     };
//   }, [audioContext, analyser]);

//   // Audio context and analyser setup
//   useEffect(() => {
//     const context = new AudioContext();
//     const analyserNode = context.createAnalyser();
//     analyserNode.fftSize = 2048;
//     analyserNode.smoothingTimeConstant = 0.5;
    
//     setAudioContext(context);
//     setAnalyser(analyserNode);

//     return () => {
//       cleanupAudioNodes();
//       context.close();
//     };
//   }, []);

//   // Metrics calculation and audio visualization
//   useEffect(() => {
//     if (!audioUrl || !audioContext || !analyser || !audioRef.current) return;

//     const setupAudio = async () => {
//       try {
//         cleanupAudioNodes();

//         const audio = audioRef.current!;
//         audio.load();
        
//         const source = audioContext.createMediaElementSource(audio);
//         sourceRef.current = source;
        
//         source.connect(analyser);
//         analyser.connect(audioContext.destination);

//         const canvas = canvasRef.current;
//         if (!canvas) return;

//         const ctx = canvas.getContext('2d');
//         if (!ctx) return;

//         const bufferLength = analyser.frequencyBinCount;

//         const draw = () => {
//           animationRef.current = requestAnimationFrame(draw);

//           if (!isPlaying && audioRef.current?.paused) {
//             return;
//           }

//           // Update metrics
//           const newMetrics = calculateMetrics(analyser, audioContext, bufferLength);
//           setMetrics(newMetrics);
          
//           if (window.ReactNativeWebView) {
//             window.ReactNativeWebView.postMessage(JSON.stringify(newMetrics));
//           }

//           // Visualization
//           const visualizationArray = new Uint8Array(bufferLength);
//           analyser.getByteFrequencyData(visualizationArray);

//           ctx.fillStyle = '#1a1a1a';
//           ctx.fillRect(0, 0, canvas.width, canvas.height);

//           const barWidth = (canvas.width / bufferLength) * 2.5;
//           let x = 0;

//           for (let i = 0; i < bufferLength; i++) {
//             const barHeight = (visualizationArray[i] / 255) * canvas.height;
//             const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
//             gradient.addColorStop(0, '#3b82f6');
//             gradient.addColorStop(1, '#60a5fa');
            
//             ctx.fillStyle = gradient;
//             ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
//             x += barWidth + 1;
//           }
//         };

//         // Start animation immediately
//         draw();

//         audio.addEventListener('play', () => {
//           setIsPlaying(true);
//         });

//         audio.addEventListener('pause', () => {
//           setIsPlaying(false);
//         });

//         audio.addEventListener('ended', () => {
//           setIsPlaying(false);
//         });
//       } catch (err) {
//         console.error('Error setting up audio:', err);
//         setError('Failed to set up audio visualization');
//       }
//     };

//     setupAudio();
//   }, [audioUrl, audioContext, analyser]);

//    const calculateMetrics = (
//     analyserNode: AnalyserNode, 
//     audioCtx: AudioContext, 
//     bufferLength: number
//   ) => {
//     const dataArray = new Float32Array(bufferLength);
//     const timeDataArray = new Float32Array(bufferLength);

//     analyserNode.getFloatFrequencyData(dataArray);
//     analyserNode.getFloatTimeDomainData(timeDataArray);

//     // Calculate dominant frequency using weighted average
//     let maxEnergy = 0;
//     let weightedFreqSum = 0;
//     let totalEnergy = 0;

//     for (let i = 0; i < bufferLength; i++) {
//       // Convert dB to linear scale
//       const magnitude = Math.pow(10, dataArray[i] / 20);
//       const frequency = (i * audioCtx.sampleRate) / analyserNode.fftSize;
//       const energy = magnitude * magnitude;
      
//       weightedFreqSum += frequency * energy;
//       totalEnergy += energy;
      
//       if (energy > maxEnergy) {
//         maxEnergy = energy;
//       }
//     }

//     // Dominant frequency is the weighted average
//     const dominantFrequency = totalEnergy > 0 ? weightedFreqSum / totalEnergy : 0;

//     // Calculate RMS amplitude from time domain
//     let sumSquares = 0;
//     for (let i = 0; i < timeDataArray.length; i++) {
//       sumSquares += timeDataArray[i] * timeDataArray[i];
//     }
//     const rms = Math.sqrt(sumSquares / timeDataArray.length);

//     // Calculate energy using RMS and frequency distribution
//     const normalizedEnergy = Math.min(100, Math.max(0, 
//       (Math.log(totalEnergy + 1) / Math.log(bufferLength)) * 100
//     ));

//     return {
//       frequency: (dominantFrequency/1000),
//       amplitude: (rms),
//       energy: (normalizedEnergy * 10),
//       totalenergy: (totalEnergy * 10),
//     };
//   };

//   return (
//     <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800 rounded-lg shadow-xl p-6">
//         <div className="flex items-center justify-center mb-6">
//           <WaveformIcon className="w-8 h-8 text-blue-500 mr-2" />
//           <h1 className="text-2xl font-bold text-white">Audio Analyzer</h1>
//         </div>
        
//         <canvas 
//           ref={canvasRef}
//           className="w-full h-48 bg-gray-900 rounded-lg mb-4"
//           width={800}
//           height={200}
//         />

//         <div className="grid grid-cols-3 gap-4 mb-4">
//           <div className="bg-gray-700 p-4 rounded-lg">
//             <h3 className="text-blue-400 text-sm font-semibold mb-1">Frequency</h3>
//             <p className="text-white text-lg font-bold">{metrics.frequency} Hz</p>
//           </div>
//           <div className="bg-gray-700 p-4 rounded-lg">
//             <h3 className="text-blue-400 text-sm font-semibold mb-1">Amplitude</h3>
//             <p className="text-white text-lg font-bold">{metrics.amplitude}%</p>
//           </div>
//           <div className="bg-gray-700 p-4 rounded-lg">
//             <h3 className="text-blue-400 text-sm font-semibold mb-1">Energy</h3>
//             <p className="text-white text-lg font-bold">{metrics.energy}%</p>
//           </div>
//           <div className="bg-gray-700 p-4 rounded-lg">
//             <h3 className="text-blue-400 text-sm font-semibold mb-1">Total Energy</h3>
//             <p className="text-white text-lg font-bold">{metrics.totalenergy}%</p>
//           </div>
//         </div>

//         {audioUrl && (
//           <audio 
//             ref={audioRef}
//             src={audioUrl}
//             className="hidden"
//             crossOrigin="anonymous"
//           />
//         )}

//         {error && (
//           <p className="text-red-400 text-sm mt-4 text-center">
//             Error: {error}
//           </p>
//         )}

//         <div className="mt-4 text-gray-400 text-sm text-center">
//           {audioUrl && (
//             <p>Currently playing: {audioUrl}</p>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// export default App;





// import React, { useEffect, useRef, useState } from 'react';
// import { AudioWaveformIcon as WaveformIcon } from 'lucide-react';

// interface AudioMetrics {
//   frequency: number;
//   amplitude: number;
//   energy: number;
//   totalenergy: number;
// }

// function App() {
//   const audioRef = useRef<HTMLAudioElement>(null);
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
//   const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
//   const [audioUrl, setAudioUrl] = useState<string>('');
//   const [error, setError] = useState<string>('');
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [metrics, setMetrics] = useState<AudioMetrics>({
//     frequency: 0,
//     amplitude: 0,
//     energy: 0,
//     totalenergy: 0,
//   });
//   const animationRef = useRef<number>();
//   const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

//   const cleanupAudioNodes = () => {
//     try {
//       if (sourceRef.current) {
//         sourceRef.current.disconnect();
//         sourceRef.current = null;
//       }
//       if (analyser) {
//         analyser.disconnect();
//       }
//       if (animationRef.current) {
//         cancelAnimationFrame(animationRef.current);
//       }
//     } catch (err) {
//       console.error('Cleanup error:', err);
//     }
//   };

//   // Send metrics to parent app
//   useEffect(() => {
//     if (metrics.frequency > 0 || metrics.amplitude > 0 || metrics.energy > 0) {
//       try {
//         window.parent.postMessage({
//           type: 'audioMetrics',
//           metrics
//         }, '*');
//       } catch (err) {
//         console.error('Metrics posting error:', err);
//       }
//     }
//   }, [metrics]);

//   useEffect(() => {
//     const handleMessage = async (event: MessageEvent) => {
//       try {
//         console.log('Received message:', event.data);
        
//         const data = typeof event.data === 'string' 
//           ? JSON.parse(event.data) 
//           : event.data;
        
//         // Ensure we have a valid data object
//         if (!data) {
//           console.error('Received undefined or null data');
//           return;
//         }

//         // Handle audio URL loading
//         if (data.audioUrl || data.type === 'audioLoaded') {
//           // Cleanup previous audio nodes
//           cleanupAudioNodes();

//           // Set new audio URL
//           const url = data.audioUrl || 'https://fadhi690mk.github.io/myweddingalbum/bgm.mp3';
//           setAudioUrl(url);
//           setError('');

//           // Ensure audio context is ready
//           if (!audioContext) {
//             const context = new AudioContext();
//             const analyserNode = context.createAnalyser();
//             analyserNode.fftSize = 2048;
//             analyserNode.smoothingTimeConstant = 0.5;
            
//             setAudioContext(context);
//             setAnalyser(analyserNode);
//           }

//           // Resume audio context if suspended
//           if (audioContext?.state === 'suspended') {
//             await audioContext.resume();
//           }

//           // Attempt to play audio
//           if (audioRef.current) {
//             try {
//               audioRef.current.src = url;
//               await audioRef.current.play();
//               setIsPlaying(true);
//             } catch (err) {
//               console.error('Autoplay failed:', err);
//               setError('Failed to play audio');
//             }
//           }
//         }

//         // Handle playback commands
//         if (data.type === 'audioCommand') {
//           switch (data.command) {
//             case 'play':
//               if (audioRef.current) {
//                 try {
//                   await audioRef.current.play();
//                   setIsPlaying(true);
//                 } catch (err) {
//                   console.error('Play error:', err);
//                 }
//               }
//               break;
//             case 'pause':
//               if (audioRef.current) {
//                 audioRef.current.pause();
//                 setIsPlaying(false);
//               }
//               break;
//             case 'stop':
//               if (audioRef.current) {
//                 audioRef.current.pause();
//                 audioRef.current.currentTime = 0;
//                 setIsPlaying(false);
//               }
//               break;
//           }
//         }
//       } catch (err) {
//         console.error('Error processing message:', err);
//         setError('Invalid message format');
//       }
//     };

//     window.addEventListener('message', handleMessage);

//     return () => {
//       window.removeEventListener('message', handleMessage);
//       cleanupAudioNodes();
//       audioContext?.close();
//     };
//   }, [audioContext, analyser]);

//   // Audio visualization and metrics
//   useEffect(() => {
//     if (!audioUrl || !audioContext || !analyser || !audioRef.current) return;

//     const setupAudio = async () => {
//       try {
//         cleanupAudioNodes();

//         const audio = audioRef.current!;
//         audio.load();
        
//         const source = audioContext.createMediaElementSource(audio);
//         sourceRef.current = source;
        
//         source.connect(analyser);
//         analyser.connect(audioContext.destination);

//         const canvas = canvasRef.current;
//         if (!canvas) return;

//         const ctx = canvas.getContext('2d');
//         if (!ctx) return;

//         const bufferLength = analyser.frequencyBinCount;

//         const draw = () => {
//           animationRef.current = requestAnimationFrame(draw);

//           if (!isPlaying && audioRef.current?.paused) {
//             return;
//           }

//           // Update metrics
//           const newMetrics = calculateMetrics(analyser, audioContext, bufferLength);
//           setMetrics(newMetrics);
          
//           if (window.ReactNativeWebView) {
//             try {
//               window.ReactNativeWebView.postMessage(JSON.stringify(newMetrics));
//             } catch (err) {
//               console.error('Failed to post metrics:', err);
//             }
//           }

//           // Visualization
//           const visualizationArray = new Uint8Array(bufferLength);
//           analyser.getByteFrequencyData(visualizationArray);

//           ctx.fillStyle = '#1a1a1a';
//           ctx.fillRect(0, 0, canvas.width, canvas.height);

//           const barWidth = (canvas.width / bufferLength) * 2.5;
//           let x = 0;

//           for (let i = 0; i < bufferLength; i++) {
//             const barHeight = (visualizationArray[i] / 255) * canvas.height;
//             const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
//             gradient.addColorStop(0, '#3b82f6');
//             gradient.addColorStop(1, '#60a5fa');
            
//             ctx.fillStyle = gradient;
//             ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
//             x += barWidth + 1;
//           }
//         };

//         // Start animation immediately
//         draw();

//         audio.addEventListener('play', () => {
//           setIsPlaying(true);
//         });

//         audio.addEventListener('pause', () => {
//           setIsPlaying(false);
//         });

//         audio.addEventListener('ended', () => {
//           setIsPlaying(false);
//         });
//       } catch (err) {
//         console.error('Error setting up audio:', err);
//         setError('Failed to set up audio visualization');
//       }
//     };

//     setupAudio();
//   }, [audioUrl, audioContext, analyser]);

//   // Metrics calculation method
//   const calculateMetrics = (
//     analyserNode: AnalyserNode, 
//     audioCtx: AudioContext, 
//     bufferLength: number
//   ) => {
//     const dataArray = new Float32Array(bufferLength);
//     const timeDataArray = new Float32Array(bufferLength);

//     analyserNode.getFloatFrequencyData(dataArray);
//     analyserNode.getFloatTimeDomainData(timeDataArray);

//     // Calculate dominant frequency using weighted average
//     let maxEnergy = 0;
//     let weightedFreqSum = 0;
//     let totalEnergy = 0;

//     for (let i = 0; i < bufferLength; i++) {
//       // Convert dB to linear scale
//       const magnitude = Math.pow(10, dataArray[i] / 20);
//       const frequency = (i * audioCtx.sampleRate) / analyserNode.fftSize;
//       const energy = magnitude * magnitude;
      
//       weightedFreqSum += frequency * energy;
//       totalEnergy += energy;
      
//       if (energy > maxEnergy) {
//         maxEnergy = energy;
//       }
//     }

//     // Dominant frequency is the weighted average
//     const dominantFrequency = totalEnergy > 0 ? weightedFreqSum / totalEnergy : 0;

//     // Calculate RMS amplitude from time domain
//     let sumSquares = 0;
//     for (let i = 0; i < timeDataArray.length; i++) {
//       sumSquares += timeDataArray[i] * timeDataArray[i];
//     }
//     const rms = Math.sqrt(sumSquares / timeDataArray.length);

//     // Calculate energy using RMS and frequency distribution
//     const normalizedEnergy = Math.min(100, Math.max(0, 
//       (Math.log(totalEnergy + 1) / Math.log(bufferLength)) * 100
//     ));

//     return {
//       frequency: (dominantFrequency/1000),
//       amplitude: (rms),
//       energy: (normalizedEnergy * 10),
//       totalenergy: (totalEnergy * 10),
//     };
//   };

//   return (
//     <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800 rounded-lg shadow-xl p-6">
//         <div className="flex items-center justify-center mb-6">
//           <WaveformIcon className="w-8 h-8 text-blue-500 mr-2" />
//           <h1 className="text-2xl font-bold text-white">Audio Analyzer</h1>
//         </div>
        
//         <canvas 
//           ref={canvasRef}
//           className="w-full h-48 bg-gray-900 rounded-lg mb-4"
//           width={800}
//           height={200}
//         />

//         <div className="grid grid-cols-3 gap-4 mb-4">
//           <div className="bg-gray-700 p-4 rounded-lg">
//             <h3 className="text-blue-400 text-sm font-semibold mb-1">Frequency</h3>
//             <p className="text-white text-lg font-bold">{metrics.frequency} Hz</p>
//           </div>
//           <div className="bg-gray-700 p-4 rounded-lg">
//             <h3 className="text-blue-400 text-sm font-semibold mb-1">Amplitude</h3>
//             <p className="text-white text-lg font-bold">{metrics.amplitude}%</p>
//           </div>
//           <div className="bg-gray-700 p-4 rounded-lg">
//             <h3 className="text-blue-400 text-sm font-semibold mb-1">Energy</h3>
//             <p className="text-white text-lg font-bold">{metrics.energy}%</p>
//           </div>
//           <div className="bg-gray-700 p-4 rounded-lg">
//             <h3 className="text-blue-400 text-sm font-semibold mb-1">Total Energy</h3>
//             <p className="text-white text-lg font-bold">{metrics.totalenergy}%</p>
//           </div>
//         </div>

//         {audioUrl && (
//           <audio 
//             ref={audioRef}
//             src={audioUrl}
//             className="hidden"
//             crossOrigin="anonymous"
//           />
//         )}

//         {error && (
//           <p className="text-red-400 text-sm mt-4 text-center">
//             Error: {error}
//           </p>
//         )}

//         <div className="mt-4 text-gray-400 text-sm text-center">
//           {audioUrl && (
//             <p>Currently playing: {audioUrl}</p>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// export default App;



import React, { useEffect, useRef, useState } from 'react';

function App() {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const animationRef = useRef(null);

  const cleanupAudioNodes = () => {
    if (audioContext) {
      audioContext.close().catch((err) => console.error('AudioContext close error:', err));
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const calculateMetrics = (analyserNode) => {
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteFrequencyData(dataArray);

    const totalEnergy = dataArray.reduce((sum, value) => sum + value, 0);
    const amplitude = Math.max(...dataArray);
    const energy = totalEnergy / bufferLength;
    const frequencyIndex = dataArray.indexOf(amplitude);
    const frequency = (frequencyIndex * audioContext.sampleRate) / analyserNode.fftSize;

    return { frequency, amplitude, energy, totalEnergy };
  };

  const setupAudio = (audioUrl) => {
    if (audioContext) {
      cleanupAudioNodes();
    }

    const context = new AudioContext();
    const analyserNode = context.createAnalyser();
    analyserNode.fftSize = 2048;
    setAudioContext(context);
    setAnalyser(analyserNode);

    const source = context.createMediaElementSource(audioRef.current);
    source.connect(analyserNode);
    analyserNode.connect(context.destination);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyserNode.frequencyBinCount;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      const metrics = calculateMetrics(analyserNode);
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify(metrics));
      } catch (err) {
        console.error('Failed to post metrics:', err);
      }

      const visualizationArray = new Uint8Array(bufferLength);
      analyserNode.getByteFrequencyData(visualizationArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = visualizationArray[i];
        ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
        ctx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth;
      }
    };

    draw();
  };

  useEffect(() => {
    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'audioLoaded' && audioRef.current) {
          const audioUrl = data.audioUrl;
          audioRef.current.src = audioUrl;
          audioRef.current.play();
          setupAudio(audioUrl);
        }
      } catch (err) {
        console.error('Error processing message:', err);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      cleanupAudioNodes();
    };
  }, []);

  return (
    <div className="analyzer-app">
      <canvas ref={canvasRef} width={800} height={200} style={{ backgroundColor: '#000' }} />
      <audio ref={audioRef} crossOrigin="anonymous" />
    </div>
  );
}

export default App;
