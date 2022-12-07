import React from "react";
import Paginator from "@theme-original/DocItem/Paginator";
import Giscus from "@site/src/components/Giscus";
import styles from "./styles.module.scss";
import useFrontMatter from "@theme/useFrontMatter";

export default function PaginatorWrapper(props) {
  const fm = useFrontMatter();

  return (
    <>
      <Paginator {...props} />
      {fm.comments === false ? null : (
        <div className={styles.giscus}>
          <Giscus />
        </div>
      )}
    </>
  );
}
