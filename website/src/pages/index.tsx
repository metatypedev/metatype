// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

/* eslint-disable @typescript-eslint/no-var-requires */

import React from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import gql from "graphql-tag";
import styles from "./index.module.scss";
import MiniQL from "../components/MiniQL";
import CodeBlock from "@theme-original/CodeBlock";

function Header() {
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        <div className="rounded-full bg-white w-40 h-40 flex px-6 m-auto mb-10">
          <img src="images/logo.svg" alt="Metatype logo" />
        </div>
        <h1 className="hero__title">Compose your data, anywere.</h1>
        <p className="hero__subtitle">
          Build iterative API blocks with zero-trust and serverless deployment,
          <br />
          no matter where and how your (legacy) systems are.
        </p>
        <div className="flex justify-center">
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
    title: "Compose typesafe API blocks",
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
        Focus on what matters. Leave the implementation details and use your
        energy to design efficient interfaces. Metatype covers the rest for you.
      </>
    ),
  },
  {
    title: "Stay productive as your stacks grow",
    svg: require("@site/static/icons/iterate-quickly.svg").default,
    description: (
      <>
        Cut your time to deployment in half. Metatype's iterative approach lets
        improve your systems step by step without making compromises.
      </>
    ),
  },
  {
    title: "Bring your own components",
    svg: require("@site/static/icons/bring-your-own-components.svg").default,
    description: (
      <>
        Enjoy being technology agnostic. Host, deploy, build and extend your
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
        you provide an explicit policy. Metatype includes authentication and
        delegation standards.
      </>
    ),
  },
  {
    title: "Entreprise support",
    svg: require("@site/static/icons/commercial-support.svg").default,
    description: (
      <>
        Get expert advices. Metatype expert team is here to help you with your
        projects and objectives. We offer training, consulting and dedicated
        support options.
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
    <section className="flex items-center m-8">
      <div className="container">
        <div className="row flex gap-8 justify-center">
          <div className="flex-1 max-w-3xl text-s w-full">
            <CodeBlock language="python">
              {require("./homepage.py").default}
            </CodeBlock>
          </div>
          <div className="flex-1 max-w-3xl">
            <div className="pb-4 h-full">
              <MiniQL
                typegraph="homepage"
                variables={{ message: "Great tool!" }}
                tab="variables"
                query={gql`
                  query A {
                    stargazers {
                      login
                    }
                  }

                  query B {
                    stargazers {
                      login
                      user {
                        name
                      }
                    }
                  }

                  mutation C($message: String!) {
                    send_feedback(
                      data: {
                        email: "" # fill me
                        message: $message
                      }
                    ) {
                      id
                    }
                  }

                  query D {
                    list_feedback {
                      email # delete me
                      message
                    }
                  }
                `}
              />
            </div>
          </div>
        </div>
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
];

function Runtimes(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="text-center w-full">
          <h2 className="">Supported runtimes</h2>
        </div>
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
        <div className="text-center w-full mb-16">
          <strong>
            And many <a href="/docs/reference">more</a>.
          </strong>
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
        <Example />
        <Runtimes />
      </main>
    </Layout>
  );
}
