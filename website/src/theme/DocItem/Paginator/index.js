import React from "react";
import Paginator from "@theme-original/DocItem/Paginator";
import Giscus from "@site/src/components/Giscus";
import styles from "./styles.module.scss";
import useFrontMatter from "@theme/useFrontMatter";
import { ColorModeProvider } from "@docusaurus/theme-common";

export default function PaginatorWrapper(props) {
  const fm = useFrontMatter();

  return (
    <ColorModeProvider>
      <Paginator {...props} />
      {fm.comments === false ? null : (
        <div className={styles.giscus}>
          <Giscus />
        </div>
      )}
    </ColorModeProvider>
  );
}
