// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import "./App.css";
import useSWR, { SWRConfig } from "swr";
import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
import { Type } from "./components/Type";

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  return response.json();
};

function Header() {
  const navigate = useNavigate();
  const { typegraph: currentTypegraph } = useParams();
  const { data: typegraphs, error, isLoading } = useSWR<string[]>('/api/typegraphs');

  const handleTypegraphChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTypegraph = event.target.value;
    if (selectedTypegraph) {
      navigate(`/${selectedTypegraph}`);
    }
  };

  return (
    <header className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-white/5">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-gray-300">Typegraph:</span>
        <select
          onChange={handleTypegraphChange}
          value={currentTypegraph ?? ""}
          className="px-2 py-1 bg-gray-800 border border-white/10 rounded text-white outline-none focus:border-white/20"
        >
          <option value="" className="text-gray-400">Select a typegraph</option>
          {isLoading && <option className="text-gray-400">Loading...</option>}
          {error && <option className="text-red-400">Error loading typegraphs</option>}
          {typegraphs?.map((typegraph) => (
            <option
              key={typegraph}
              value={typegraph}
              className="text-white"
            >
              {typegraph}
            </option>
          ))}
        </select>
      </label>
      <Status />
    </header>
  );
}

type Stats = {
  stats: {
    types: number;
    runtimes: number;
    materializers: number;
    policies: number;
  }
}

function Status() {
  const { typegraph } = useParams();
  const { data: typegraphData, error, isLoading } = useSWR<Stats>(
    typegraph ? `/api/typegraphs/${typegraph}` : null
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-900 text-sm">
        <span className="text-blue-400">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-900 text-sm">
        <span className="text-red-400">Error: {error.message}</span>
      </div>
    );
  }

  if (!typegraphData) {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-900 text-sm">
        <span className="text-gray-400">No typegraph selected</span>
      </div>
    );
  }

  return (
    <section className="flex items-center gap-4 px-4 py-1.5 bg-gray-900 text-sm">
      {typegraphData && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Type count:</span>
            <span className="text-white">{typegraphData.stats.types}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Runtimes:</span>
            <span className="text-white">{typegraphData.stats.runtimes}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Materializers:</span>
            <span className="text-white">{typegraphData.stats.materializers}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Policies:</span>
            <span className="text-white">{typegraphData.stats.policies}</span>
          </div>
        </>
      )}
    </section>
  );
}

function TypegraphView() {
  return (
    <>
      <Header />
      <main>
        <Type idx={0} tag="<root>" />
      </main>
    </>
  );
}

function AppContent() {
  return (
    <>
      <Routes>
        <Route path="/" element={
          <>
            <Header />
            <main>
              Select a typegraph...
            </main>
          </>
        } />
        <Route path="/:typegraph" element={
          <TypegraphView />
        } />
      </Routes>
    </>
  );
}

function App() {
  return (
    <SWRConfig value={{
      fetcher,
      revalidateOnFocus: false,
    }}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </SWRConfig>
  );
}

export default App;
