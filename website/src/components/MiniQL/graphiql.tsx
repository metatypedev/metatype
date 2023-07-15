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
  ToolbarButton,
  Tooltip,
  useCopyQuery,
  useEditorContext,
  usePrettifyEditors,
  VariableEditor,
} from "@graphiql/react";

import { GraphiQLInterfaceProps } from "graphiql";

const autoHeight = (codeMirror) => {
  const target = codeMirror.getWrapperElement().closest(".graphiql-editor");
  target.style.height = `${codeMirror.doc.height}px`;
};

export type Tab = "variables" | "headers" | "";

export default function GraphiQLInterface(
  props: GraphiQLInterfaceProps & { defaultTab: Tab; noTool: boolean }
) {
  const { queryEditor, variableEditor, headerEditor } = useEditorContext({
    nonNull: true,
  });

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
      // allow the user to use @, which is overridden on macOs
      queryEditor.setOption(`extraKeys`, {
        "Alt-G": () => {
          queryEditor.replaceSelection("@");
        },
      });
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
    <Tooltip.Provider>
      <div className="graphiql-editors">
        <section
          className="graphiql-query-editor shadow-sm"
          aria-label="Query Editor"
        >
          <div className="graphiql-query-editor-wrapper">
            <QueryEditor
              editorTheme={props.editorTheme}
              keyMap={props.keyMap}
              onCopyQuery={props.onCopyQuery}
              onEdit={props.onEditQuery}
              readOnly={props.readOnly}
            />
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
          </div>
        </section>

        {props.noTool ? null : (
          <>
            <div className="graphiql-editor-tools p-0 text-sm ">
              <div className="graphiql-editor-tools-tabs">
                <div
                  className={`${
                    tab === "variables" ? "text-slate-800" : ""
                  } p-2 hover:text-slate-800 cursor-pointer`}
                  onClick={() => {
                    setTab(tab === "variables" ? "" : "variables");
                  }}
                >
                  Variables
                </div>
                <div
                  className={`${
                    tab === "headers" ? "text-slate-800" : ""
                  } p-2 hover:text-slate-800 cursor-pointer`}
                  onClick={() => {
                    setTab(tab === "headers" ? "" : "headers");
                  }}
                >
                  Headers
                </div>
              </div>
            </div>

            <section
              className={`graphiql-editor-tool ${
                tab && tab.length > 0 ? "pt-0" : "hidden p-0"
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
          </>
        )}
      </div>
    </Tooltip.Provider>
  );
}
