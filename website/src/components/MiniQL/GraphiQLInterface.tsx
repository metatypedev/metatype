// no-auto-license-header

// Copyright (c) GraphQL Contributors
// Modifications copyright Metatype OÜ
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import "graphiql/graphiql.css";

import React, { useEffect, useState } from "react";

import {
  CopyIcon,
  ExecuteButton,
  HeaderEditor,
  PrettifyIcon,
  QueryEditor,
  ResponseEditor,
  Spinner,
  ToolbarButton,
  UnStyledButton,
  useCopyQuery,
  useExecutionContext,
  usePrettifyEditors,
  useEditorContext,
  VariableEditor,
} from "@graphiql/react";

import styles from "./styles.module.scss";
import { GraphiQLInterfaceProps } from "graphiql";

const autoHeight = (cm) => {
  console.log(cm);
  const target = cm.getWrapperElement().closest(".graphiql-editor");
  target.style.height = `${cm.doc.height}px`;
};

export type Tab = "variables" | "headers" | "";

export default function GraphiQLInterface(
  props: GraphiQLInterfaceProps & { defaultTab: Tab }
) {
  const { queryEditor, variableEditor, headerEditor } = useEditorContext({
    nonNull: true,
  });

  const executionContext = useExecutionContext({ nonNull: true });
  const [tab, setTab] = useState<Tab>(props.defaultTab);

  const copy = useCopyQuery({ onCopyQuery: props.onCopyQuery });
  const prettify = usePrettifyEditors();

  useEffect(() => {
    if (variableEditor) {
      autoHeight(variableEditor);
    }
  }, [tab, variableEditor]);

  useEffect(() => {
    if (headerEditor) {
      autoHeight(headerEditor);
    }
  }, [tab, headerEditor]);

  useEffect(() => {
    if (queryEditor) {
      queryEditor.setOption("lineNumbers", false);
      queryEditor.setOption("gutters", []);
      queryEditor.on("change", autoHeight);
      autoHeight(queryEditor);
    }
  }, [queryEditor]);

  useEffect(() => {
    if (variableEditor) {
      variableEditor.setOption("lineNumbers", false);
      variableEditor.setOption("gutters", []);
      variableEditor.on("change", autoHeight);
    }
  }, [variableEditor]);

  useEffect(() => {
    if (headerEditor) {
      headerEditor.setOption("lineNumbers", false);
      headerEditor.setOption("gutters", []);
      headerEditor.on("change", autoHeight);
    }
  }, [headerEditor]);

  return (
    <div className={`graphiql-container ${styles.container}`}>
      <div className={`graphiql-session ${styles.session}`}>
        <div className="graphiql-editors">
          <section className="graphiql-query-editor" aria-label="Query Editor">
            <div className="graphiql-query-editor-wrapper">
              <QueryEditor
                style={{ background: "red" }}
                editorTheme={props.editorTheme}
                keyMap={props.keyMap}
                onCopyQuery={props.onCopyQuery}
                onEdit={props.onEditQuery}
                readOnly={props.readOnly}
              />
            </div>
            <div
              className="graphiql-toolbar"
              role="toolbar"
              aria-label="Editor Commands"
            >
              <ExecuteButton />
              <ToolbarButton
                onClick={() => prettify()}
                label="Prettify query (Shift-Ctrl-P)"
              >
                <PrettifyIcon
                  className="graphiql-toolbar-icon"
                  aria-hidden="true"
                />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => copy()}
                label="Copy query (Shift-Ctrl-C)"
              >
                <CopyIcon
                  className="graphiql-toolbar-icon"
                  aria-hidden="true"
                />
              </ToolbarButton>
            </div>
          </section>

          <div className="graphiql-editor-tools">
            <div className="graphiql-editor-tools-tabs">
              <UnStyledButton
                type="button"
                className={tab === "variables" ? "active" : ""}
                onClick={() => {
                  setTab(tab === "variables" ? "" : "variables");
                }}
              >
                Variables
              </UnStyledButton>
              <UnStyledButton
                type="button"
                className={tab === "headers" ? "active" : ""}
                onClick={() => {
                  setTab(tab === "headers" ? "" : "headers");
                }}
              >
                Headers
              </UnStyledButton>
            </div>
          </div>

          <section
            className={`graphiql-editor-tool ${
              tab && tab.length > 0 ? styles.tool : styles.notool
            }`}
            aria-label={tab === "variables" ? "Variables" : "Headers"}
          >
            <VariableEditor
              editorTheme={props.editorTheme}
              isHidden={tab !== "variables"}
              keyMap={props.keyMap}
              onEdit={props.onEditVariables}
              readOnly={props.readOnly}
            />
            <HeaderEditor
              editorTheme={props.editorTheme}
              isHidden={tab !== "headers"}
              keyMap={props.keyMap}
              onEdit={props.onEditHeaders}
              readOnly={props.readOnly}
            />
          </section>
        </div>
      </div>

      <div className={`graphiql-response ${styles.response}`}>
        {executionContext.isFetching ? <Spinner /> : null}
        <ResponseEditor
          editorTheme={props.editorTheme}
          responseTooltip={props.responseTooltip}
          keyMap={props.keyMap}
        />
      </div>
    </div>
  );
}
