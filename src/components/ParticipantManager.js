import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Users } from "lucide-react";

const ParticipantManager = ({
  participants,
  activeParticipantId,
  onAddParticipant,
  onSelectParticipant,
}) => {
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    if (newName.trim()) {
      onAddParticipant(newName.trim());
      setNewName("");
    }
  };

  return React.createElement(Card, { className: "p-4 bg-card/95 backdrop-blur" },
    React.createElement("div", { className: "flex items-center gap-2 mb-3" },
      React.createElement(Users, { className: "h-5 w-5 text-primary" }),
      React.createElement("h3", { className: "font-semibold text-foreground" }, "Teilnehmer")
    ),
    React.createElement("div", { className: "space-y-3" },
      React.createElement("div", { className: "flex gap-2" },
        React.createElement(Input, {
          placeholder: "Name eingeben...",
          value: newName,
          onChange: (e) => setNewName(e.target.value),
          onKeyDown: (e) => e.key === "Enter" && handleAdd(),
          className: "flex-1"
        }),
        React.createElement(Button, { onClick: handleAdd, size: "icon" },
          React.createElement(UserPlus, { className: "h-4 w-4" })
        )
      ),
      participants.length > 0 && React.createElement(Select, { 
        value: activeParticipantId || "", 
        onValueChange: onSelectParticipant 
      },
        React.createElement(SelectTrigger, null,
          React.createElement(SelectValue, { placeholder: "Teilnehmer wählen..." })
        ),
        React.createElement(SelectContent, null,
          participants.map((p) =>
            React.createElement(SelectItem, { key: p.id, value: p.id }, p.name)
          )
        )
      )
    )
  );
};

export default ParticipantManager;
