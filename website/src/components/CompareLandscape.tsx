// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import React from "react";

export function CompareLandscape() {
  return (
    <div className="flex justify-center mt-8 overflow-auto">
      <table className="table-fixed text-center" id="landscape">
        <tbody>
          <tr className="border-none">
            <td className="border-none"></td>
            <td>
              <small>← individual level</small>
              <br />
              transactional
            </td>
            <td>
              <small>large data →</small>
              <br />
              analytical
            </td>
          </tr>
          <tr>
            <td>
              <small>instantaneous ↑</small>
              <br />
              short-lived
            </td>
            <td className="bg-slate-100">
              <strong>Metatype</strong>
              <br />
              <small>query engine for data entities in evolving systems</small>
            </td>
            <td>
              Trino
              <br />
              <small>query engine for large data from multiples sources</small>
            </td>
          </tr>
          <tr>
            <td>
              long-running
              <br />
              <small>asynchronous ↓</small>
            </td>
            <td>
              Temporal
              <br />
              <small>workflow orchestration engine for data operations</small>
            </td>
            <td>
              Spark
              <br />
              <small>batch/streaming engine for large data processing</small>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
