"use client";

import type { ReferenceRow } from "@/lib/types";

export function CategoriesTable({ rows }: { rows: ReferenceRow[] }) {
  let lastCat = "";

  return (
    <div className="section-card">
      <div className="table-scroll">
        <table className="data-table cat-edit-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Sub-category</th>
              <th>Keywords</th>
              <th className="num">Monthly budget</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const showCat = row.category !== lastCat;
              lastCat = row.category;
              return (
                <tr key={`${row.category}-${row.subCategory}-${i}`}>
                  <td>{showCat ? row.category : ""}</td>
                  <td>{row.subCategory}</td>
                  <td>{row.keywords || "—"}</td>
                  <td className="num">{row.budget || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ padding: "12px 16px", margin: 0, fontSize: 12, color: "var(--gray-5)" }}>
        Read-only for now. Edits still go through the Reference tab or mockup — save API coming next.
      </p>
    </div>
  );
}
