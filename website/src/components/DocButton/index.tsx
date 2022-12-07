// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

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
