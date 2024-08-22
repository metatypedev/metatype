import React, { useEffect } from "react";
import Gleap from "gleap";

export default function Root({ children }) {
  useEffect(() => {
    Gleap.initialize("dyWs3yourDQZkNztYzV7yZgcyMcWGpaF");
  }, []);

  return <>{children}</>;
}
