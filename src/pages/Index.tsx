import { useState, useEffect, useCallback } from "react";
import QRScanner from "@/components/QRScanner";
import ResultsTable from "@/components/ResultsTable";
import TimerDisplay from "@/components/TimerDisplay";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import orienteeringBg from "@/assets/orienteering-map-bg.jpg";

interface Result {
  checkpoint: string;
  time: string;
}

const CHECKPOINTS = ["Start", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Ziel"];

const Index = () => {
  const [results, setResults] = useState<Result[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isRunning, setIsRunning] = useState(false);
  const [nextCheckpointIndex, setNextCheckpointIndex] = useState(0);

  // Load saved state from localStorage
  useEffect(() => {
    const savedResults = localStorage.getItem("orienteeringResults");
    const savedStartTime = localStorage.getItem("orienteeringStartTime");
    const savedNextIndex = localStorage.getItem("orienteeringNextIndex");

    if (savedResults) setResults(JSON.parse(savedResults));
    if (savedStartTime) {
      const startTimeNum = parseInt(savedStartTime);
      setStartTime(startTimeNum);
      setIsRunning(true);
    }
    if (savedNextIndex) setNextCheckpointIndex(parseInt(savedNextIndex));
  }, []);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem("orienteeringResults", JSON.stringify(results));
  }, [results]);

  useEffect(() => {
    if (startTime !== null) {
      localStorage.setItem("orienteeringStartTime", startTime.toString());
    } else {
      localStorage.removeItem("orienteeringStartTime");
    }
  }, [startTime]);

  useEffect(() => {
    localStorage.setItem("orienteeringNextIndex", nextCheckpointIndex.toString());
  }, [nextCheckpointIndex]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && startTime !== null) {
      interval = setInterval(() => {
        setCurrentTime(Date.now() - startTime);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const formatTime = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`;
  }, []);

  const handleScan = useCallback(
    (decodedText: string) => {
      const expectedCheckpoint = CHECKPOINTS[nextCheckpointIndex];

      if (decodedText !== expectedCheckpoint) {
        toast.error(`Falscher Posten! Erwartet: ${expectedCheckpoint}`, {
          description: `Gescannt: ${decodedText}`,
        });
        return;
      }

      if (decodedText === "Start") {
        const now = Date.now();
        setStartTime(now);
        setIsRunning(true);
        setResults([{ checkpoint: "Start", time: "00:00.00" }]);
        setNextCheckpointIndex(1);
        toast.success("Timer gestartet!");
      } else if (decodedText === "Ziel") {
        if (startTime === null) {
          toast.error("Timer wurde nicht gestartet!");
          return;
        }
        const finalTime = Date.now() - startTime;
        setIsRunning(false);
        setResults((prev) => [...prev, { checkpoint: "Ziel", time: formatTime(finalTime) }]);
        setNextCheckpointIndex(12);
        toast.success("Ziel erreicht! Timer gestoppt.");
      } else {
        if (startTime === null) {
          toast.error("Timer wurde nicht gestartet!");
          return;
        }
        const interimTime = Date.now() - startTime;
        setResults((prev) => [
          ...prev,
          { checkpoint: decodedText, time: formatTime(interimTime) },
        ]);
        setNextCheckpointIndex((prev) => prev + 1);
        toast.success(`Posten ${decodedText} erfasst!`);
      }
    },
    [nextCheckpointIndex, startTime, formatTime]
  );

  const handleReset = () => {
    setResults([]);
    setStartTime(null);
    setCurrentTime(0);
    setIsRunning(false);
    setNextCheckpointIndex(0);
    localStorage.removeItem("orienteeringResults");
    localStorage.removeItem("orienteeringStartTime");
    localStorage.removeItem("orienteeringNextIndex");
    toast.info("Zurückgesetzt");
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

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <TimerDisplay 
            time={isRunning ? formatTime(currentTime) : "00:00.00"} 
            isRunning={isRunning}
          />
          
          <div className="flex flex-col gap-4">
            <div className="bg-card/95 backdrop-blur rounded-lg p-4 border border-border">
              <h3 className="font-semibold mb-2 text-foreground">Nächster Posten:</h3>
              <p className="text-2xl font-bold text-accent">
                {nextCheckpointIndex < CHECKPOINTS.length 
                  ? CHECKPOINTS[nextCheckpointIndex]
                  : "Fertig!"}
              </p>
            </div>
            <Button 
              onClick={handleReset} 
              variant="outline"
              className="w-full"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Zurücksetzen
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <QRScanner onScan={handleScan} />
          <ResultsTable results={results} />
        </div>
      </div>
    </div>
  );
};

export default Index;
