import React from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const App = () => 
  React.createElement(React.Fragment, null,
    React.createElement(Sonner),
    React.createElement(BrowserRouter, null,
      React.createElement(Routes, null,
        React.createElement(Route, { path: "/", element: React.createElement(Index) }),
        React.createElement(Route, { path: "*", element: React.createElement(NotFound) })
      )
    )
  );

export default App;
