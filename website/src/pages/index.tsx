// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

/* eslint-disable @typescript-eslint/no-var-requires */

import React, { useState } from "react";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import TGExample from "../components/TGExample";
import BrowserOnly from "@docusaurus/BrowserOnly";
import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";

import { ChoicePicker } from "../components/ChoicePicker";

function Header() {
  return (
    <header className="bg-gradient-to-b from-slate-200 from-0% to-white to-100%">
      <div className="container text-center py-12">
        <div className="rounded-full bg-white w-40 h-40 flex px-6 m-auto mb-10">
          <img src="images/logo.svg" alt="Metatype logo" />
        </div>
        <h1 className="text-5xl">
          The{" "}
          <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-metared from-15% via-metablue via-50% to-metared to-85%">
            low-code API platform
          </span>{" "}
          for developers.
        </h1>
        <p className="hero__subtitle mx-auto text-3xl leading-10 max-w-[950px]">
          Build <strong>modular APIs</strong> with <strong>zero-trust</strong>{" "}
          and <strong>serverless</strong> deployment, no matter where and how
          your (legacy) systems are.
        </p>
        <div className="md:flex md:px-32 justify-center">
          <Link
            className="button button--primary button--lg m-2"
            to="/docs/tutorials/getting-started"
          >
            Getting started
          </Link>
          <Link
            className="button bg-slate-400 hover:bg-slate-300  button--lg m-2"
            to="/docs/concepts/overview"
          >
            Learn more
          </Link>
        </div>
      </div>
    </header>
  );
}

function Intro({
  profile,
  setProfile,
}: {
  profile: string;
  setProfile: (p: string) => void;
}): JSX.Element {
  return (
    <section>
      <div>
        <div className="flex text-sm mb-8">
          <ChoicePicker
            name="profile"
            choices={profiles}
            choice={profile}
            onChange={setProfile}
          />
        </div>
        <h2>
          <span className="text-metared">Programming</span> is like{" "}
          <span className="text-metared">castle</span> building
        </h2>
        <p>
          And castle building is <strong>hard</strong>. Even the best teams can
          struggle to build according to the plans, especially with the ever
          evolving needs and tech landscape complexities.
        </p>
      </div>
      <BrowserOnly fallback={<div className="h-[300px]"></div>}>
        {() => {
          const Castle = require(`../components/castles`).BuildingCastle;
          return <Castle />;
        }}
      </BrowserOnly>
    </section>
  );
}

function Stability(): JSX.Element {
  return (
    <section>
      <div>
        <h2>
          Build <span className="text-metared">stable</span> castle with{" "}
          <span className="text-metared">typegraphs</span>
        </h2>
        <p>
          Typegraphs are programmable <strong>virtual graphs</strong> describing
          all the components of your stack. They enable you to compose APIs,
          storage and business logic in a type safe manner.
        </p>
      </div>
      <BrowserOnly fallback={<div className="h-[300px]"></div>}>
        {() => {
          const Castle = require(`../components/castles`).StableCastle;
          return <Castle />;
        }}
      </BrowserOnly>
    </section>
  );
}

function Modularity(): JSX.Element {
  return (
    <section>
      <div>
        <h2>
          Build <span className="text-metared">modulable</span> castle with{" "}
          <span className="text-metared">typegate</span>
        </h2>
        <p>
          Typegate is a distributed HTTP/GraphQL <strong>query engine</strong>{" "}
          that compiles, optimizes, runs and caches queries over typegraphs. It
          enforces authentication, authorization and security for you.
        </p>
      </div>
      <BrowserOnly fallback={<div className="h-[300px]"></div>}>
        {() => {
          const Castle = require(`../components/castles`).ModulableCastle;
          return <Castle />;
        }}
      </BrowserOnly>
    </section>
  );
}

