import React from "react";
export default function DetailStub({ site }: any) {
  return (
    <section className="detail-panel">
      Location Intelligence: {site.name}
    </section>
  );
}
