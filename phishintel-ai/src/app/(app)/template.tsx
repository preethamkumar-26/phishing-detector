import React from "react";

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="route-transition-wrap" data-route-transition="true">
      {children}
    </div>
  );
}