function Reusability(): JSX.Element {
  return (
    <section>
      <div>
        <h2>
          Build <span className="text-metared">reusable</span> castle with{" "}
          <span className="text-metared">Metatype</span>
        </h2>
        <p>
          Install third parties as <strong>dependencies</strong> and start
          reusing components. The Meta CLI offers you live reloading and
          one-command deployment to Metacloud or your own instance.
        </p>
      </div>
      <BrowserOnly fallback={<div className="h-[300px]"></div>}>
        {() => {
          const Castle = require(`../components/castles`).ReusableCastle;
          return <Castle />;
        }}
      </BrowserOnly>
    </section>
  );
}

const featureList = [
  {
    title: "Compose type safe APIs",
    svg: require("@site/static/icons/compose-api-blocks.svg").default,
    description: (
      <>
        No surprises. The typesystem of Metatype ensures the correctness of your
        data across your frontends, backends, databases, models and
        third-parties.
      </>
    ),
  },
  {
    title: "Design and discovery oriented",
    svg: require("@site/static/icons/design-discover.svg").default,
    description: (
      <>
        Focus on what matters. Leave the implementation details and focus your
        energy on designing efficient interfaces. Metatype covers the rest for
        you.
      </>
    ),
  },
  {
    title: "Productivity as your stacks evolve",
    svg: require("@site/static/icons/iterate-quickly.svg").default,
    description: (
      <>
        Cut your time to deployment in half. Metatype's iterative approach
        enables you to innovate step by step with your (legacy) systems without
        making compromises.
      </>
    ),
  },
  {
    title: "Bring your own components",
    svg: require("@site/static/icons/bring-your-own-components.svg").default,
    description: (
      <>
        Enjoy being technology agnostic. Import, deploy, host and extend your
        stacks with Metatype's open ecosystem without being afraid of vendor
        lock-ins.
      </>
    ),
  },
  {
    title: "Secure by default",
    svg: require("@site/static/icons/secure-by-default.svg").default,
    description: (
      <>
        Enforce Policy Based Access Control (PBAC). By default no access, unless
        you provide one explicitly. Metatype also comes with many authentication
        and delegation standards.
      </>
    ),
  },
  {
    title: "Entreprise support",
    svg: require("@site/static/icons/commercial-support.svg").default,
    description: (
      <>
        Get expert advices. Metatype team is here to help you with your products
        and business objectives. We offer training, consulting, managed services
        and support options.
      </>
    ),
  },
];

