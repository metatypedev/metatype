// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { KeyboardEvent, useEffect } from "react";
import { useSpring, SpringValue } from "@react-spring/konva";
import { each } from "@react-spring/shared";

export function useVirtualScroll(
  [min, max]: [number, number],
  slowMotionRatio = 1
) {
  const [values, api] = useSpring(
    () => ({
      progress: window.pageYOffset,
    }),
    []
  );

  useEffect(() => {
    const initialScroll = document.documentElement.scrollTop;
    let virtualScroll = virtualize(initialScroll);
    api.set({ progress: progressRatio(initialScroll) });

    function unvirtualize(scroll: number) {
      if (scroll < min) {
        return scroll;
      }
      if (scroll < min + (max - min) / slowMotionRatio) {
        return min + (scroll - min) * slowMotionRatio;
      }
      return scroll + (max - min) - (max - min) / slowMotionRatio;
    }

    function virtualize(scroll: number) {
      if (scroll < min) {
        return scroll;
      }
      if (scroll < min + (max - min) * slowMotionRatio) {
        return min + (scroll - min) / slowMotionRatio;
      }
      return scroll + (max - min) - (max - min) * slowMotionRatio;
    }

    function progressRatio(scroll: number) {
      return Math.max(Math.min((scroll - min) / (max - min), 1), 0);
    }

    function handleVirtualScroll(delta: number) {
      virtualScroll = Math.max(
        Math.min(
          virtualScroll + delta,
          document.documentElement.scrollHeight + max - min
        ),
        0
      );

      const realScroll = unvirtualize(virtualScroll);
      window.scrollTo({ top: realScroll });
      api.start({
        progress: progressRatio(realScroll),
      });

      // console.log(virtualScroll, realScroll, progressRatio(realScroll));
    }

    function wheelListner(e: WheelEvent) {
      e.preventDefault();
      handleVirtualScroll(e.deltaY);
    }

    function keyListner(e: KeyboardEvent<HTMLElement>) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        handleVirtualScroll(-50);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleVirtualScroll(50);
      }
    }

    window.addEventListener("keydown", keyListner);
    window.addEventListener("wheel", wheelListner, { passive: false });

    return () => {
      each(Object.values(values), (value) => value.stop());
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
