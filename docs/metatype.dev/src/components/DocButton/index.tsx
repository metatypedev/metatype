// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import React from "react";
import PaginatorNavLink from "@theme/PaginatorNavLink";
import styles from "./styles.module.scss";

interface DocButtonProps {
  next?: PaginatorNavLink;
  previous?: PaginatorNavLink;
}

export default function DocButton(props: DocButtonProps): JSX.Element {
  const { previous, next } = props;
  return (
    <nav className={styles.link}>
      {previous && <PaginatorNavLink {...previous} />}
      {next && <PaginatorNavLink {...next} isNext />}
    </nav>
  );
}
