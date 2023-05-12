// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { KeyboardEvent, useEffect } from "react";
import { useSpring, SpringValue } from "@react-spring/konva";
import { each } from "@react-spring/shared";

export function useVirtualScroll(
  [min, max]: [number, number],
  speedRatio: number
) {
  const [values, api] = useSpring(
    () => ({
      progress: 0,
    }),
    []
  );

  useEffect(() => {
    if (min === max) {
      return;
    }

    // safari does not scrollY on page load, manually scroll to last position
    // setting to null and initialize with first scroll event is a workaround
    let virtualScroll: number | null = null;

    function unvirtualize(vscroll: number) {
      if (vscroll < min) {
        return vscroll;
      }
      if (vscroll < min + (max - min) / speedRatio) {
        return min + (vscroll - min) * speedRatio;
      }
      return (
        min +
        (max - min) * speedRatio +
        (vscroll - ((max - min) / speedRatio + min))
      );
    }

    function virtualize(rscroll: number) {
      if (rscroll < min) {
        return rscroll;
      }
      if (rscroll < min + (max - min)) {
        return min + (rscroll - min) / speedRatio;
      }
      return min + (max - min) / speedRatio + (rscroll - max);
    }

    function progress(scroll: number) {
      return Math.max(Math.min((scroll - min) / (max - min), 1), 0);
    }

    function handleVirtualScroll(delta: number) {
      const { scrollHeight } = document.documentElement;
      const { scrollY } = window;
      const realScroll = scrollY + delta;

      if (min < realScroll && realScroll < max) {
        if (virtualScroll === null) {
          virtualScroll = virtualize(window.scrollY);
        }

        virtualScroll = Math.max(
          Math.min(virtualScroll + delta, scrollHeight + max - min),
          0
        );
        const simulatedScroll = unvirtualize(virtualScroll);

        /*
        console.log(
          `${min}-${max}-${speedRatio}`,
          realScroll,
          virtualScroll,
          simulatedScroll,
          Math.round(progress(simulatedScroll) * 100)
        );
        */

        window.scrollTo({ top: simulatedScroll });
        return true;
      }

      virtualScroll = virtualize(realScroll);
      return false;
    }

    function scrollListner() {
      if (virtualScroll === null) {
        virtualScroll = virtualize(window.scrollY);
      }

      api.start({
        progress: progress(window.scrollY),
      });
    }

    function wheelListner(e: WheelEvent) {
      if (handleVirtualScroll(e.deltaY)) {
        e.preventDefault();
      }
    }

    function keyListner(e: KeyboardEvent<HTMLElement>) {
      if (e.key === "ArrowUp") {
        if (handleVirtualScroll(-50)) {
          e.preventDefault();
        }
      } else if (e.key === "ArrowDown") {
        if (handleVirtualScroll(50)) {
          e.preventDefault();
        }
      }
    }

    window.addEventListener("scroll", scrollListner);
    window.addEventListener("keydown", keyListner);
    window.addEventListener("wheel", wheelListner, { passive: false });

    return () => {
      each(Object.values(values), (value) => value.stop());
      window.removeEventListener("scroll", scrollListner);
      window.removeEventListener("keydown", keyListner);
      window.removeEventListener("wheel", wheelListner);
    };
  }, [min, max]);

  return values;
}

export function useLinearSpring(
  value: SpringValue<number>,
  xs: number[],
  ys: number[]
) {
  if (xs.length !== ys.length) {
    throw new Error("xs and ys must have the same length");
  }

  return value.to((v) => {
    let i = 0;
    while (xs[i + 1] < v && i < xs.length - 2) i += 1;
    const start = xs[i];
    const end = xs[i + 1];
    const targetStart = ys[i];
    const targetEnd = ys[i + 1];
    return (
      Math.max(Math.min((v - start) / (end - start), 1), 0) *
        (targetEnd - targetStart) +
      targetStart
    );
  });
}
