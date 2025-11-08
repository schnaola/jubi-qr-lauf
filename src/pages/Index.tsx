import { useState, useEffect, useCallback } from "react";
import QRScanner from "@/components/QRScanner";
import ResultsTable from "@/components/ResultsTable";
import TimerDisplay from "@/components/TimerDisplay";
import ParticipantManager from "@/components/ParticipantManager";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import orienteeringBg from "@/assets/orienteering-map-bg.jpg";
import { Participant } from "@/types/participant";

const CHECKPOINTS = ["Start", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Ziel"];

const Index = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const activeParticipant = participants.find((p) => p.id === activeParticipantId);

  // Load saved state from localStorage
  useEffect(() => {
    const savedParticipants = localStorage.getItem("orienteeringParticipants");
    const savedActiveId = localStorage.getItem("orienteeringActiveParticipant");

    if (savedParticipants) {
      setParticipants(JSON.parse(savedParticipants));
    }
    if (savedActiveId) {
      setActiveParticipantId(savedActiveId);
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem("orienteeringParticipants", JSON.stringify(participants));
  }, [participants]);

  useEffect(() => {
    if (activeParticipantId) {
      localStorage.setItem("orienteeringActiveParticipant", activeParticipantId);
    }
  }, [activeParticipantId]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeParticipant?.startTime !== null && activeParticipant?.startTime !== undefined) {
      interval = setInterval(() => {
        setCurrentTime(Date.now() - activeParticipant.startTime!);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [activeParticipant?.startTime]);

  const formatTime = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`;
  }, []);

  const handleAddParticipant = (name: string) => {
    const newParticipant: Participant = {
      id: Date.now().toString(),
      name,
      results: [],
      startTime: null,
      nextCheckpointIndex: 0,
    };
    setParticipants((prev) => [...prev, newParticipant]);
    setActiveParticipantId(newParticipant.id);
    toast.success(`${name} hinzugefügt`);
  };

  const handleSelectParticipant = (id: string) => {
    setActiveParticipantId(id);
    const participant = participants.find((p) => p.id === id);
    if (participant) {
      toast.info(`${participant.name} ausgewählt`);
    }
  };

  const updateActiveParticipant = (updates: Partial<Participant>) => {
    if (!activeParticipantId) return;
    setParticipants((prev) =>
      prev.map((p) => (p.id === activeParticipantId ? { ...p, ...updates } : p))
    );
  };

  const playSound = (frequency: number, duration: number = 200) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  };

  const handleScan = useCallback(
    (decodedText: string) => {
      if (!activeParticipant) {
        toast.error("Bitte wähle zuerst einen Teilnehmer!");
        playSound(200, 300);
        return;
      }

      const expectedCheckpoint = CHECKPOINTS[activeParticipant.nextCheckpointIndex];

      if (decodedText !== expectedCheckpoint) {
        toast.error(`Falscher Posten! Erwartet: ${expectedCheckpoint}`, {
          description: `Gescannt: ${decodedText}`,
        });
        playSound(200, 300);
        return;
      }

      playSound(800, 150);

      if (decodedText === "Start") {
        const now = Date.now();
        updateActiveParticipant({
          startTime: now,
          results: [{ checkpoint: "Start", time: "00:00.00" }],
          nextCheckpointIndex: 1,
        });
        toast.success("Timer gestartet!");
      } else if (decodedText === "Ziel") {
        if (activeParticipant.startTime === null) {
          toast.error("Timer wurde nicht gestartet!");
          playSound(200, 300);
          return;
        }
        const finalTime = Date.now() - activeParticipant.startTime;
        updateActiveParticipant({
          results: [...activeParticipant.results, { checkpoint: "Ziel", time: formatTime(finalTime) }],
          nextCheckpointIndex: 12,
          startTime: null,
        });
        toast.success("Ziel erreicht! Timer gestoppt.");
      } else {
        if (activeParticipant.startTime === null) {
          toast.error("Timer wurde nicht gestartet!");
          playSound(200, 300);
          return;
        }
        const interimTime = Date.now() - activeParticipant.startTime;
        updateActiveParticipant({
          results: [
            ...activeParticipant.results,
            { checkpoint: decodedText, time: formatTime(interimTime) },
          ],
          nextCheckpointIndex: activeParticipant.nextCheckpointIndex + 1,
        });
        toast.success(`Posten ${decodedText} erfasst!`);
      }
    },
    [activeParticipant, activeParticipantId, formatTime]
  );

  const handleReset = () => {
    if (!activeParticipant) return;
    updateActiveParticipant({
      results: [],
      startTime: null,
      nextCheckpointIndex: 0,
    });
    toast.info(`${activeParticipant.name} zurückgesetzt`);
  };

  const handleResetAll = () => {
    setParticipants([]);
    setActiveParticipantId(null);
    localStorage.removeItem("orienteeringParticipants");
    localStorage.removeItem("orienteeringActiveParticipant");
    toast.info("Alles zurückgesetzt");
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed relative"
      style={{ backgroundImage: `url(${orienteeringBg})` }}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-5xl">
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-2">
            Christians 50-Jahre-Jubiläum
          </h1>
          <h2 className="text-xl md:text-2xl text-primary font-semibold">
            GKZ Büro OL
          </h2>
        </header>

        <div className="mb-6">
          <ParticipantManager
            participants={participants}
            activeParticipantId={activeParticipantId}
            onAddParticipant={handleAddParticipant}
            onSelectParticipant={handleSelectParticipant}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <TimerDisplay 
            time={activeParticipant?.startTime ? formatTime(currentTime) : "00:00.00"} 
            isRunning={!!activeParticipant?.startTime}
            participantName={activeParticipant?.name}
          />
          
          <div className="flex flex-col gap-4">
            <div className="bg-card/95 backdrop-blur rounded-lg p-4 border border-border">
              <h3 className="font-semibold mb-2 text-foreground">Nächster Posten:</h3>
              <p className="text-2xl font-bold text-accent">
                {activeParticipant && activeParticipant.nextCheckpointIndex < CHECKPOINTS.length 
                  ? CHECKPOINTS[activeParticipant.nextCheckpointIndex]
                  : activeParticipant ? "Fertig!" : "-"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleReset} 
                variant="outline"
                className="flex-1"
                disabled={!activeParticipant}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Teilnehmer zurücksetzen
              </Button>
              <Button 
                onClick={handleResetAll} 
                variant="destructive"
                className="flex-1"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Alles zurücksetzen
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <QRScanner onScan={handleScan} />
          <ResultsTable 
            results={activeParticipant?.results || []} 
            participantName={activeParticipant?.name}
            allParticipants={participants}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
