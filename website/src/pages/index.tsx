// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

/* eslint-disable @typescript-eslint/no-var-requires */

import React, { useState } from "react";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import TGExample from "../components/TGExample";
import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";
import {
  BuildingCastle,
  ModulableCastle,
  ReusableCastle,
  StableCastle,
} from "./castles";

function Header() {
  return (
    <header className="text-center py-10 bg-gradient-to-b from-slate-200 from-0% to-white to-100%">
      <div className="container">
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
          Build{" "}
          <span className="group tooltip">
            modular APIs
            <span className="group-hover:block group-active:block">
              Scale, re-use and compose your APIs.
            </span>
          </span>{" "}
          with{" "}
          <span className="group tooltip">
            zero-trust
            <span className="group-hover:block group-active:block">
              Ensure authorization and compliance for all API fields.
            </span>
          </span>{" "}
          and{" "}
          <span className="group tooltip">
            serverless
            <span className="group-hover:block group-active:block">
              Iterate quickly and deploy your APIs in seconds.
            </span>
          </span>{" "}
          deployment, no matter where and how your (legacy) systems are.
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

const featureList = [
  {
    title: "Compose type safe API blocks",
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
    <section className="flex items-center p-4">
      <div className="container">
        <h2 className="inline-block mt-12 text-3xl">Main features</h2>
        <div className="row">
          {featureList.map((props, idx) => {
            const Svg = props.svg;
            return (
              <div key={idx} className="col col--4">
                <div className="text--center">
                  <Svg width="200" height="200" role="img" />
                </div>
                <div className="text--center padding-horiz--md">
                  <h3>{props.title}</h3>
                  <p>{props.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TryIt(): JSX.Element {
  return (
    <section className="container">
      <h2 className="inline-block mt-12 text-3xl">Try it by yourself</h2>
      <div className="">
        <TGExample
          python={require("./index.py")}
          typegraph="homepage"
          variables={{ message: "Great tool!" }}
          tab="variables"
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
    <section className="container mb-12">
      <h2 className="mt-12 text-3xl">Supported runtimes</h2>
      <div className="flex flex-wrap gap-8 m-4">
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
    <section className="container">
      <h2 className="mt-6 text-3xl">
        3 minutes introduction to API composition
      </h2>
      <div className="flex justify-center mt-8">
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

interface ProfilePickerP {
  profiles: Record<string, string>;
  profile: string;
  onChange: (profile: string) => void;
  className?: string;
}

function ProfilePicker({
  profiles,
  profile,
  onChange,
  className,
}: ProfilePickerP) {
  return (
    <div className={`flex ${className}`}>
      <span className="py-1">I am</span>
      <ul className="inline-block ml-2 pl-0 m-0 list-none rounded-md overflow-clip">
        {Object.entries(profiles).map(([k, p]) => (
          <li key={p} className="inline-block">
            <div>
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="profile"
                  value={k}
                  checked={k === profile}
                  onChange={() => onChange(k)}
                  className="hidden peer"
                />
                <div className="px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white">
                  {p}
                </div>
              </label>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const profiles = {
  leader: "an engineering leader",
  developer: "a developer",
  business: "a business user",
};

function Intro(): JSX.Element {
  const [profile, setProfile] = useState(Object.keys(profiles)[0]);

  return (
    <div className="container">
      <section className="grid md:grid-cols-2 gap-4 items-center my-12">
        <div>
          <ProfilePicker
            profiles={{
              leader: "an engineering leader",
              developer: "a developer",
              business: "a business user",
            }}
            profile={profile}
            onChange={setProfile}
            className="mb-8"
          />
          <h2>Programming is like castle building</h2>
          <p className="text-xl">
            And castle building is <strong>hard</strong>. Even the best teams
            can struggle to build according to the plans, especially with the
            ever evolving needs and tech landscape complexities.
          </p>
        </div>
        <BuildingCastle />
      </section>
      <section className="grid md:grid-cols-2 gap-4 items-center my-12 flex-col-reverse">
        <div className="md:order-last">
          <h2>
            Build <span className="text-metared">stable</span> castle with{" "}
            <span className="text-metared">typegraphs</span>
          </h2>
          <p className="text-xl">
            Typegraphs are programmable <strong>virtual graphs</strong>{" "}
            describing all the components of your stack. They enable you to
            compose databases, APIs and business logic in a type safe manner.
          </p>
        </div>
        <StableCastle />
      </section>
      <section className="grid md:grid-cols-2 gap-4 items-center my-12 flex-col-reverse">
        <div className="">
          <h2>
            Build <span className="text-metared">modulable</span> castle with{" "}
            <span className="text-metared">typegate</span>
          </h2>
          <p className="text-xl">
            Typegate is a HTTP/GraphQL <strong>query engine</strong> that
            compiles, optimizes, runs and caches queries to typegraphs on the
            fly. It enforces authentication, authorization and security for you.
          </p>
        </div>
        <ModulableCastle />
      </section>
      <section className="grid md:grid-cols-2 gap-4 items-center my-12 flex-col-reverse">
        <div className="md:order-last">
          <h2>
            Build <span className="text-metared">reusable</span> castle with{" "}
            <span className="text-metared">Metatype</span>
          </h2>
          <p className="text-xl">
            Install third parties as <strong>dependencies</strong> and start
            reusing components. The Meta CLI offers you live reloading and
            one-command deployment to Metacloud or your own instance.
          </p>
        </div>
        <ReusableCastle />
      </section>
    </div>
  );
}

function Landscape(): JSX.Element {
  return (
    <section className="container">
      <h2 className="mt-6 text-3xl">Tech landscape positioning</h2>
      <div className="flex justify-center mt-8">
        <table className="table-auto">
          <tbody>
            <tr>
              <td></td>
              <td>
                <small>← entity data</small>
                <br />
                transactional
              </td>
              <td>
                <small>large dataset →</small>
                <br />
                analytical
              </td>
            </tr>
            <tr>
              <td>
                <small>short-lived ↑</small>
                <br />
                synchronous
              </td>
              <td>Metatype</td>
              <td>Trino</td>
            </tr>
            <tr>
              <td>
                asynchronous
                <br />
                <small>long-running ↓</small>
              </td>
              <td>Temporal</td>
              <td>Spark</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <Header />
      <main>
        <Intro />
        <Landscape />
        <TryIt />
        <DemoVideo />
        <Features />
        <Runtimes />
      </main>
    </Layout>
  );
}
