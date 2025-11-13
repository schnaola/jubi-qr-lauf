import React from "react";
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

const ResultsTable = ({ results, participantName, allParticipants }) => {
  const renderTable = (participantResults, showParticipant = false) =>
    React.createElement("div", { className: "rounded-md border border-border overflow-hidden" },
      React.createElement(Table, null,
        React.createElement(TableHeader, null,
          React.createElement(TableRow, { className: "bg-primary/10" },
            React.createElement(TableHead, { className: "font-bold text-foreground" }, "Postennummer"),
            React.createElement(TableHead, { className: "font-bold text-foreground text-right" }, "Zeit")
          )
        ),
        React.createElement(TableBody, null,
          participantResults.length === 0
            ? React.createElement(TableRow, null,
                React.createElement(TableCell, { 
                  colSpan: 2, 
                  className: "text-center text-muted-foreground py-8" 
                }, "Noch keine Posten gescannt")
              )
            : participantResults.map((result, index) =>
                React.createElement(TableRow, { key: index, className: "hover:bg-muted/50" },
                  React.createElement(TableCell, { className: "font-medium" }, result.checkpoint),
                  React.createElement(TableCell, { className: "text-right font-mono" }, result.time)
                )
              )
        )
      )
    );

  return React.createElement(Card, { className: "overflow-hidden bg-card/95 backdrop-blur" },
    React.createElement("div", { className: "p-6" },
      React.createElement("h2", { className: "text-2xl font-bold mb-4 text-foreground" },
        "Resultate ", participantName && `- ${participantName}`
      ),
      allParticipants && allParticipants.length > 1
        ? React.createElement(Tabs, { defaultValue: "current" },
            React.createElement(TabsList, { className: "mb-4" },
              React.createElement(TabsTrigger, { value: "current" }, "Aktuell"),
              React.createElement(TabsTrigger, { value: "all" }, "Alle")
            ),
            React.createElement(TabsContent, { value: "current" },
              renderTable(results)
            ),
            React.createElement(TabsContent, { value: "all" },
              allParticipants.map((participant) =>
                React.createElement("div", { 
                  key: participant.id, 
                  className: "mb-6 last:mb-0" 
                },
                  React.createElement("h3", { className: "font-semibold mb-2 text-foreground" }, 
                    participant.name
                  ),
                  renderTable(participant.results)
                )
              )
            )
          )
        : renderTable(results)
    )
  );
};

export default ResultsTable;
