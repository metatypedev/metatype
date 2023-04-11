// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

/* eslint-disable @typescript-eslint/no-var-requires */

import React from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import styles from "./index.module.scss";
import TGExample from "../components/TGExample";
import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";

function Header() {
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        <div className="rounded-full bg-white w-40 h-40 flex px-6 m-auto mb-10">
          <img src="images/logo.svg" alt="Metatype logo" />
        </div>
        <h1 className="hero__title">Compose your data, anywhere.</h1>
        <p className="hero__subtitle">
          Build iterative API blocks with zero-trust and serverless deployment,
          <br />
          no matter where and how your (legacy) systems are.
        </p>
        <div className="md:flex md:px-32 justify-center">
          <Link
            className="button button--primary button--lg m-2"
            to="/docs/tutorials/getting-started"
          >
            Getting started
          </Link>
          <Link
            className="button button--secondary button--lg m-2"
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
        data flows among your frontends, backends, databases, models and
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
    title: "Stay productive as your stacks evolve",
    svg: require("@site/static/icons/iterate-quickly.svg").default,
    description: (
      <>
        Cut your time to deployment in half. Metatype's iterative approach lets
        innovate in your (legacy) systems step by step without making
        compromises.
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

function Example(): JSX.Element {
  return (
    <section className="container">
      <h2 className="inline-block mt-12 text-3xl">
        Iterate fast and with ease
      </h2>
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
        Replace backends with low-code API composition
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

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <Header />
      <main>
        <Features />
        <DemoVideo />
        <Example />
        <Runtimes />
      </main>
    </Layout>
  );
}
