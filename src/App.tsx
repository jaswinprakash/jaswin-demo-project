
import { useEffect, useRef, useState } from "react";

const App = () => {
    const [metrics, setMetrics] = useState({
        frequency: 0,
        amplitude: 0,
        energy: 0,
    });

    const audioQueueRef = useRef<string[]>([]);
    const isPlayingRef = useRef(false);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const sendToReactNative = (data: object) => {
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
    };

    const cleanupAudioNodes = () => {
        console.log("Cleaning up audio nodes...");

        if (audioElementRef.current) {
            audioElementRef.current.pause();
            audioElementRef.current.currentTime = 0;
            audioElementRef.current.src = "";
            audioElementRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close().catch((err) => console.error("AudioContext close error:", err));
            audioContextRef.current = null;
        }

        if (metricsIntervalRef.current) {
            clearInterval(metricsIntervalRef.current);
            metricsIntervalRef.current = null;
        }

        analyserRef.current = null;
        isPlayingRef.current = false;

        sendToReactNative({ type: "audioStatus", status: "stopped" });

        if (audioQueueRef.current.length > 0) {
            console.log("Playing next audio in queue...");
            const nextAudio = audioQueueRef.current.shift();
            if (nextAudio) {
                handlePlay(nextAudio);
            }
        }
    };

    const calculateMetrics = () => {
        if (!analyserRef.current || !audioContextRef.current) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const frequencyData = new Float32Array(bufferLength);
        const timeDomainData = new Float32Array(bufferLength);

        analyserRef.current.getFloatFrequencyData(frequencyData);
        analyserRef.current.getFloatTimeDomainData(timeDomainData);

        let maxEnergy = 0;
        let weightedFreqSum = 0;
        let totalEnergy = 0;

        for (let i = 0; i < bufferLength; i++) {
            const magnitude = Math.pow(10, frequencyData[i] / 20);
            const frequency = (i * audioContextRef.current.sampleRate) / analyserRef.current.fftSize;
            const energy = magnitude * magnitude;

            weightedFreqSum += frequency * energy;
            totalEnergy += energy;

            if (energy > maxEnergy) {
                maxEnergy = energy;
            }
        }

        const dominantFrequency = totalEnergy > 0 ? weightedFreqSum / totalEnergy : 0;
        const rms = Math.sqrt(
            timeDomainData.reduce((sum, value) => sum + value * value, 0) / timeDomainData.length
        );

        setMetrics({
            frequency: dominantFrequency / 1000,
            amplitude: rms,
            energy: totalEnergy * 10,
        });

        sendToReactNative({
            type: "audioMetrics",
            metrics: {
                frequency: dominantFrequency / 1000,
                amplitude: rms,
                energy: totalEnergy * 10,
            },
        });
    };

    const handlePlay = async (audioUrl: string) => {
        try {
            console.log("Received play request:", audioUrl);

            if (isPlayingRef.current) {
                console.log("Already playing, adding to queue:", audioUrl);
                audioQueueRef.current.push(audioUrl);
                return;
            }

            // ✅ Do NOT call cleanupAudioNodes() here to avoid early "stopped" messages

            audioElementRef.current = new Audio(audioUrl);
            audioElementRef.current.crossOrigin = "anonymous";

            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 2048;

            const source = audioContextRef.current.createMediaElementSource(audioElementRef.current);
            source.connect(analyserRef.current);
            analyserRef.current.connect(audioContextRef.current.destination);

            if (audioContextRef.current.state === "suspended") {
                await audioContextRef.current.resume();
            }

            audioElementRef.current.onplay = () => {
                console.log("Audio started playing...");
                isPlayingRef.current = true;
                sendToReactNative({ type: "audioStatus", status: "playing" });
            };

            await audioElementRef.current.play();

            audioElementRef.current.onended = () => {
                console.log("Audio ended, moving to next...");
                cleanupAudioNodes();
            };

            metricsIntervalRef.current = setInterval(() => {
                if (!isPlayingRef.current || audioElementRef.current?.ended) {
                    cleanupAudioNodes();
                } else {
                    calculateMetrics();
                }
            }, 100);
        } catch (err) {
            console.error("Error playing audio:", err.message);
            sendToReactNative({ type: "audioError", error: err.message });
            cleanupAudioNodes();
        }
    };

    const handleStop = () => {
        console.log("Stop requested...");
        audioQueueRef.current = []; // ✅ Properly clear the queue
        isPlayingRef.current = false;

        if (audioElementRef.current) {
            audioElementRef.current.pause();
            audioElementRef.current.currentTime = 0;
            audioElementRef.current.src = "";
            audioElementRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close().catch((err) => console.error("AudioContext close error:", err));
            audioContextRef.current = null;
        }

        if (metricsIntervalRef.current) {
            clearInterval(metricsIntervalRef.current);
            metricsIntervalRef.current = null;
        }

        analyserRef.current = null;

        sendToReactNative({ type: "audioStatus", status: "stopped" });
        sendToReactNative({ type: "audioMetrics", metrics: { frequency: 0, amplitude: 0, energy: 0 } });

        console.log("All audio stopped.");
    };

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                console.log("Received message from React Native:", data);
                if (data.type === "audioAction") {
                    if (data.action === "play" && data.audioUrl) {
                        handlePlay(data.audioUrl);
                    } else if (data.action === "stop") {
                        handleStop();
                    }
                }
            } catch (error) {
                console.error("Error parsing message:", error);
            }
        };

        window.addEventListener("message", handleMessage);
        return () => {
            window.removeEventListener("message", handleMessage);
            cleanupAudioNodes();
        };
    }, []);

    return <div><h1>Test Page</h1></div>; // No UI needed
};

export default App;

