// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { useParams } from "react-router-dom";
import useSWR from "swr";
import { useMemo, useState } from "react";
import clsx from "clsx";
import type { TypeNode } from "../../../../src/typegate/src/typegraph/types";
import type { ReactNode } from "react";

interface ExpandIconProps {
    variant: "plus" | "minus" | "disk";
}

function ExpandIcon({ variant }: ExpandIconProps) {
    return (
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            {variant === "disk" ? (
                <circle cx="4" cy="4" r="2" fill="currentColor" />
            ) : variant === "minus" ? (
                <path d="M1 4H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            ) : (
                <path d="M4 1V7M1 4H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            )}
        </svg>
    );
}

interface ExpandButtonProps {
    expanded: boolean;
    disabled?: boolean;
    onClick: () => void;
}

function ExpandButton({ expanded, disabled = false, onClick }: ExpandButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={clsx(
                "w-4 h-4 flex items-center justify-center transition-colors outline-0 border-1 rounded-full flex-shrink-0",
                disabled
                    ? "text-gray-600 border-gray-600 cursor-default"
                    : "text-gray-400 hover:text-white cursor-pointer border-gray-400"
            )}
        >
            <ExpandIcon variant={disabled ? "disk" : expanded ? "minus" : "plus"} />
        </button>
    );
}

interface TypeHeaderProps {
    idx: number;
    tag: string;
    typeNode: TypeNode;
    expandButton: ReactNode;
    isHovered: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

function TypeHeader({
    idx,
    tag,
    typeNode,
    expandButton,
    isHovered,
    onMouseEnter,
    onMouseLeave
}: TypeHeaderProps) {
    return (
        <header
            className={clsx(
                "px-2 py-1 transition-colors",
                isHovered && "bg-blue-400/20"
            )}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="flex flex-row items-center gap-3 font-mono text-sm cursor-default min-w-0">
                {expandButton}
                <span className="text-gray-500 flex-shrink-0">#{idx}</span>
                <span className="text-orange-500 flex-shrink-0">{tag}</span>
                <span className="text-cyan-500 flex-shrink-0">{typeNode.type}</span>
                <span className="font-bold text-white truncate" title={typeNode.title}>{typeNode.title}</span>
            </div>
        </header>
    );
}

interface TypeProps {
    idx: number;
    tag: string;
}

export function Type({ idx, tag }: TypeProps) {
    const { typegraph } = useParams();
    const { data: typeNode, error, isLoading } = useSWR<TypeNode>(
        typegraph ? `/api/typegraphs/${typegraph}/types/${idx}` : null
    );

    const [expanded, setExpanded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const edges = useMemo(() => typeNode ? getTypeEdges(typeNode) : [], [typeNode]);

    if (isLoading) {
        return (
            <header className="px-2 py-1">
                <span>Loading type #{idx}...</span>
            </header>
        );
    }

    if (error) {
        return (
            <header className="px-2 py-1">
                <span className="text-red-500">Error: {error.message}</span>
            </header>
        );
    }

    if (!typeNode) {
        return null;
    }

    return (
        <>
            <TypeHeader
                idx={idx}
                tag={tag}
                typeNode={typeNode}
                expandButton={
                    <ExpandButton
                        expanded={expanded}
                        disabled={edges.length === 0}
                        onClick={() => setExpanded(!expanded)}
                    />
                }
                isHovered={isHovered}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            />
            <main className={clsx("pl-3", isHovered && "bg-blue-400/10")}>
                <div className="pl-2 border-l-6 border-white/5">
                    {expanded && edges.map(([tag, typeIdx]) => (
                        <Type key={`${typeIdx}-${tag}`} idx={typeIdx} tag={tag} />
                    ))}
                </div>
            </main>
        </>
    );
}

function getTypeEdges(typeNode: TypeNode): [tag: string, typeIdx: number][] {
    switch (typeNode.type) {
        case "object":
            return Object.entries(typeNode.properties).map(([key, idx]) => [`.${key}`, idx]);
        case "list":
            return [["[*]", typeNode.items]];
        case "optional":
            return [["?", typeNode.item]];
        case "union":
            return typeNode.anyOf.map((idx, i) => [`(${i})`, idx]);
        case "either":
            return typeNode.oneOf.map((idx, i) => [`(${i})`, idx]);
        case "function":
            return [["in", typeNode.input], ["out", typeNode.output]];
        default:
            return [];
    }
} 
