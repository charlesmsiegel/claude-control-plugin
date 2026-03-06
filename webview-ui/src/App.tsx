import React from "react";

const App: React.FC = () => {
  const rootEl = document.getElementById("root");
  const editorType = rootEl?.getAttribute("data-editor-type") || "unknown";

  return (
    <div style={{ padding: "16px" }}>
      <div>Editor type: {editorType}</div>
      <div>Component will be routed here in the next tasks.</div>
    </div>
  );
};

export default App;
