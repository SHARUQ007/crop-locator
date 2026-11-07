import React from "react";
export default function DetailStub({ site, onCompare }: any) {
  return (
    <section className="detail-panel">
      Location Intelligence: {site.name}
      <button onClick={onCompare}>Compare details</button>
    </section>
  );
}
