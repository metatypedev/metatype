from typegraph.graphs.typegraph import TypeGraph
from typegraph.importers.graphql import import_graphql
from typegraph.materializers.graphql import GraphQLRuntime
from typegraph.types import typedefs as t

import_graphql("https://hivdb.stanford.edu/graphql", False)

with TypeGraph(name="hivdb") as g:
    remote = GraphQLRuntime("https://hivdb.stanford.edu/graphql")
    t.string().named("ASIAlgorithm")  # kind: ENUM
    t.struct(
        {
            "drugClass": t.optional(g("DrugClass")),
            "drugScores": t.optional(t.list(g("ComparableDrugScore"))),
        }
    ).named(
        "AlgorithmComparison"
    )  # kind: OBJECT
    t.struct(
        {
            "gene": t.optional(g("Gene")),
            "firstAA": t.optional(t.integer()),
            "lastAA": t.optional(t.integer()),
            "firstNA": t.optional(t.integer()),
            "lastNA": t.optional(t.integer()),
            "matchPcnt": t.optional(t.float()),
            "size": t.optional(t.integer()),
            "prettyPairwise": t.optional(g("PrettyPairwise")),
            "alignedNAs": t.optional(t.string()),
            "alignedAAs": t.optional(t.string()),
            "adjustedAlignedNAs": t.optional(t.string()),
            "adjustedAlignedAAs": t.optional(t.string()),
            "mutations": t.optional(t.list(g("Mutation"))),
            "frameShifts": t.optional(t.list(g("FrameShift"))),
        }
    ).named(
        "AlignedGeneSequence"
    )  # kind: OBJECT
    t.struct(
        {
            "name": t.optional(t.string()),
            "gene": t.optional(g("Gene")),
            "drugClass": t.optional(g("DrugClass")),
            "type": t.optional(t.string()),
            "text": t.optional(t.string()),
            "triggeredAAs": t.optional(t.string()),
            "boundMutation": t.optional(g("Mutation")),
            "highlightText": t.optional(t.list(t.string())),
        }
    ).named(
        "BoundMutationComment"
    )  # kind: OBJECT
    t.struct(
        {
            "boundMutation": t.optional(g("Mutation")),
            "matched": t.optional(t.list(g("MutationPrevalenceByAA"))),
            "others": t.optional(t.list(g("MutationPrevalenceByAA"))),
        }
    ).named(
        "BoundMutationPrevalence"
    )  # kind: OBJECT
    t.struct(
        {
            "name": t.optional(t.string()),
            "distancePcnt": t.optional(t.float()),
            "display": t.optional(t.string()),
        }
    ).named(
        "BoundSubtype"
    )  # kind: OBJECT
    t.string().named("CommentType")  # kind: ENUM
    t.struct(
        {
            "mutationType": t.optional(t.string()),
            "commentType": t.optional(t.string()),
            "comments": t.optional(t.list(g("BoundMutationComment"))),
        }
    ).named(
        "CommentsByType"
    )  # kind: OBJECT
    t.struct(
        {
            "drug": t.optional(g("Drug")),
            "algorithm": t.optional(t.string()),
            "SIR": t.optional(t.string()),
            "interpretation": t.optional(t.string()),
            "explanation": t.optional(t.string()),
        }
    ).named(
        "ComparableDrugScore"
    )  # kind: OBJECT
    t.struct({"name": t.optional(t.string()), "xml": t.optional(t.string()),}).named(
        "CustomASIAlgorithm"
    )  # kind: INPUT_OBJECT
    t.struct(
        {
            "mean": t.optional(t.float()),
            "standardDeviation": t.optional(t.float()),
            "min": t.optional(t.float()),
            "max": t.optional(t.float()),
            "n": t.optional(t.float()),
            "sum": t.optional(t.float()),
            "values": t.optional(t.list(t.float())),
            "percentile": t.optional(t.float()),
        }
    ).named(
        "DescriptiveStatistics"
    )  # kind: OBJECT
    t.struct(
        {
            "name": t.optional(t.string()),
            "displayAbbr": t.optional(t.string()),
            "fullName": t.optional(t.string()),
            "drugClass": t.optional(g("DrugClass")),
        }
    ).named(
        "Drug"
    )  # kind: OBJECT
    t.struct(
        {
            "name": t.optional(t.string()),
            "fullName": t.optional(t.string()),
            "drugs": t.optional(t.list(g("Drug"))),
            "gene": t.optional(g("Gene")),
        }
    ).named(
        "DrugClass"
    )  # kind: OBJECT
    t.string().named("DrugClassEnum")  # kind: ENUM
    t.string().named("DrugEnum")  # kind: ENUM
    t.struct(
        {
            "mutations": t.optional(t.list(g("Mutation"))),
            "score": t.optional(t.float()),
        }
    ).named(
        "DrugPartialScore"
    )  # kind: OBJECT
    t.struct(
        {
            "version": t.optional(g("DrugResistanceAlgorithm")),
            "algorithm": t.optional(g("DrugResistanceAlgorithm")),
            "gene": t.optional(g("Gene")),
            "drugScores": t.optional(t.list(g("DrugScore"))),
            "mutationsByTypes": t.optional(t.list(g("MutationsByType"))),
            "commentsByTypes": t.optional(t.list(g("CommentsByType"))),
        }
    ).named(
        "DrugResistance"
    )  # kind: OBJECT
    t.struct(
        {
            "text": t.optional(t.string()),
            "display": t.optional(t.string()),
            "family": t.optional(t.string()),
            "version": t.optional(t.string()),
            "strain": t.optional(g("Strain")),
            "publishDate": t.optional(t.string()),
        }
    ).named(
        "DrugResistanceAlgorithm"
    )  # kind: OBJECT
    t.struct(
        {
            "drugClass": t.optional(g("DrugClass")),
            "drug": t.optional(g("Drug")),
            "SIR": t.optional(t.string()),
            "score": t.optional(t.float()),
            "level": t.optional(t.integer()),
            "text": t.optional(t.string()),
            "partialScores": t.optional(t.list(g("DrugPartialScore"))),
        }
    ).named(
        "DrugScore"
    )  # kind: OBJECT
    t.string().named("EnumGene")  # kind: ENUM
    t.string().named("EnumSequenceReadsHistogramAggregatesOption")  # kind: ENUM
    t.struct(
        {
            "gene": t.optional(g("Gene")),
            "position": t.optional(t.integer()),
            "isInsertion": t.optional(t.boolean()),
            "isDeletion": t.optional(t.boolean()),
            "size": t.optional(t.integer()),
            "NAs": t.optional(t.string()),
            "text": t.optional(t.string()),
        }
    ).named(
        "FrameShift"
    )  # kind: OBJECT
    t.struct(
        {
            "nameWithStrain": t.optional(t.string()),
            "name": t.optional(t.string()),
            "strain": t.optional(g("Strain")),
            "refSequence": t.optional(t.string()),
            "reference": t.optional(t.string()),
            "consensus": t.optional(t.string()),
            "length": t.optional(t.integer()),
            "drugClasses": t.optional(t.list(g("DrugClass"))),
            "mutationTypes": t.optional(t.list(t.string())),
        }
    ).named(
        "Gene"
    )  # kind: OBJECT
    t.struct(
        {
            "gene": t.optional(g("Gene")),
            "firstAA": t.optional(t.integer()),
            "lastAA": t.optional(t.integer()),
            "allPositionCodonReads": t.optional(t.list(g("PositionCodonReads"))),
            "internalJsonAllPositionCodonReads": t.optional(t.string()),
            "size": t.optional(t.integer()),
            "numPositions": t.optional(t.integer()),
            "readDepthStats": t.optional(g("DescriptiveStatistics")),
            "alignedNAs": t.optional(t.string()),
            "alignedAAs": t.optional(t.string()),
            "mutations": t.optional(t.list(g("Mutation"))),
            "histogram": t.optional(g("SequenceReadsHistogram")),
        }
    ).named(
        "GeneSequenceReads"
    )  # kind: OBJECT
    t.struct(
        {
            "display": t.optional(t.string()),
            "displayWithoutDistance": t.optional(t.string()),
            "subtype": t.optional(g("HIVSubtype")),
            "genotype": t.optional(g("HIVSubtype")),
            "displaySubtypes": t.optional(t.list(g("HIVSubtype"))),
            "displayGenotypes": t.optional(t.list(g("HIVSubtype"))),
            "firstNA": t.optional(t.integer()),
            "lastNA": t.optional(t.integer()),
            "distance": t.optional(t.float()),
            "distancePcnt": t.optional(t.string()),
            "referenceAccession": t.optional(t.string()),
            "referenceCountry": t.optional(t.string()),
            "referenceYear": t.optional(t.integer()),
            "discordanceList": t.optional(t.list(t.integer())),
        }
    ).named(
        "HIVBoundSubtype"
    )  # kind: OBJECT
    t.string().named("HIVClassificationLevel")  # kind: ENUM
    t.struct(
        {
            "indexName": t.optional(t.string()),
            "displayName": t.optional(t.string()),
            "classificationLevel": t.optional(t.string()),
        }
    ).named(
        "HIVSubtype"
    )  # kind: OBJECT
    t.struct(
        {
            "gene": t.optional(g("Gene")),
            "reference": t.optional(t.string()),
            "consensus": t.optional(t.string()),
            "position": t.optional(t.integer()),
            "displayAAs": t.optional(t.string()),
            "AAs": t.optional(t.string()),
            "displayAAChars": t.optional(t.list(t.string())),
            "AAChars": t.optional(t.list(t.string())),
            "triplet": t.optional(t.string()),
            "insertedNAs": t.optional(t.string()),
            "isInsertion": t.optional(t.boolean()),
            "isDeletion": t.optional(t.boolean()),
            "isIndel": t.optional(t.boolean()),
            "isAmbiguous": t.optional(t.boolean()),
            "isApobecMutation": t.optional(t.boolean()),
            "isApobecDRM": t.optional(t.boolean()),
            "isUnsequenced": t.optional(t.boolean()),
            "isDRM": t.optional(t.boolean()),
            "hasStop": t.optional(t.boolean()),
            "isUnusual": t.optional(t.boolean()),
            "isSDRM": t.optional(t.boolean()),
            "types": t.optional(t.list(t.string())),
            "primaryType": t.optional(t.string()),
            "comments": t.optional(t.list(g("BoundMutationComment"))),
            "text": t.optional(t.string()),
            "shortText": t.optional(t.string()),
        }
    ).named(
        "Mutation"
    )  # kind: OBJECT
    t.struct(
        {
            "AA": t.optional(t.string()),
            "subtype": t.optional(g("MutationPrevalenceSubtype")),
            "totalNaive": t.optional(t.integer()),
            "frequencyNaive": t.optional(t.integer()),
            "percentageNaive": t.optional(t.float()),
            "totalTreated": t.optional(t.integer()),
            "frequencyTreated": t.optional(t.integer()),
            "percentageTreated": t.optional(t.float()),
        }
    ).named(
        "MutationPrevalence"
    )  # kind: OBJECT
    t.struct(
        {
            "AA": t.optional(t.string()),
            "subtypes": t.optional(t.list(g("MutationPrevalence"))),
        }
    ).named(
        "MutationPrevalenceByAA"
    )  # kind: OBJECT
    t.struct(
        {
            "name": t.optional(t.string()),
            "stats": t.optional(t.list(g("MutationPrevalenceSubtypeStat"))),
        }
    ).named(
        "MutationPrevalenceSubtype"
    )  # kind: OBJECT
    t.struct(
        {
            "gene": t.optional(g("Gene")),
            "totalNaive": t.optional(t.integer()),
            "totalTreated": t.optional(t.integer()),
        }
    ).named(
        "MutationPrevalenceSubtypeStat"
    )  # kind: OBJECT
    t.string().named("MutationSetFilterOption")  # kind: ENUM
    t.string().named("MutationType")  # kind: ENUM
    t.struct(
        {
            "name": t.optional(t.string()),
            "validationResults": t.optional(t.list(g("ValidationResult"))),
            "drugResistance": t.optional(t.list(g("DrugResistance"))),
            "mutationPrevalences": t.optional(t.list(g("BoundMutationPrevalence"))),
            "algorithmComparison": t.optional(t.list(g("AlgorithmComparison"))),
        }
    ).named(
        "MutationsAnalysis"
    )  # kind: OBJECT
    t.struct(
        {
            "mutationType": t.optional(t.string()),
            "mutations": t.optional(t.list(g("Mutation"))),
        }
    ).named(
        "MutationsByType"
    )  # kind: OBJECT
    t.struct(
        {
            "codon": t.optional(t.string()),
            "reads": t.optional(t.integer()),
            "refAminoAcid": t.optional(t.string()),
            "aminoAcid": t.optional(t.string()),
            "proportion": t.optional(t.float()),
            "codonPercent": t.optional(t.float()),
            "aaPercent": t.optional(t.float()),
            "isReference": t.optional(t.boolean()),
            "isDRM": t.optional(t.boolean()),
            "isUnusual": t.optional(t.boolean()),
            "isApobecMutation": t.optional(t.boolean()),
            "isApobecDRM": t.optional(t.boolean()),
        }
    ).named(
        "OneCodonReads"
    )  # kind: OBJECT
    t.struct(
        {
            "gene": t.optional(g("Gene")),
            "position": t.optional(t.integer()),
            "totalReads": t.optional(t.integer()),
            "isTrimmed": t.optional(t.boolean()),
        }
    ).named(
        "OneCodonReadsCoverage"
    )  # kind: OBJECT
    t.struct(
        {
            "codon": t.optional(t.string()),
            "reads": t.optional(t.integer()),
        }
    ).named(
        "OneCodonReadsInput"
    )  # kind: INPUT_OBJECT
    t.struct(
        {
            "gene": t.optional(g("Gene")),
            "position": t.optional(t.integer()),
            "totalReads": t.optional(t.integer()),
            "codonReads": t.optional(t.list(g("OneCodonReads"))),
        }
    ).named(
        "PositionCodonReads"
    )  # kind: OBJECT
    t.struct(
        {
            "gene": t.optional(t.string()),
            "position": t.optional(t.integer()),
            "totalReads": t.optional(t.integer()),
            "allCodonReads": t.optional(t.list(g("OneCodonReadsInput"))),
        }
    ).named(
        "PositionCodonReadsInput"
    )  # kind: INPUT_OBJECT
    t.struct(
        {
            "positionLine": t.optional(t.list(t.string())),
            "refAALine": t.optional(t.list(t.string())),
            "alignedNAsLine": t.optional(t.list(t.string())),
            "mutationLine": t.optional(t.list(t.string())),
        }
    ).named(
        "PrettyPairwise"
    )  # kind: OBJECT
    t.string().named("SIR")  # kind: ENUM
    t.struct(
        {
            "inputSequence": t.optional(g("UnalignedSequenceOutput")),
            "strain": t.optional(g("Strain")),
            "isReverseComplement": t.optional(t.boolean()),
            "availableGenes": t.optional(t.list(g("Gene"))),
            "validationResults": t.optional(t.list(g("ValidationResult"))),
            "alignedGeneSequences": t.optional(t.list(g("AlignedGeneSequence"))),
            "subtypesV2": t.optional(t.list(g("HIVBoundSubtype"))),
            "bestMatchingSubtype": t.optional(g("HIVBoundSubtype")),
            "genotypes": t.optional(t.list(g("HIVBoundSubtype"))),
            "bestMatchingGenotype": t.optional(g("HIVBoundSubtype")),
            "mixturePcnt": t.optional(t.float()),
            "mutations": t.optional(t.list(g("Mutation"))),
            "frameShifts": t.optional(t.list(g("FrameShift"))),
            "drugResistance": t.optional(t.list(g("DrugResistance"))),
            "mutationPrevalences": t.optional(t.list(g("BoundMutationPrevalence"))),
            "subtypes": t.optional(t.list(g("BoundSubtype"))),
            "subtypeText": t.optional(t.string()),
            "algorithmComparison": t.optional(t.list(g("AlgorithmComparison"))),
        }
    ).named(
        "SequenceAnalysis"
    )  # kind: OBJECT
    t.struct(
        {
            "name": t.optional(t.string()),
            "strain": t.optional(g("Strain")),
            "cutoffSuggestionLooserLimit": t.optional(t.float()),
            "cutoffSuggestionStricterLimit": t.optional(t.float()),
            "validationResults": t.optional(t.list(g("ValidationResult"))),
            "minPrevalence": t.optional(t.float()),
            "minCodonCount": t.optional(t.integer()),
            "minReadDepth": t.optional(t.integer()),
            "availableGenes": t.optional(t.list(g("Gene"))),
            "allGeneSequenceReads": t.optional(t.list(g("GeneSequenceReads"))),
            "subtypes": t.optional(t.list(g("HIVBoundSubtype"))),
            "bestMatchingSubtype": t.optional(g("HIVBoundSubtype")),
            "mixturePcnt": t.optional(t.float()),
            "mutations": t.optional(t.list(g("Mutation"))),
            "drugResistance": t.optional(t.list(g("DrugResistance"))),
            "histogram": t.optional(g("SequenceReadsHistogram")),
            "histogramByCodonCount": t.optional(
                g("SequenceReadsHistogramByCodonCount")
            ),
            "readDepthStats": t.optional(g("DescriptiveStatistics")),
            "readDepthStatsDRP": t.optional(g("DescriptiveStatistics")),
            "codonReadsCoverage": t.optional(t.list(g("OneCodonReadsCoverage"))),
            "internalJsonCodonReadsCoverage": t.optional(t.string()),
        }
    ).named(
        "SequenceReadsAnalysis"
    )  # kind: OBJECT
    t.struct(
        {
            "usualSites": t.optional(t.list(g("SequenceReadsHistogramBin"))),
            "drmSites": t.optional(t.list(g("SequenceReadsHistogramBin"))),
            "unusualSites": t.optional(t.list(g("SequenceReadsHistogramBin"))),
            "unusualApobecSites": t.optional(t.list(g("SequenceReadsHistogramBin"))),
            "unusualNonApobecSites": t.optional(t.list(g("SequenceReadsHistogramBin"))),
            "apobecSites": t.optional(t.list(g("SequenceReadsHistogramBin"))),
            "apobecDrmSites": t.optional(t.list(g("SequenceReadsHistogramBin"))),
            "stopCodonSites": t.optional(t.list(g("SequenceReadsHistogramBin"))),
            "numPositions": t.optional(t.integer()),
        }
    ).named(
        "SequenceReadsHistogram"
    )  # kind: OBJECT
    t.struct(
        {
            "percentStart": t.optional(t.float()),
            "percentStop": t.optional(t.float()),
            "count": t.optional(t.integer()),
        }
    ).named(
        "SequenceReadsHistogramBin"
    )  # kind: OBJECT
    t.struct(
        {
            "usualSites": t.optional(
                t.list(g("SequenceReadsHistogramByCodonCountBin"))
            ),
            "drmSites": t.optional(t.list(g("SequenceReadsHistogramByCodonCountBin"))),
            "unusualSites": t.optional(
                t.list(g("SequenceReadsHistogramByCodonCountBin"))
            ),
            "unusualApobecSites": t.optional(
                t.list(g("SequenceReadsHistogramByCodonCountBin"))
            ),
            "unusualNonApobecSites": t.optional(
                t.list(g("SequenceReadsHistogramByCodonCountBin"))
            ),
            "apobecSites": t.optional(
                t.list(g("SequenceReadsHistogramByCodonCountBin"))
            ),
            "apobecDrmSites": t.optional(
                t.list(g("SequenceReadsHistogramByCodonCountBin"))
            ),
            "stopCodonSites": t.optional(
                t.list(g("SequenceReadsHistogramByCodonCountBin"))
            ),
            "numPositions": t.optional(t.integer()),
        }
    ).named(
        "SequenceReadsHistogramByCodonCount"
    )  # kind: OBJECT
    t.struct(
        {
            "cutoff": t.optional(t.integer()),
            "count": t.optional(t.integer()),
        }
    ).named(
        "SequenceReadsHistogramByCodonCountBin"
    )  # kind: OBJECT
    t.struct(
        {
            "name": t.optional(t.string()),
            "strain": t.optional(t.string()),
            "allReads": t.optional(t.list(g("PositionCodonReadsInput"))),
            "minPrevalence": t.optional(t.float()),
            "minCodonCount": t.optional(t.integer()),
            "minReadDepth": t.optional(t.integer()),
        }
    ).named(
        "SequenceReadsInput"
    )  # kind: INPUT_OBJECT
    t.struct(
        {
            "text": t.optional(t.string()),
            "publishDate": t.optional(t.string()),
        }
    ).named(
        "SierraVersion"
    )  # kind: OBJECT
    t.struct(
        {
            "name": t.optional(t.string()),
            "display": t.optional(t.string()),
        }
    ).named(
        "Strain"
    )  # kind: OBJECT
    t.string().named("StrainEnum")  # kind: ENUM
    t.string().named("Subtype")  # kind: ENUM
    t.struct(
        {
            "header": t.optional(t.string()),
            "sequence": t.optional(t.string()),
        }
    ).named(
        "UnalignedSequenceInput"
    )  # kind: INPUT_OBJECT
    t.struct(
        {
            "header": t.optional(t.string()),
            "sequence": t.optional(t.string()),
            "MD5": t.optional(t.string()),
            "SHA512": t.optional(t.string()),
        }
    ).named(
        "UnalignedSequenceOutput"
    )  # kind: OBJECT
    t.string().named("ValidationLevel")  # kind: ENUM
    t.struct(
        {
            "level": t.optional(t.string()),
            "message": t.optional(t.string()),
        }
    ).named(
        "ValidationResult"
    )  # kind: OBJECT
    t.struct(
        {
            "currentVersion": t.optional(g("DrugResistanceAlgorithm")),
            "currentProgramVersion": t.optional(g("SierraVersion")),
            "sequenceAnalysis": t.optional(t.list(g("SequenceAnalysis"))),
            "sequenceReadsAnalysis": t.optional(t.list(g("SequenceReadsAnalysis"))),
            "mutationsAnalysis": t.optional(g("MutationsAnalysis")),
            "patternAnalysis": t.optional(t.list(g("MutationsAnalysis"))),
            "genes": t.optional(t.list(g("Gene"))),
            "mutationPrevalenceSubtypes": t.optional(
                t.list(g("MutationPrevalenceSubtype"))
            ),
        }
    ).named(
        "Viewer"
    )  # kind: OBJECT
    g.expose(
        currentVersion=remote.query(
            t.struct({}), t.optional(g("DrugResistanceAlgorithm"))
        ),
        currentProgramVersion=remote.query(
            t.struct({}), t.optional(g("SierraVersion"))
        ),
        sequenceAnalysis=remote.query(
            t.struct(
                {
                    "sequences": t.optional(t.list(g("UnalignedSequenceInput"))),
                }
            ),
            t.optional(t.list(g("SequenceAnalysis"))),
        ),
        sequenceReadsAnalysis=remote.query(
            t.struct(
                {
                    "sequenceReads": t.optional(t.list(g("SequenceReadsInput"))),
                }
            ),
            t.optional(t.list(g("SequenceReadsAnalysis"))),
        ),
        mutationsAnalysis=remote.query(
            t.struct(
                {
                    "mutations": t.optional(t.list(t.string())),
                }
            ),
            t.optional(g("MutationsAnalysis")),
        ),
        patternAnalysis=remote.query(
            t.struct(
                {
                    "patterns": t.optional(t.list(t.list(t.string()))),
                    "patternNames": t.optional(t.list(t.string())),
                }
            ),
            t.optional(t.list(g("MutationsAnalysis"))),
        ),
        genes=remote.query(
            t.struct(
                {
                    "names": t.optional(t.list(t.string())),
                }
            ),
            t.optional(t.list(g("Gene"))),
        ),
        mutationPrevalenceSubtypes=remote.query(
            t.struct({}), t.optional(t.list(g("MutationPrevalenceSubtype")))
        ),
        viewer=remote.query(t.struct({}), t.optional(g("Viewer"))),
    )
