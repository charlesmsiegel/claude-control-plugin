import React from "react";
import { AgentEditor } from "./editors/AgentEditor";

const App: React.FC = () => {
  const rootEl = document.getElementById("root");
  const editorType = rootEl?.getAttribute("data-editor-type") || "unknown";

  switch (editorType) {
    case "agent":
      return <AgentEditor />;
    default:
      return (
        <div style={{ padding: "16px" }}>
          <div>Editor type: {editorType}</div>
          <div>Component not yet implemented.</div>
        </div>
      );
  }
};

export default App;
