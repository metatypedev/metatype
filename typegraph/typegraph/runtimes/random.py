# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import Callable, Dict, List, Optional

from attrs import field, frozen

from typegraph import effects
from typegraph import types as t
from typegraph import utils
from typegraph.effects import Effect
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.utils.attrs import always


def pick(d: Dict, *largs) -> Dict:
    return utils.drop_nones(utils.pick(d, *largs))


@frozen
class RandomRuntime(Runtime):
    runtime_name: str = always("random")
    seed: Optional[int] = field(kw_only=True, default=None)
    reset: str = field(kw_only=True, default="")

    def get_type_config(self, tpe: "t.typedef") -> Dict:
        base = tpe.runtime_config

        def pick(*largs) -> Dict:
            return utils.drop_nones(utils.pick(base, *largs))

        gen = base.get("gen")

        def pick_fields(default: Callable[[], Dict] = dict, **d: List[str]) -> Dict:
            if gen in d:
                return pick("gen", *d[gen])
            else:
                return default()

        if tpe.type == "boolean":
            return pick(base, "likelihood")

        if tpe.type == "number":
            if gen == "float":
                return pick("gen", "fixed", "min", "max")

        if tpe.type == "integer":
            if gen == "age":
                return pick("gen", "type")
            if gen == "natural" or gen == "prime" or gen is None:
                return pick("gen", "min", "max")

        if tpe.type == "string":
            return pick_fields(
                (
                    lambda: pick(
                        "length", "pool", "alpha", "numeric", "casing", "symbols"
                    )
                ),
                char=["pool", "alpha", "numeric", "casing", "symbols"],
                letter=["casing"],
                paragraph=["sentences"],
                sentence=["words"],
                syllable=[],
                word=["length", "syllables"],
                birthday=[],
                first=["nationality", "gender"],
                last=["nationality", "gender"],
                name=["middle", "middle_initial", "prefix", "nationality"],
                gender=["extraGenders"],
                prefix=["full", "gender"],
                suffix=["full"],
                animal=["type"],
                address=["short_suffix"],
                city=[],
                country=["full"],
                postcode=[],
            )
            # TODO more...

        return dict()

    def generate(self, out, **kwargs):
        return t.gen(out, RandomMat(runtime=self), **kwargs)


@frozen
class RandomMat(Materializer):
    runtime: Runtime = field(factory=RandomRuntime)
    materializer_name: str = always("random")
    effect: Effect = field(kw_only=True, default=effects.none())