function Features(): JSX.Element {
  return (
    <section className="grid-3 text-center">
      {featureList.map((props, idx) => {
        const Svg = props.svg;
        return (
          <div key={idx}>
            <div>
              <Svg width="200" height="200" role="img" />
            </div>
            <div>
              <h3>{props.title}</h3>
              <p>{props.description}</p>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function TryIt(): JSX.Element {
  return (
    <section>
      <div>
        <h2>
          Try the <span className="text-metared">playground</span> and{" "}
          <span className="text-metared">deploy</span>
        </h2>
        <p>
          Metatype's <strong>low-code approach</strong> combines the best of the
          two worlds. You are quickly productive thanks to the high-level
          abstractions, yet you can leverage all the low-level developer tooling
          you are familiar with.
        </p>
      </div>
      <div className="w-full">
        <TGExample
          python={require("./index.py")}
          typegraph="homepage"
          variables={{ email: "fill-me", message: "Great tool!" }}
          noTool={true}
          defaultMode="typegraph"
          query={require("./index.graphql")}
        />
      </div>
    </section>
  );
}

const runtimeList = [
  {
    name: "MongoDB",
    logo: "/images/runtimes/mongodb.svg",
  },
  {
    name: "GraphQL",
    logo: "/images/runtimes/graphql.svg",
  },
  {
    name: "HTTP",
    logo: "/images/runtimes/http.svg",
  },
  {
    name: "GRPC",
    logo: "/images/runtimes/grpc.svg",
  },
  {
    name: "Deno",
    logo: "/images/runtimes/deno.svg",
  },
  {
    name: "SQLite",
    logo: "/images/runtimes/sqlite.svg",
  },
  {
    name: "PostgreSQL",
    logo: "/images/runtimes/postgresql.svg",
  },
  {
    name: "Google APIs Explorer",
    logo: "/images/runtimes/google-apis-explorer.svg",
  },
  {
    name: "MariaDB",
    logo: "/images/runtimes/mariadb.svg",
  },
  {
    name: "Python",
    logo: "/images/runtimes/python.svg",
  },
  {
    name: "WasmEdge",
    logo: "/images/runtimes/wasmedge.svg",
  },
  {
    name: "Temporal",
    logo: "/images/runtimes/temporal.svg",
  },
  {
    name: "S3",
    logo: "/images/runtimes/s3.svg",
  },
];

function Runtimes(): JSX.Element {
  return (
    <section>
      <div>
        <h2>
          <span className="text-metared">Easily</span> add your{" "}
          <span className="text-metared">own</span> runtime
        </h2>
        <p>
          More than 12 runtimes are natively supported. Usually it takes less
          than a day to integrate a new one and support the most frequent
          usages.
        </p>
      </div>
      <div className="flex flex-wrap gap-4 m-4">
        {runtimeList.map((props, idx) => (
          <img
            key={idx}
            src={props.logo}
            alt={`${props.name} logo. All rights reserved to ${props.name}.`}
            style={{ maxWidth: "150px", maxHeight: "80px" }}
            className="p-4 flex-1"
          />
        ))}
      </div>
    </section>
  );
}

function DemoVideo(): JSX.Element {
  return (
    <section>
      <div>
        <h2>
          Forget weeks, <span className="text-metared">deliver</span> APIs{" "}
          <span className="text-metared">in hours</span>
        </h2>
        <p>
          Watch the <strong>3 minutes introduction</strong> of the Metatype
          platform and start designing your own typegraph. Once you have
          understood the basics, you already feel productive.
        </p>
      </div>
      <div className="flex justify-center">
        <div
          className="flex-1 rounded-lg border-2 border-black"
          style={{ maxWidth: "800px" }}
        >
          <LiteYouTubeEmbed
            id="D-n9BbGfqxE"
            title="Metatype early preview in 3 minutes"
            thumbnail="/images/demo-thumbnail.png"
          />
        </div>
      </div>
    </section>
  );
}

function Landscape(): JSX.Element {
  return (
    <section>
      <div>
        <h2>
          Bringing <span className="text-metared">speed</span> and{" "}
          <span className="text-metared">novelty</span> to backend development
        </h2>
        <p className="text-xl">
          Metatype fills a gap in the tech landscape by introducing a new way to
          build fast and developper-friendly APIs that are{" "}
          <strong>interoperable</strong> with your existing (legacy) systems.
        </p>
      </div>
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
                <small>short-lived ↑</small>
                <br />
                instantaneous
              </td>
              <td className="bg-slate-100">
                <strong>Metatype</strong>
                <br />
                <small>
                  query engine for data entities in evolving systems
                </small>
              </td>
              <td>
                Trino
                <br />
                <small>
                  query engine for large data from multiples sources
                </small>
              </td>
            </tr>
            <tr>
              <td>
                asynchronous
                <br />
                <small>long-running ↓</small>
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
    </section>
  );
}

const profiles = {
  leader: "I'm an engineering leader",
  developer: "I'm a developer",
  business: "I'm non-technical",
};

type Profile = keyof typeof profiles;

const order: Record<Profile, JSX.Element> = {
  leader: (
    <>
      <Landscape />
      <DemoVideo />
      <TryIt />
      <Features />
    </>
  ),
  developer: (
    <>
      <TryIt />
      <DemoVideo />
      <Landscape />
      <Runtimes />
    </>
  ),
  business: (
    <>
      <Features />
      <Landscape />
      <DemoVideo />
      <Runtimes />
    </>
  ),
};

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const [profile, setProfile] = useState<Profile>(
    Object.keys(profiles)[0] as Profile
  );

  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <Header />
      <main id="homepage" className="container">
        <Intro profile={profile} setProfile={setProfile} />
        <Stability />
        <Modularity />
        <Reusability />
        {order[profile]}
      </main>
    </Layout>
  );
}
