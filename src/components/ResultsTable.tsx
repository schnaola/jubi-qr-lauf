import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Participant, Result } from "@/types/participant";

interface ResultsTableProps {
  results: Result[];
  participantName?: string;
  allParticipants?: Participant[];
}

const ResultsTable = ({ results, participantName, allParticipants }: ResultsTableProps) => {
  const renderTable = (participantResults: Result[], showParticipant: boolean = false) => (
    <div className="rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary/10">
            <TableHead className="font-bold text-foreground">Postennummer</TableHead>
            <TableHead className="font-bold text-foreground text-right">Zeit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participantResults.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                Noch keine Posten gescannt
              </TableCell>
            </TableRow>
          ) : (
            participantResults.map((result, index) => (
              <TableRow key={index} className="hover:bg-muted/50">
                <TableCell className="font-medium">{result.checkpoint}</TableCell>
                <TableCell className="text-right font-mono">{result.time}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Card className="overflow-hidden bg-card/95 backdrop-blur">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-foreground">
          Resultate {participantName && `- ${participantName}`}
        </h2>
        
        {allParticipants && allParticipants.length > 1 ? (
          <Tabs defaultValue="current">
            <TabsList className="mb-4">
              <TabsTrigger value="current">Aktuell</TabsTrigger>
              <TabsTrigger value="all">Alle</TabsTrigger>
            </TabsList>
            <TabsContent value="current">
              {renderTable(results)}
            </TabsContent>
            <TabsContent value="all">
              {allParticipants.map((participant) => (
                <div key={participant.id} className="mb-6 last:mb-0">
                  <h3 className="font-semibold mb-2 text-foreground">{participant.name}</h3>
                  {renderTable(participant.results)}
                </div>
              ))}
            </TabsContent>
          </Tabs>
        ) : (
          renderTable(results)
        )}
      </div>
    </Card>
  );
};

export default ResultsTable;
