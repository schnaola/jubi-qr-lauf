import { useState } from "react";
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

  return (
    <Card className="p-4 bg-card/95 backdrop-blur">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Teilnehmer</h3>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Name eingeben..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1"
          />
          <Button onClick={handleAdd} size="icon">
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>

        {participants.length > 0 && (
          <Select value={activeParticipantId || ""} onValueChange={onSelectParticipant}>
            <SelectTrigger>
              <SelectValue placeholder="Teilnehmer wählen..." />
            </SelectTrigger>
            <SelectContent>
              {participants.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </Card>
  );
};

export default ParticipantManager;
