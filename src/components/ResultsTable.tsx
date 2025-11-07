import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

interface Result {
  checkpoint: string;
  time: string;
}

interface ResultsTableProps {
  results: Result[];
}

const ResultsTable = ({ results }: ResultsTableProps) => {
  return (
    <Card className="overflow-hidden bg-card/95 backdrop-blur">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-foreground">Resultate</h2>
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary/10">
                <TableHead className="font-bold text-foreground">Postennummer</TableHead>
                <TableHead className="font-bold text-foreground text-right">Zeit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                    Noch keine Posten gescannt
                  </TableCell>
                </TableRow>
              ) : (
                results.map((result, index) => (
                  <TableRow key={index} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{result.checkpoint}</TableCell>
                    <TableCell className="text-right font-mono">{result.time}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
};

export default ResultsTable;
