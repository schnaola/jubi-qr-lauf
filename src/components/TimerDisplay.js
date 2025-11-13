import React from "react";
import { Card } from "@/components/ui/card";
import { Timer } from "lucide-react";

const TimerDisplay = ({ time, isRunning, participantName }) => {
  return React.createElement(Card, { className: "p-8 bg-card/95 backdrop-blur text-center" },
    React.createElement("div", { className: "flex items-center justify-center gap-3 mb-2" },
      React.createElement(Timer, { 
        className: `h-8 w-8 ${isRunning ? "text-accent animate-pulse" : "text-muted-foreground"}` 
      }),
      React.createElement("h3", { className: "text-lg font-semibold text-foreground" },
        "Timer ", participantName && `- ${participantName}`
      )
    ),
    React.createElement("div", { className: "text-5xl font-bold font-mono text-foreground mt-4" },
      time
    ),
    React.createElement("p", { className: "text-sm text-muted-foreground mt-2" },
      isRunning ? "Läuft..." : "Bereit"
    )
  );
};

export default TimerDisplay;
