from typegraph.graphs.typegraph import TypeGraph
from typegraph.importers.graphql import import_graphql
from typegraph.types import typedefs as t

import_graphql("https://hivdb.stanford.edu/graphql", False)

with TypeGraph(name="hivdb") as g:
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
    # scalar type Boolean skipped
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
    t.struct({"name": t.optional(t.string()), "xml": t.optional(t.string())}).named(
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
    # scalar type Float skipped
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
    # scalar type Int skipped
    # scalar type Long skipped
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
            "viewer": t.optional(g("Viewer")),
        }
    ).named(
        "Root"
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
    # scalar type String skipped
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
    t.struct(
        {
            "name": t.optional(t.string()),
            "description": t.optional(t.string()),
            "locations": t.optional(t.list(t.string())),
            "args": t.list(g("__InputValue")),
            "onOperation": t.optional(t.boolean()),
            "onFragment": t.optional(t.boolean()),
            "onField": t.optional(t.boolean()),
        }
    ).named(
        "__Directive"
    )  # kind: OBJECT
    t.string().named("__DirectiveLocation")  # kind: ENUM
    t.struct(
        {
            "name": t.string(),
            "description": t.optional(t.string()),
            "isDeprecated": t.boolean(),
            "deprecationReason": t.optional(t.string()),
        }
    ).named(
        "__EnumValue"
    )  # kind: OBJECT
    t.struct(
        {
            "name": t.string(),
            "description": t.optional(t.string()),
            "args": t.list(g("__InputValue")),
            "type": g("__Type"),
            "isDeprecated": t.boolean(),
            "deprecationReason": t.optional(t.string()),
        }
    ).named(
        "__Field"
    )  # kind: OBJECT
    t.struct(
        {
            "name": t.string(),
            "description": t.optional(t.string()),
            "type": g("__Type"),
            "defaultValue": t.optional(t.string()),
        }
    ).named(
        "__InputValue"
    )  # kind: OBJECT
    t.struct(
        {
            "types": t.list(g("__Type")),
            "queryType": g("__Type"),
            "mutationType": t.optional(g("__Type")),
            "directives": t.list(g("__Directive")),
            "subscriptionType": t.optional(g("__Type")),
        }
    ).named(
        "__Schema"
    )  # kind: OBJECT
    t.struct(
        {
            "kind": t.string(),
            "name": t.optional(t.string()),
            "description": t.optional(t.string()),
            "fields": t.optional(t.list(g("__Field"))),
            "interfaces": t.optional(t.list(g("__Type"))),
            "possibleTypes": t.optional(t.list(g("__Type"))),
            "enumValues": t.optional(t.list(g("__EnumValue"))),
            "inputFields": t.optional(t.list(g("__InputValue"))),
            "ofType": t.optional(g("__Type")),
        }
    ).named(
        "__Type"
    )  # kind: OBJECT
    t.string().named("__TypeKind")  # kind: ENUM
    schema = {
        "queryType": {"name": "Root"},
        "mutationType": None,
        "subscriptionType": None,
        "types": [
            {
                "kind": "ENUM",
                "name": "ASIAlgorithm",
                "description": "ASI algorithm.",
                "fields": None,
                "inputFields": None,
                "interfaces": None,
                "enumValues": [
                    {
                        "name": "HIVDB_7_0",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "HIVDB_7_5",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "HIVDB_7_6",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "HIVDB_7_8",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "HIVDB_7_9",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "HIVDB_7_10",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "HIVDB_8_0",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "HIVDB_8_0_1",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "HIVDB_8_1",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "HIVDB_8_1_1",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "HIVDB_8_2",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "HIVDB_8_3",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "HIVDB_8_4",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "HIVDB_8_5",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "HIVDB_8_6",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "HIVDB_8_6_1",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "HIVDB_8_7",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "HIVDB_8_8",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "HIVDB_8_9",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "HIVDB_8_9p1",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "HIVDB_9_0",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "HIVDB_9_1",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "ANRS_26",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "ANRS_27",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "ANRS_27stanford2",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "ANRS_28",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "ANRS_29",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "ANRS_30",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "Rega_9_1",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "Rega_10_0",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "AlgorithmComparison",
                "description": None,
                "fields": [
                    {
                        "name": "drugClass",
                        "description": None,
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "DrugClass", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "drugScores",
                        "description": None,
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "ComparableDrugScore",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "AlignedGeneSequence",
                "description": None,
                "fields": [
                    {
                        "name": "gene",
                        "description": "Sequence gene and the reference sequence.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "Gene", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "firstAA",
                        "description": "The first aligned position (start from 1) in protein relative to the reference sequence.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "lastAA",
                        "description": "The last aligned position (start from 1) in protein relative to the reference sequence.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "firstNA",
                        "description": "The first aligned position (start from 1) in DNA relative to the input sequence.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "lastNA",
                        "description": "The last aligned position (start from 1) in DNA relative to the input sequence.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "matchPcnt",
                        "description": "The match percentage of input sequence aligned to the reference sequence.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "size",
                        "description": "The amino acid size of this sequence without unsequenced region (Ns).",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "prettyPairwise",
                        "description": "Formatted pairwise output of the aligned sequence.",
                        "args": [],
                        "type": {
                            "kind": "OBJECT",
                            "name": "PrettyPairwise",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "alignedNAs",
                        "description": "Aligned DNA sequence without insertions and insertion gaps.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "alignedAAs",
                        "description": 'Aligned protein sequence without insertions and insertion gaps. Mixtures are represented as "X".',
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "adjustedAlignedNAs",
                        "description": "(HXB2 numbering) adjusted aligned DNA sequence without insertions and insertion gaps.",
                        "args": [
                            {
                                "name": "targetStrain",
                                "description": "Sequences alignment target strain.",
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "String",
                                    "ofType": None,
                                },
                                "defaultValue": None,
                            }
                        ],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "adjustedAlignedAAs",
                        "description": '(HXB2 numbering) adjusted aligned protein sequence without insertions and insertion gaps. Mixtures are represented as "X".',
                        "args": [
                            {
                                "name": "targetStrain",
                                "description": "Sequences alignment target strain.",
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "String",
                                    "ofType": None,
                                },
                                "defaultValue": None,
                            }
                        ],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "mutations",
                        "description": "All mutations found in the aligned sequence.",
                        "args": [
                            {
                                "name": "filterOptions",
                                "description": "List of filter options for the mutation set.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "ENUM",
                                        "name": "MutationSetFilterOption",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            },
                            {
                                "name": "customList",
                                "description": "List of possible mutation strings that should be included in this query if presented. Gene need to be prepend if the gene is not able to be inferred from the context.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "SCALAR",
                                        "name": "String",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            },
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "Mutation",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "frameShifts",
                        "description": "All frame shifts found in the aligned sequence.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "FrameShift",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "SCALAR",
                "name": "Boolean",
                "description": "Built-in Boolean",
                "fields": None,
                "inputFields": None,
                "interfaces": None,
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "BoundMutationComment",
                "description": "Comment bound to a certain mutation object.",
                "fields": [
                    {
                        "name": "name",
                        "description": "Unique name of the comment.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "gene",
                        "description": "Corresponding gene.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "Gene", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "drugClass",
                        "description": "Corresponding drug class.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "DrugClass", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "type",
                        "description": "Mutation type of this comment.",
                        "args": [],
                        "type": {"kind": "ENUM", "name": "CommentType", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "text",
                        "description": "Comment text.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "triggeredAAs",
                        "description": "Mutated amino acid(s) that triggered the comment.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": True,
                        "deprecationReason": "Use `boundMutation { displayAAs }` instead.",
                    },
                    {
                        "name": "boundMutation",
                        "description": "The mutation that bound to this comment.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "Mutation", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "highlightText",
                        "description": "Text should be highlighted in the comment.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "SCALAR",
                                "name": "String",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "BoundMutationPrevalence",
                "description": "Prevalence data for an input mutation.",
                "fields": [
                    {
                        "name": "boundMutation",
                        "description": "The mutation matched these prevalence data.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "Mutation", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "matched",
                        "description": "Prevalence data that matched the mutation.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "MutationPrevalenceByAA",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "others",
                        "description": "Other prevalence data at the mutation position.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "MutationPrevalenceByAA",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "BoundSubtype",
                "description": "Subtype of certain sequence.",
                "fields": [
                    {
                        "name": "name",
                        "description": "Name of the subtype.",
                        "args": [],
                        "type": {"kind": "ENUM", "name": "Subtype", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "distancePcnt",
                        "description": "The distance percentage compares to the subtype of given sequence. 0.0 means completely the same.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "display",
                        "description": 'String of shown subtype and distance percentage. The shown subtype can be in the form of unknown subtype of recombination like "B + C".',
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "ENUM",
                "name": "CommentType",
                "description": "Comment type.",
                "fields": None,
                "inputFields": None,
                "interfaces": None,
                "enumValues": [
                    {
                        "name": "Major",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "Accessory",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "NRTI",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "NNRTI",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "Other",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "Dosage",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "CommentsByType",
                "description": None,
                "fields": [
                    {
                        "name": "mutationType",
                        "description": "Type of these comments.",
                        "args": [],
                        "type": {"kind": "ENUM", "name": "CommentType", "ofType": None},
                        "isDeprecated": True,
                        "deprecationReason": "Use `commentType` instead.",
                    },
                    {
                        "name": "commentType",
                        "description": "Type of these comments.",
                        "args": [],
                        "type": {"kind": "ENUM", "name": "CommentType", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "comments",
                        "description": "Comments belong to this type.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "BoundMutationComment",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "ComparableDrugScore",
                "description": None,
                "fields": [
                    {
                        "name": "drug",
                        "description": "Drug of this score.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "Drug", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "algorithm",
                        "description": "The name of algorithm which calculated this score.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "SIR",
                        "description": "One of the three step resistance levels of the drug.",
                        "args": [],
                        "type": {"kind": "ENUM", "name": "SIR", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "interpretation",
                        "description": "Readable resistance level defined by the algorithm for the drug.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "explanation",
                        "description": "Text explanation on how this level get calculated.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "INPUT_OBJECT",
                "name": "CustomASIAlgorithm",
                "description": None,
                "fields": None,
                "inputFields": [
                    {
                        "name": "name",
                        "description": "Algorithm name.",
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "defaultValue": None,
                    },
                    {
                        "name": "xml",
                        "description": "ASI XML data.",
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "defaultValue": None,
                    },
                ],
                "interfaces": None,
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "DescriptiveStatistics",
                "description": "Descriptive statistics for a list of values.",
                "fields": [
                    {
                        "name": "mean",
                        "description": "The arithmetic mean of the available values.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "standardDeviation",
                        "description": "The standard deviation of the available values.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "min",
                        "description": "The minimum of the available values.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "max",
                        "description": "The maximum of the available values.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "n",
                        "description": "The number of the available values.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "sum",
                        "description": "The sum of the available values.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "values",
                        "description": "The set of available values.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "SCALAR",
                                "name": "Float",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "percentile",
                        "description": "An estimate for the pth percentile of the stored values.",
                        "args": [
                            {
                                "name": "p",
                                "description": "The requested percentile (scaled from 0 - 100)",
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "Float",
                                    "ofType": None,
                                },
                                "defaultValue": None,
                            }
                        ],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "Drug",
                "description": "HIV drug.",
                "fields": [
                    {
                        "name": "name",
                        "description": "Name of the drug.",
                        "args": [],
                        "type": {"kind": "ENUM", "name": "DrugEnum", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "displayAbbr",
                        "description": "Display abbreviation of the drug.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "fullName",
                        "description": "Full name of the drug.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "drugClass",
                        "description": "Drug class the drug belongs to.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "DrugClass", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "DrugClass",
                "description": "HIV drug class.",
                "fields": [
                    {
                        "name": "name",
                        "description": "Name of the drug class.",
                        "args": [],
                        "type": {
                            "kind": "ENUM",
                            "name": "DrugClassEnum",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "fullName",
                        "description": "Full name of the drug class.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "drugs",
                        "description": "Drugs of this drug class.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "Drug",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "gene",
                        "description": "Gene the drug class belongs to.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "Gene", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "ENUM",
                "name": "DrugClassEnum",
                "description": None,
                "fields": None,
                "inputFields": None,
                "interfaces": None,
                "enumValues": [
                    {
                        "name": "PI",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "NRTI",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "NNRTI",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "INSTI",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "possibleTypes": None,
            },
            {
                "kind": "ENUM",
                "name": "DrugEnum",
                "description": None,
                "fields": None,
                "inputFields": None,
                "interfaces": None,
                "enumValues": [
                    {
                        "name": "ABC",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "ATV",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "AZT",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "BIC",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "CAB",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "D4T",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "DDI",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "DOR",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "DRV",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "DTG",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "EFV",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "ETR",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "EVG",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "FPV",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "FTC",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "IDV",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "LMV",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "LPV",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "NFV",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "NVP",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "RAL",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "RPV",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "SQV",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "TDF",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "TPV",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "DrugPartialScore",
                "description": "Partial score by mutation.",
                "fields": [
                    {
                        "name": "mutations",
                        "description": "Score triggering mutations.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "Mutation",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "score",
                        "description": "Score number.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "DrugResistance",
                "description": None,
                "fields": [
                    {
                        "name": "version",
                        "description": None,
                        "args": [],
                        "type": {
                            "kind": "OBJECT",
                            "name": "DrugResistanceAlgorithm",
                            "ofType": None,
                        },
                        "isDeprecated": True,
                        "deprecationReason": "Use field `algorithm` instead.",
                    },
                    {
                        "name": "algorithm",
                        "description": "Get used drug resistance algorithm.",
                        "args": [],
                        "type": {
                            "kind": "OBJECT",
                            "name": "DrugResistanceAlgorithm",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "gene",
                        "description": "Gene of the drug resistance report.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "Gene", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "drugScores",
                        "description": "List of drug levels and scores.",
                        "args": [
                            {
                                "name": "drugClass",
                                "description": "Specify drug class. Leave this argument empty will return all drugs.",
                                "type": {
                                    "kind": "ENUM",
                                    "name": "DrugClassEnum",
                                    "ofType": None,
                                },
                                "defaultValue": None,
                            }
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "DrugScore",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "mutationsByTypes",
                        "description": None,
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "MutationsByType",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "commentsByTypes",
                        "description": None,
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "CommentsByType",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "DrugResistanceAlgorithm",
                "description": "A drug resistance algorithm.",
                "fields": [
                    {
                        "name": "text",
                        "description": "get key name of this algorithm.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "display",
                        "description": "algorithm family and version for display.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "family",
                        "description": "algorithm family.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "version",
                        "description": "algorithm version.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "strain",
                        "description": "algorithm target strain.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "Strain", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "publishDate",
                        "description": "Publish date of this version.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "DrugScore",
                "description": None,
                "fields": [
                    {
                        "name": "drugClass",
                        "description": "The drug class.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "DrugClass", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "drug",
                        "description": "The drug.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "Drug", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "SIR",
                        "description": "One of the three step resistance levels of the drug.",
                        "args": [],
                        "type": {"kind": "ENUM", "name": "SIR", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "score",
                        "description": "Resistance score of the drug.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "level",
                        "description": "Resistance level (1 - 5) of the drug.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "text",
                        "description": "Readable resistance level of the drug.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "partialScores",
                        "description": "List of partial scores that contributed to this total score.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "DrugPartialScore",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "ENUM",
                "name": "EnumGene",
                "description": None,
                "fields": None,
                "inputFields": None,
                "interfaces": None,
                "enumValues": [
                    {
                        "name": "PR",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "RT",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "IN",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "possibleTypes": None,
            },
            {
                "kind": "ENUM",
                "name": "EnumSequenceReadsHistogramAggregatesOption",
                "description": None,
                "fields": None,
                "inputFields": None,
                "interfaces": None,
                "enumValues": [
                    {
                        "name": "Codon",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "AminoAcid",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "Position",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "possibleTypes": None,
            },
            {
                "kind": "SCALAR",
                "name": "Float",
                "description": "Built-in Float",
                "fields": None,
                "inputFields": None,
                "interfaces": None,
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "FrameShift",
                "description": "Frame shift (NAs length < 3) found in aligned sequence.",
                "fields": [
                    {
                        "name": "gene",
                        "description": "Gene the frame shift belongs to.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "Gene", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "position",
                        "description": "Position of the frame shift.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "isInsertion",
                        "description": "The frame shift is an insertion or not.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "isDeletion",
                        "description": "The frame shift is a deletion or not.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "size",
                        "description": "DNA size of the frame shift.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "NAs",
                        "description": "Nucleic acid(s) of the frame shift.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "text",
                        "description": "Formatted readable text of this frame shift.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "Gene",
                "description": "HIV genes. Accept PR, RT or IN.",
                "fields": [
                    {
                        "name": "nameWithStrain",
                        "description": "Name of the gene (with strain name).",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "name",
                        "description": "Name of the gene (without strain name).",
                        "args": [],
                        "type": {"kind": "ENUM", "name": "EnumGene", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "strain",
                        "description": "HIV strain referred by this gene.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "Strain", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "refSequence",
                        "description": "Reference sequence of this gene.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "reference",
                        "description": None,
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": True,
                        "deprecationReason": "Use field `refSequence` instead.",
                    },
                    {
                        "name": "consensus",
                        "description": None,
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": True,
                        "deprecationReason": "Use field `refSequence` instead.",
                    },
                    {
                        "name": "length",
                        "description": "Length of current gene.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "drugClasses",
                        "description": "Supported drug classes of current gene.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "DrugClass",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "mutationTypes",
                        "description": "Supported mutation types of current gene.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "ENUM",
                                "name": "MutationType",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "GeneSequenceReads",
                "description": None,
                "fields": [
                    {
                        "name": "gene",
                        "description": "Sequence gene and the reference sequence.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "Gene", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "firstAA",
                        "description": "The first sequenced position (start from 1) in protein relative to the reference sequence.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "lastAA",
                        "description": "The last sequenced position (start from 1) in protein relative to the reference sequence.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "allPositionCodonReads",
                        "description": "Position codon reads in this gene sequence.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "PositionCodonReads",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "internalJsonAllPositionCodonReads",
                        "description": "Position codon reads in this gene sequence (json formated).",
                        "args": [
                            {
                                "name": "mutationOnly",
                                "description": "Exclude codons matched subtype B consensus.",
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "Boolean",
                                    "ofType": None,
                                },
                                "defaultValue": "false",
                            },
                            {
                                "name": "maxProportion",
                                "description": "Exclude codons with proportions higher than specified value (0 - 1).",
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "Float",
                                    "ofType": None,
                                },
                                "defaultValue": None,
                            },
                            {
                                "name": "minProportion",
                                "description": "Exclude codons with proportions lower than specified value (0 - 1).",
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "Float",
                                    "ofType": None,
                                },
                                "defaultValue": None,
                            },
                        ],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "size",
                        "description": "The amino acid size of this sequence including unsequenced region.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "numPositions",
                        "description": "The sequenced positions of this sequence.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "readDepthStats",
                        "description": "Descriptive statistics of all read depth.",
                        "args": [],
                        "type": {
                            "kind": "OBJECT",
                            "name": "DescriptiveStatistics",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "alignedNAs",
                        "description": "Aligned DNA sequence without insertions and insertion gaps.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "alignedAAs",
                        "description": 'Aligned protein sequence without insertions and insertion gaps. Mixtures are represented as "X".',
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "mutations",
                        "description": "All mutations found in the aligned sequence.",
                        "args": [
                            {
                                "name": "filterOptions",
                                "description": "List of filter options for the mutation set.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "ENUM",
                                        "name": "MutationSetFilterOption",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            },
                            {
                                "name": "customList",
                                "description": "List of possible mutation strings that should be included in this query if presented. Gene need to be prepend if the gene is not able to be inferred from the context.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "SCALAR",
                                        "name": "String",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            },
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "Mutation",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "histogram",
                        "description": "Histogram data for sequence reads.",
                        "args": [
                            {
                                "name": "pcntLowerLimit",
                                "description": "Percent lower limit of filtering codon reads (range: 0-100).",
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "Float",
                                    "ofType": None,
                                },
                                "defaultValue": "0.001",
                            },
                            {
                                "name": "pcntUpperLimit",
                                "description": "Percent lower limit of filtering codon reads (range: 0-100).",
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "Float",
                                    "ofType": None,
                                },
                                "defaultValue": "0.2",
                            },
                            {
                                "name": "numBins",
                                "description": "Number of bins wanted in this histogram. (either `numBins` or `binTicks` must be provided)",
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "Int",
                                    "ofType": None,
                                },
                                "defaultValue": None,
                            },
                            {
                                "name": "binTicks",
                                "description": "Bin ticks wanted in this histogram. (either `numBins` or `binTicks` must be provided)",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "SCALAR",
                                        "name": "Float",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": "[0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2]",
                            },
                            {
                                "name": "cumulative",
                                "description": "Generate cumulative histogram data instead.",
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "Boolean",
                                    "ofType": None,
                                },
                                "defaultValue": "true",
                            },
                            {
                                "name": "aggregatesBy",
                                "description": "Aggregation option.",
                                "type": {
                                    "kind": "ENUM",
                                    "name": "EnumSequenceReadsHistogramAggregatesOption",
                                    "ofType": None,
                                },
                                "defaultValue": "Position",
                            },
                        ],
                        "type": {
                            "kind": "OBJECT",
                            "name": "SequenceReadsHistogram",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "HIVBoundSubtype",
                "description": None,
                "fields": [
                    {
                        "name": "display",
                        "description": "The display subtype(s) with the distance percent.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "displayWithoutDistance",
                        "description": "The display subtype(s) without the distance percent.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "subtype",
                        "description": "The original subtype found by comparison. The value of this field is UNPROCESSED. You probably want to use field `display` for the final result.",
                        "args": [],
                        "type": {
                            "kind": "OBJECT",
                            "name": "HIVSubtype",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "genotype",
                        "description": None,
                        "args": [],
                        "type": {
                            "kind": "OBJECT",
                            "name": "HIVSubtype",
                            "ofType": None,
                        },
                        "isDeprecated": True,
                        "deprecationReason": "Use field `subtype` instead.",
                    },
                    {
                        "name": "displaySubtypes",
                        "description": "There are several rules applied for subtype displaying. This field lists subtypes that were used in constructing the final result in `display` and `displayWithoutDistance`.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "HIVSubtype",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "displayGenotypes",
                        "description": None,
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "HIVSubtype",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": True,
                        "deprecationReason": "Use field `displaySubtypes` instead.",
                    },
                    {
                        "name": "firstNA",
                        "description": "The first compared/matched NA position in HXB2.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "lastNA",
                        "description": "The last compared/matched NA position in HXB2.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "distance",
                        "description": "The distance between bound sequence and coressponding reference. Noted that 0 <= distance <= 1.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "distancePcnt",
                        "description": "The distance between bound sequence and coressponding reference. Noted that 0% <= distancePcnt <= 100%.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "referenceAccession",
                        "description": "Accession number of the reference being compared.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "referenceCountry",
                        "description": "Country where this reference sequence was collected.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "referenceYear",
                        "description": "Year this reference sequence was collected.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "discordanceList",
                        "description": "A full list of HXB2 positions that present with discordance.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "ENUM",
                "name": "HIVClassificationLevel",
                "description": "Classification level of genotypes: species, group or subtype.",
                "fields": None,
                "inputFields": None,
                "interfaces": None,
                "enumValues": [
                    {
                        "name": "SPECIES",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "GROUP",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "SUBTYPE",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "CRF",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "SUBSUBTYPE",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "HIVSubtype",
                "description": None,
                "fields": [
                    {
                        "name": "indexName",
                        "description": "Short name of current species, group, or subtype. Also used for indexing internally.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "displayName",
                        "description": "Full name of current species, group, or subtype.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "classificationLevel",
                        "description": "Classification level of the subtype.",
                        "args": [],
                        "type": {
                            "kind": "ENUM",
                            "name": "HIVClassificationLevel",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "SCALAR",
                "name": "Int",
                "description": "Built-in Int",
                "fields": None,
                "inputFields": None,
                "interfaces": None,
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "SCALAR",
                "name": "Long",
                "description": "Long type",
                "fields": None,
                "inputFields": None,
                "interfaces": None,
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "Mutation",
                "description": None,
                "fields": [
                    {
                        "name": "gene",
                        "description": "Mutation gene.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "Gene", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "reference",
                        "description": "Amino acid reference at this gene sequence position.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "consensus",
                        "description": None,
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": True,
                        "deprecationReason": "Use field `reference` instead.",
                    },
                    {
                        "name": "position",
                        "description": "Position of the mutation.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "displayAAs",
                        "description": "The mutated AA(s) with possibly inserted AA(s).",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "AAs",
                        "description": "The mutated AA(s) with possibly inserted AA(s). Highly ambiguous mixture is not replaced to X.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "displayAAChars",
                        "description": "A list of AAs.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "SCALAR",
                                "name": "String",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "AAChars",
                        "description": "A list of AAs. Highly ambiguous mixture is not replaced to X.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "SCALAR",
                                "name": "String",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "triplet",
                        "description": "The mutated codon when the mutation is extracting from an aligned sequence.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "insertedNAs",
                        "description": "The inserted codon(s) when the mutation is extracting from an aligned sequence.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "isInsertion",
                        "description": "The mutation is an insertion or not.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "isDeletion",
                        "description": "The mutation is a deletion or not.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "isIndel",
                        "description": "The mutation is an insertion/deletion, or not.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "isAmbiguous",
                        "description": "The mutation is a highly ambiguous mutation or not.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "isApobecMutation",
                        "description": "The mutation is a signature APOBEC-mediated G-to-A hypermutation or not.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "isApobecDRM",
                        "description": "The mutation is a drug resistance mutation (DRM) might be caused by APOBEC-mediated G-to-A hypermutation or not.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "isUnsequenced",
                        "description": "If the mutation is from unsequenced region.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "isDRM",
                        "description": "If the mutation is a drug resistance mutation (DRM) or not.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "hasStop",
                        "description": "The mutation contains stop codon or not.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "isUnusual",
                        "description": "The mutation is a low prevalence (unusual) mutation or not.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "isSDRM",
                        "description": "The mutation is a Surveillance Drug Resistance Mutation (SDRM) or not.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "types",
                        "description": "Ordered list of mutation type(s). List size can be larger than 1 when the mutation is a mixture.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "ENUM",
                                "name": "MutationType",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "primaryType",
                        "description": "Primary type of the mutation.",
                        "args": [],
                        "type": {
                            "kind": "ENUM",
                            "name": "MutationType",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "comments",
                        "description": "Mutation comments.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "BoundMutationComment",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "text",
                        "description": "Formatted text of the mutation (without gene).",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "shortText",
                        "description": "Formatted short text of the mutation (without gene).",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "MutationPrevalence",
                "description": "Prevalence data for a single mutation.",
                "fields": [
                    {
                        "name": "AA",
                        "description": "The amino acid at this position.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "subtype",
                        "description": "Subtype this prevalence belongs to.",
                        "args": [],
                        "type": {
                            "kind": "OBJECT",
                            "name": "MutationPrevalenceSubtype",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "totalNaive",
                        "description": "Total number of naive samples which contain the mutation position.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "frequencyNaive",
                        "description": "Total number of naive samples which contain the mutation.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "percentageNaive",
                        "description": "Proportion of certain mutation occured in the naive samples which contain that position. Equals to 100 * frequencyNaive / totalNaive.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "totalTreated",
                        "description": "Total number of treated samples which contain the mutation position.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "frequencyTreated",
                        "description": "Total number of treated samples which contain the mutation.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "percentageTreated",
                        "description": "Proportion of certain mutation occured in the treated samples which contain that position. Equals to 100 * frequencyTreated / totalTreated.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "MutationPrevalenceByAA",
                "description": "Prevalence data for a single AA (or ins/deletion).",
                "fields": [
                    {
                        "name": "AA",
                        "description": "The amino acid.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "subtypes",
                        "description": "Prevalence data of each subtype.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "MutationPrevalence",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "MutationPrevalenceSubtype",
                "description": "Main subtype that mutation prevalence supported.",
                "fields": [
                    {
                        "name": "name",
                        "description": "Subtype name.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "stats",
                        "description": "Sbutype statistics by genes.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "MutationPrevalenceSubtypeStat",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "MutationPrevalenceSubtypeStat",
                "description": "Statistics data for the subtype.",
                "fields": [
                    {
                        "name": "gene",
                        "description": "Gene the statistic belongs to.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "Gene", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "totalNaive",
                        "description": "Total number of naive samples.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "totalTreated",
                        "description": "Total number of treated samples.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "ENUM",
                "name": "MutationSetFilterOption",
                "description": "Filter option for mutation set.",
                "fields": None,
                "inputFields": None,
                "interfaces": None,
                "enumValues": [
                    {
                        "name": "APOBEC",
                        "description": "List only mutations which are APOBEC-mediated G-to-A hypermutation.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "APOBEC_DRM",
                        "description": "List only drug resistance mutations which are APOBEC-mediated G-to-A hypermutation.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "DRM",
                        "description": "List only mutations which are drug resistance mutation (DRM).",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "DRP",
                        "description": "List all mutations at DRM positions (no need to be DRMs).",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "notDRM",
                        "description": "List only mutations which are not drug resistance mutation (DRM).",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "PI_DRM",
                        "description": "List only mutations which are PI DRM.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "NRTI_DRM",
                        "description": "List only mutations which are NRTI DRM.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "NNRTI_DRM",
                        "description": "List only mutations which are NNRTI DRM.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "INSTI_DRM",
                        "description": "List only mutations which are INSTI DRM.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "SDRM",
                        "description": "List only mutations which are surveillance drug resistance mutations (SDRM).",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "notSDRM",
                        "description": "List only mutations which are not sruveillance drug resistance mutation (SDRM).",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "PI_SDRM",
                        "description": "List only mutations which are PI SDRM.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "NRTI_SDRM",
                        "description": "List only mutations which are NRTI SDRM.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "NNRTI_SDRM",
                        "description": "List only mutations which are NNRTI SDRM.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "INSTI_SDRM",
                        "description": "List only mutations which are INSTI SDRM.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "TSM",
                        "description": "List only mutations which are treatment-selected mutations (TSM).",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "notTSM",
                        "description": "List only mutations which are not treatment-selected mutations (TSM).",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "PI_TSM",
                        "description": "List only mutations which are PI TSM.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "NRTI_TSM",
                        "description": "List only mutations which are NRTI TSM.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "NNRTI_TSM",
                        "description": "List only mutations which are NNRTI TSM.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "INSTI_TSM",
                        "description": "List only mutations which are INSTI TSM.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "GENE_PR",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "GENE_RT",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "GENE_IN",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "TYPE_MAJOR",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "TYPE_ACCESSORY",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "TYPE_NRTI",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "TYPE_NNRTI",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "TYPE_OTHER",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "INSERTION",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "DELETION",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "UNUSUAL",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "AMBIGUOUS",
                        "description": "List all highly-ambiguous (HBDVN) mutations.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "STOPCODON",
                        "description": "List only mutations with stop codon(s).",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "CUSTOMLIST",
                        "description": "Accept a custom list of mutations and find the intersects.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "possibleTypes": None,
            },
            {
                "kind": "ENUM",
                "name": "MutationType",
                "description": "Mutation type.",
                "fields": None,
                "inputFields": None,
                "interfaces": None,
                "enumValues": [
                    {
                        "name": "NRTI",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "NNRTI",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "Major",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "Accessory",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "Other",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "MutationsAnalysis",
                "description": None,
                "fields": [
                    {
                        "name": "name",
                        "description": "Optional name provided by client to identify this mutation list.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "validationResults",
                        "description": "Validation results for the mutation list.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "ValidationResult",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "drugResistance",
                        "description": "List of drug resistance results by genes.",
                        "args": [
                            {
                                "name": "algorithm",
                                "description": "One of the built-in ASI algorithms.",
                                "type": {
                                    "kind": "ENUM",
                                    "name": "ASIAlgorithm",
                                    "ofType": None,
                                },
                                "defaultValue": "HIVDB_9_1",
                            }
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "DrugResistance",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "mutationPrevalences",
                        "description": "List of mutation prevalence results.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "BoundMutationPrevalence",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "algorithmComparison",
                        "description": "List of ASI comparison results.",
                        "args": [
                            {
                                "name": "algorithms",
                                "description": "One or more of the built-in ASI algorithms.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "ENUM",
                                        "name": "ASIAlgorithm",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            },
                            {
                                "name": "customAlgorithms",
                                "description": "One or more of custom ASI algorithms.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "INPUT_OBJECT",
                                        "name": "CustomASIAlgorithm",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            },
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "AlgorithmComparison",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "MutationsByType",
                "description": None,
                "fields": [
                    {
                        "name": "mutationType",
                        "description": "Type of these mutations.",
                        "args": [],
                        "type": {
                            "kind": "ENUM",
                            "name": "MutationType",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "mutations",
                        "description": "Mutations belong to this type.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "Mutation",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "OneCodonReads",
                "description": "A single codon reads.",
                "fields": [
                    {
                        "name": "codon",
                        "description": "The triplet codon. Insertion should be append to the triplet NAs directly. Deletion should use '-'.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "reads",
                        "description": "Number of reads for this codon.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Long", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "refAminoAcid",
                        "description": "The corresponding reference amino acid.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "aminoAcid",
                        "description": "The corresponding amino acid.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "proportion",
                        "description": "Codon proportion of current position (0.0 - 1.0)",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "codonPercent",
                        "description": "Codon prevalence in HIVDB database (0.0 - 1.0)",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "aaPercent",
                        "description": "Amino acid prevalence in HIVDB database (0.0 - 1.0)",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "isReference",
                        "description": "The amino acid is the same as the reference (consensus) amino acid.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "isDRM",
                        "description": "The amino acid is a known drug resistance mutation (DRM).",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "isUnusual",
                        "description": "The amino acid is an unusual mutation.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "isApobecMutation",
                        "description": "The amino acid is a signature APOBEC-mediated hypermutation.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "isApobecDRM",
                        "description": "The amino acid is a drug resistance mutation (DRM) might be caused by APOBEC-mediated G-to-A hypermutation.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "OneCodonReadsCoverage",
                "description": None,
                "fields": [
                    {
                        "name": "gene",
                        "description": "Gene of this record.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "Gene", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "position",
                        "description": "Codon position in this gene.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Long", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "totalReads",
                        "description": "Total reads of this position.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Long", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "isTrimmed",
                        "description": "This position is trimmed or not.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "INPUT_OBJECT",
                "name": "OneCodonReadsInput",
                "description": "A single codon reads.",
                "fields": None,
                "inputFields": [
                    {
                        "name": "codon",
                        "description": "The triplet codon. Insertion should be append to the triplet NAs directly. Deletion should use '-'.",
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "defaultValue": None,
                    },
                    {
                        "name": "reads",
                        "description": "Number of reads for this codon.",
                        "type": {"kind": "SCALAR", "name": "Long", "ofType": None},
                        "defaultValue": None,
                    },
                ],
                "interfaces": None,
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "PositionCodonReads",
                "description": "Codon reads at a single position.",
                "fields": [
                    {
                        "name": "gene",
                        "description": "Gene of this position.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "Gene", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "position",
                        "description": "Codon/amino acid position.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "totalReads",
                        "description": "Total reads at this position. The field will be automatically calculated from `allCodonReads` if it's absent.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Long", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "codonReads",
                        "description": "All codon reads at this position.",
                        "args": [
                            {
                                "name": "mutationOnly",
                                "description": "Exclude codons matched subtype B consensus.",
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "Boolean",
                                    "ofType": None,
                                },
                                "defaultValue": "false",
                            },
                            {
                                "name": "maxProportion",
                                "description": "Exclude codons with proportions higher than specified value (0 - 1).",
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "Float",
                                    "ofType": None,
                                },
                                "defaultValue": None,
                            },
                            {
                                "name": "minProportion",
                                "description": "Exclude codons with proportions lower than specified value (0 - 1).",
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "Float",
                                    "ofType": None,
                                },
                                "defaultValue": None,
                            },
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "OneCodonReads",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "INPUT_OBJECT",
                "name": "PositionCodonReadsInput",
                "description": "Codon reads at a single position.",
                "fields": None,
                "inputFields": [
                    {
                        "name": "gene",
                        "description": "Gene of this position.",
                        "type": {"kind": "ENUM", "name": "EnumGene", "ofType": None},
                        "defaultValue": None,
                    },
                    {
                        "name": "position",
                        "description": "Codon/amino acid position.",
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "defaultValue": None,
                    },
                    {
                        "name": "totalReads",
                        "description": "Total reads at this position. The field will be automatically calculated from `allCodonReads` if it's absent.",
                        "type": {"kind": "SCALAR", "name": "Long", "ofType": None},
                        "defaultValue": "-1",
                    },
                    {
                        "name": "allCodonReads",
                        "description": "All codon reads at this position.",
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "INPUT_OBJECT",
                                "name": "OneCodonReadsInput",
                                "ofType": None,
                            },
                        },
                        "defaultValue": None,
                    },
                ],
                "interfaces": None,
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "PrettyPairwise",
                "description": "Formatted pairwise result of the aligned sequence.",
                "fields": [
                    {
                        "name": "positionLine",
                        "description": "Formmated numeric position line.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "SCALAR",
                                "name": "String",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "refAALine",
                        "description": "Formmated reference protein sequence line.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "SCALAR",
                                "name": "String",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "alignedNAsLine",
                        "description": "Formmated aligned DNA sequence line.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "SCALAR",
                                "name": "String",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "mutationLine",
                        "description": "Formmated amino acid mutation line.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "SCALAR",
                                "name": "String",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "Root",
                "description": None,
                "fields": [
                    {
                        "name": "currentVersion",
                        "description": "Current HIVDB algorithm version.",
                        "args": [],
                        "type": {
                            "kind": "OBJECT",
                            "name": "DrugResistanceAlgorithm",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "currentProgramVersion",
                        "description": "Current Sierra program version.",
                        "args": [],
                        "type": {
                            "kind": "OBJECT",
                            "name": "SierraVersion",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "sequenceAnalysis",
                        "description": "Analyze sequences and output results.",
                        "args": [
                            {
                                "name": "sequences",
                                "description": "Sequences to be analyzed.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "INPUT_OBJECT",
                                        "name": "UnalignedSequenceInput",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            }
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "SequenceAnalysis",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "sequenceReadsAnalysis",
                        "description": "Analyze sequence reads and output results.",
                        "args": [
                            {
                                "name": "sequenceReads",
                                "description": "Sequence reads to be analyzed.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "INPUT_OBJECT",
                                        "name": "SequenceReadsInput",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            }
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "SequenceReadsAnalysis",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "mutationsAnalysis",
                        "description": "Analyze a list of mutations belong to a single sequence and output result.",
                        "args": [
                            {
                                "name": "mutations",
                                "description": "Mutations to be analyzed.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "SCALAR",
                                        "name": "String",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            }
                        ],
                        "type": {
                            "kind": "OBJECT",
                            "name": "MutationsAnalysis",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "patternAnalysis",
                        "description": "Analyze mutation patterns (multiple lists of mutations) and output result.\nThe output list will be in the same order as the input list.",
                        "args": [
                            {
                                "name": "patterns",
                                "description": "Lists of mutations to be analyzed.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "LIST",
                                        "name": None,
                                        "ofType": {
                                            "kind": "SCALAR",
                                            "name": "String",
                                            "ofType": None,
                                        },
                                    },
                                },
                                "defaultValue": None,
                            },
                            {
                                "name": "patternNames",
                                "description": "Optional name for each mutation set. Length must be same to patterns.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "SCALAR",
                                        "name": "String",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            },
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "MutationsAnalysis",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "genes",
                        "description": "List all supported genes.",
                        "args": [
                            {
                                "name": "names",
                                "description": "Genes to be requested.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "ENUM",
                                        "name": "EnumGene",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            }
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "Gene",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "mutationPrevalenceSubtypes",
                        "description": "List all supported HIV-1 subtypes by mutation prevalence.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "MutationPrevalenceSubtype",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "viewer",
                        "description": "Same as Root. Keep for compatible reason.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "Viewer", "ofType": None},
                        "isDeprecated": True,
                        "deprecationReason": "Use `Root` directly.",
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "ENUM",
                "name": "SIR",
                "description": "Three steps of resistance level.",
                "fields": None,
                "inputFields": None,
                "interfaces": None,
                "enumValues": [
                    {
                        "name": "S",
                        "description": "Susceptible level.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "I",
                        "description": "Intermediate level.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "R",
                        "description": "Resistance level.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "SequenceAnalysis",
                "description": None,
                "fields": [
                    {
                        "name": "inputSequence",
                        "description": "The original unaligned sequence.",
                        "args": [],
                        "type": {
                            "kind": "OBJECT",
                            "name": "UnalignedSequenceOutput",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "strain",
                        "description": "HIV strain of this sequence.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "Strain", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "isReverseComplement",
                        "description": "True if the alignment result was based on the reverse complement of input sequence.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "availableGenes",
                        "description": "Available genes found in the sequence.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "Gene",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "validationResults",
                        "description": "Validation results for this sequence.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "ValidationResult",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "alignedGeneSequences",
                        "description": "List of aligned sequence distinguished by genes.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "AlignedGeneSequence",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "subtypesV2",
                        "description": "List of HIV1 groups or subtypes, or HIV species. Sorted by the similarity from most to least.",
                        "args": [
                            {
                                "name": "first",
                                "description": "Fetch only the first nth closest subtypes. Default to 2.",
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "Int",
                                    "ofType": None,
                                },
                                "defaultValue": "2",
                            }
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "HIVBoundSubtype",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "bestMatchingSubtype",
                        "description": "The best matching subtype.",
                        "args": [],
                        "type": {
                            "kind": "OBJECT",
                            "name": "HIVBoundSubtype",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "genotypes",
                        "description": "List of HIV1 groups or subtypes, or HIV species. Sorted by the similarity from most to least.",
                        "args": [
                            {
                                "name": "first",
                                "description": "Fetch only the first nth closest genotypes. Default to 2.",
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "Int",
                                    "ofType": None,
                                },
                                "defaultValue": "2",
                            }
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "HIVBoundSubtype",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": True,
                        "deprecationReason": "Use field `subtypesV2` instead.",
                    },
                    {
                        "name": "bestMatchingGenotype",
                        "description": "The best matching genotype.",
                        "args": [],
                        "type": {
                            "kind": "OBJECT",
                            "name": "HIVBoundSubtype",
                            "ofType": None,
                        },
                        "isDeprecated": True,
                        "deprecationReason": "Use field `bestMatchingSubtype` instead.",
                    },
                    {
                        "name": "mixturePcnt",
                        "description": "Mixture pecentage of the sequence. Notes only RYMWKS are counted.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "mutations",
                        "description": "All mutations found in the aligned sequence.",
                        "args": [
                            {
                                "name": "filterOptions",
                                "description": "List of filter options for the mutation set.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "ENUM",
                                        "name": "MutationSetFilterOption",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            },
                            {
                                "name": "customList",
                                "description": "List of possible mutation strings that should be included in this query if presented. Gene need to be prepend if the gene is not able to be inferred from the context.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "SCALAR",
                                        "name": "String",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            },
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "Mutation",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "frameShifts",
                        "description": "All frame shifts found in the aligned sequence.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "FrameShift",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "drugResistance",
                        "description": "List of drug resistance results by genes.",
                        "args": [
                            {
                                "name": "algorithm",
                                "description": "One of the built-in ASI algorithms.",
                                "type": {
                                    "kind": "ENUM",
                                    "name": "ASIAlgorithm",
                                    "ofType": None,
                                },
                                "defaultValue": "HIVDB_9_1",
                            }
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "DrugResistance",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "mutationPrevalences",
                        "description": "List of mutation prevalence results.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "BoundMutationPrevalence",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "subtypes",
                        "description": "List of HIV1 groups or subtypes, or HIV species. Sorted by the similarity from most to least.",
                        "args": [
                            {
                                "name": "first",
                                "description": "Fetch only the first nth closest subtypes. Default to 2.",
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "Int",
                                    "ofType": None,
                                },
                                "defaultValue": "2",
                            }
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "BoundSubtype",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": True,
                        "deprecationReason": "Use field `subtypesV2` instead.",
                    },
                    {
                        "name": "subtypeText",
                        "description": "Formatted text for best matching subtype.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": True,
                        "deprecationReason": "Use field `bestMatchingSubtype { display }` instead.",
                    },
                    {
                        "name": "algorithmComparison",
                        "description": "List of ASI comparison results.",
                        "args": [
                            {
                                "name": "algorithms",
                                "description": "One or more of the built-in ASI algorithms.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "ENUM",
                                        "name": "ASIAlgorithm",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            },
                            {
                                "name": "customAlgorithms",
                                "description": "One or more of custom ASI algorithms.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "INPUT_OBJECT",
                                        "name": "CustomASIAlgorithm",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            },
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "AlgorithmComparison",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "SequenceReadsAnalysis",
                "description": None,
                "fields": [
                    {
                        "name": "name",
                        "description": "Name of this sequence.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "strain",
                        "description": "Strain of this sequence.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "Strain", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "cutoffSuggestionLooserLimit",
                        "description": "Algorithm suggested minimal prevalence cutoff. This cutoff is looser and may include more problematic mutations.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "cutoffSuggestionStricterLimit",
                        "description": "Algorithm suggested minimal prevalence cutoff. This cutoff is stricter and include less problematic mutations.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "validationResults",
                        "description": "Validation results for the sequence reads.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "ValidationResult",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "minPrevalence",
                        "description": "The minimal prevalence cutoff applied on this sequence.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "minCodonCount",
                        "description": "The minimal codon count cutoff applied on this sequence.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Long", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "minReadDepth",
                        "description": "The minimal read depth for each position of the sequence reads.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Long", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "availableGenes",
                        "description": "Available genes found in the sequence reads.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "Gene",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "allGeneSequenceReads",
                        "description": "List of sequence reads distinguished by genes.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "GeneSequenceReads",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "subtypes",
                        "description": "List of HIV1 groups or subtypes, or HIV species. Sorted by the similarity from most to least.",
                        "args": [
                            {
                                "name": "first",
                                "description": "Fetch only the first nth closest subtypes. Default to 2.",
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "Int",
                                    "ofType": None,
                                },
                                "defaultValue": "2",
                            }
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "HIVBoundSubtype",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "bestMatchingSubtype",
                        "description": "The best matching subtype.",
                        "args": [],
                        "type": {
                            "kind": "OBJECT",
                            "name": "HIVBoundSubtype",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "mixturePcnt",
                        "description": "Mixture pecentage of the consensus. Notes only RYMWKS are counted.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "mutations",
                        "description": "All mutations found in the sequence reads.",
                        "args": [
                            {
                                "name": "filterOptions",
                                "description": "List of filter options for the mutation set.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "ENUM",
                                        "name": "MutationSetFilterOption",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            },
                            {
                                "name": "customList",
                                "description": "List of possible mutation strings that should be included in this query if presented. Gene need to be prepend if the gene is not able to be inferred from the context.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "SCALAR",
                                        "name": "String",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            },
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "Mutation",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "drugResistance",
                        "description": "List of drug resistance results by genes.",
                        "args": [
                            {
                                "name": "algorithm",
                                "description": "One of the built-in ASI algorithms.",
                                "type": {
                                    "kind": "ENUM",
                                    "name": "ASIAlgorithm",
                                    "ofType": None,
                                },
                                "defaultValue": "HIVDB_9_1",
                            }
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "DrugResistance",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "histogram",
                        "description": "Histogram data for sequence reads.",
                        "args": [
                            {
                                "name": "pcntLowerLimit",
                                "description": "Percent lower limit of filtering codon reads (range: 0-100).",
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "Float",
                                    "ofType": None,
                                },
                                "defaultValue": "0.001",
                            },
                            {
                                "name": "pcntUpperLimit",
                                "description": "Percent lower limit of filtering codon reads (range: 0-100).",
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "Float",
                                    "ofType": None,
                                },
                                "defaultValue": "0.2",
                            },
                            {
                                "name": "numBins",
                                "description": "Number of bins wanted in this histogram. (either `numBins` or `binTicks` must be provided)",
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "Int",
                                    "ofType": None,
                                },
                                "defaultValue": None,
                            },
                            {
                                "name": "binTicks",
                                "description": "Bin ticks wanted in this histogram. (either `numBins` or `binTicks` must be provided)",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "SCALAR",
                                        "name": "Float",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": "[0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2]",
                            },
                            {
                                "name": "cumulative",
                                "description": "Generate cumulative histogram data instead.",
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "Boolean",
                                    "ofType": None,
                                },
                                "defaultValue": "true",
                            },
                            {
                                "name": "aggregatesBy",
                                "description": "Aggregation option.",
                                "type": {
                                    "kind": "ENUM",
                                    "name": "EnumSequenceReadsHistogramAggregatesOption",
                                    "ofType": None,
                                },
                                "defaultValue": "Position",
                            },
                        ],
                        "type": {
                            "kind": "OBJECT",
                            "name": "SequenceReadsHistogram",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "histogramByCodonCount",
                        "description": "Histogram data for sequence reads.",
                        "args": [
                            {
                                "name": "codonCountCutoffs",
                                "description": "Codon count cutoffs wanted in this histogram.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "SCALAR",
                                        "name": "Long",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": "[16, 32, 64, 128, 256, 512, 1024, 2048]",
                            },
                            {
                                "name": "aggregatesBy",
                                "description": "Aggregation option.",
                                "type": {
                                    "kind": "ENUM",
                                    "name": "EnumSequenceReadsHistogramAggregatesOption",
                                    "ofType": None,
                                },
                                "defaultValue": "Position",
                            },
                        ],
                        "type": {
                            "kind": "OBJECT",
                            "name": "SequenceReadsHistogramByCodonCount",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "readDepthStats",
                        "description": "Descriptive statistics of read depth for all positions.",
                        "args": [],
                        "type": {
                            "kind": "OBJECT",
                            "name": "DescriptiveStatistics",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "readDepthStatsDRP",
                        "description": "Descriptive statistics of read depth for drug resistance positions.",
                        "args": [],
                        "type": {
                            "kind": "OBJECT",
                            "name": "DescriptiveStatistics",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "codonReadsCoverage",
                        "description": "Codon reads coverage.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "OneCodonReadsCoverage",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "internalJsonCodonReadsCoverage",
                        "description": "Position codon reads in this gene sequence (json formated).",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "SequenceReadsHistogram",
                "description": "Histogram data for sequence reads.",
                "fields": [
                    {
                        "name": "usualSites",
                        "description": "Usual sites histogram data.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "SequenceReadsHistogramBin",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "drmSites",
                        "description": "Sites with drug resistance mutations histogram data.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "SequenceReadsHistogramBin",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "unusualSites",
                        "description": "Unusual sites histogram data.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "SequenceReadsHistogramBin",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "unusualApobecSites",
                        "description": "Unusual & APOBEC sites histogram data.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "SequenceReadsHistogramBin",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "unusualNonApobecSites",
                        "description": "Unusual & Non-APOBEC sites histogram data.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "SequenceReadsHistogramBin",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "apobecSites",
                        "description": "APOBEC sites histogram data.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "SequenceReadsHistogramBin",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "apobecDrmSites",
                        "description": "APOBEC DRM sites histogram data.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "SequenceReadsHistogramBin",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "stopCodonSites",
                        "description": "Stop codon sites histogram data.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "SequenceReadsHistogramBin",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "numPositions",
                        "description": "Total number of positions.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "SequenceReadsHistogramBin",
                "description": "A single bin data of the histogram.",
                "fields": [
                    {
                        "name": "percentStart",
                        "description": "Percent start (X axis) of this bin.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "percentStop",
                        "description": "Percent stop (X axis) of this bin.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "count",
                        "description": "Total count (Y axis) of this bin.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "SequenceReadsHistogramByCodonCount",
                "description": "Histogram data for sequence reads.",
                "fields": [
                    {
                        "name": "usualSites",
                        "description": "Usual sites histogram data.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "SequenceReadsHistogramByCodonCountBin",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "drmSites",
                        "description": "Sites with drug resistance mutations histogram data.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "SequenceReadsHistogramByCodonCountBin",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "unusualSites",
                        "description": "Unusual sites histogram data.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "SequenceReadsHistogramByCodonCountBin",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "unusualApobecSites",
                        "description": "Unusual & APOBEC sites histogram data.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "SequenceReadsHistogramByCodonCountBin",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "unusualNonApobecSites",
                        "description": "Unusual & Non-APOBEC sites histogram data.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "SequenceReadsHistogramByCodonCountBin",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "apobecSites",
                        "description": "APOBEC sites histogram data.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "SequenceReadsHistogramByCodonCountBin",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "apobecDrmSites",
                        "description": "APOBEC DRM sites histogram data.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "SequenceReadsHistogramByCodonCountBin",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "stopCodonSites",
                        "description": "Stop codon sites histogram data.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "SequenceReadsHistogramByCodonCountBin",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "numPositions",
                        "description": "Total number of positions.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "SequenceReadsHistogramByCodonCountBin",
                "description": "A single bin data of the histogram.",
                "fields": [
                    {
                        "name": "cutoff",
                        "description": "Codon count cutoff (minimal) of this bin.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Long", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "count",
                        "description": "Total count (Y axis) of this bin.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Int", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "INPUT_OBJECT",
                "name": "SequenceReadsInput",
                "description": None,
                "fields": None,
                "inputFields": [
                    {
                        "name": "name",
                        "description": "An identifiable name for identifying the result from the returning list.",
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "defaultValue": None,
                    },
                    {
                        "name": "strain",
                        "description": "Strain of this sequence, choice: HIV1, HIV2A, HIV2B.",
                        "type": {"kind": "ENUM", "name": "StrainEnum", "ofType": None},
                        "defaultValue": None,
                    },
                    {
                        "name": "allReads",
                        "description": "List of all reads belong to this sequence.",
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "INPUT_OBJECT",
                                "name": "PositionCodonReadsInput",
                                "ofType": None,
                            },
                        },
                        "defaultValue": None,
                    },
                    {
                        "name": "minPrevalence",
                        "description": "The minimal prevalence cutoff to apply on each **codon**. Default to zero if this field was left empty or had a negative number specified.",
                        "type": {"kind": "SCALAR", "name": "Float", "ofType": None},
                        "defaultValue": "0.0",
                    },
                    {
                        "name": "minCodonCount",
                        "description": "The minimal read count cutoff to apply on each **codon**. Default to zero if this field was left empty or had a negative number specified.",
                        "type": {"kind": "SCALAR", "name": "Long", "ofType": None},
                        "defaultValue": "0",
                    },
                    {
                        "name": "minReadDepth",
                        "description": "The minal read depth for each **position**. Default to 1000 if this field was left empty or had a negative numberspecified.",
                        "type": {"kind": "SCALAR", "name": "Long", "ofType": None},
                        "defaultValue": "1000",
                    },
                ],
                "interfaces": None,
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "SierraVersion",
                "description": "Version of Sierra.",
                "fields": [
                    {
                        "name": "text",
                        "description": "Version text.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "publishDate",
                        "description": "Publish date of this version.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "Strain",
                "description": "HIV strain.",
                "fields": [
                    {
                        "name": "name",
                        "description": "Short name of this strain.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "display",
                        "description": "Full name of this strain.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "ENUM",
                "name": "StrainEnum",
                "description": None,
                "fields": None,
                "inputFields": None,
                "interfaces": None,
                "enumValues": [
                    {
                        "name": "HIV1",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    }
                ],
                "possibleTypes": None,
            },
            {
                "kind": "SCALAR",
                "name": "String",
                "description": "Built-in String",
                "fields": None,
                "inputFields": None,
                "interfaces": None,
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "ENUM",
                "name": "Subtype",
                "description": "SubtypeName",
                "fields": None,
                "inputFields": None,
                "interfaces": None,
                "enumValues": [
                    {
                        "name": "A",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "A2",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "B",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "C",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "D",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "F",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "F2",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "G",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "H",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "J",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "K",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "N",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "O",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "P",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "U",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X01",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X02",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X03",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X04",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X05",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X06",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X07",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X08",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X09",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X10",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X11",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X12",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X13",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X14",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X15",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X16",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X17",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X18",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X19",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X20",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X21",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X22",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X23",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X24",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X25",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X26",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X27",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X28",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X29",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X30",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X31",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X32",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X33",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X34",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X35",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X36",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X37",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X38",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X39",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X40",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X41",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X42",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X43",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X44",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X45",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X46",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X47",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X48",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X49",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X50",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X51",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X52",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X53",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X54",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X55",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X56",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X57",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X58",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X59",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X60",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X61",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X62",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X63",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X64",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X65",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X67",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X68",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X69",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X70",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X71",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X72",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X73",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X74",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X77",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X78",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X82",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X83",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X85",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X86",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "X87",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "possibleTypes": None,
            },
            {
                "kind": "INPUT_OBJECT",
                "name": "UnalignedSequenceInput",
                "description": "Unaligned sequence Input Type.",
                "fields": None,
                "inputFields": [
                    {
                        "name": "header",
                        "description": "Name of the sequence.",
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "defaultValue": None,
                    },
                    {
                        "name": "sequence",
                        "description": "The sequence itself as a string.",
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "defaultValue": None,
                    },
                ],
                "interfaces": None,
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "UnalignedSequenceOutput",
                "description": "Unaligned sequence.",
                "fields": [
                    {
                        "name": "header",
                        "description": "Name of the sequence.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "sequence",
                        "description": "The sequence itself as a string.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "MD5",
                        "description": "Hex MD5 value of the sequence.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "SHA512",
                        "description": "Hex SHA512 value of the sequence.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "ENUM",
                "name": "ValidationLevel",
                "description": "Level for validation result.",
                "fields": None,
                "inputFields": None,
                "interfaces": None,
                "enumValues": [
                    {
                        "name": "OK",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "NOTE",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "WARNING",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "SEVERE_WARNING",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "CRITICAL",
                        "description": None,
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "ValidationResult",
                "description": "Validation result for sequence or mutation list.",
                "fields": [
                    {
                        "name": "level",
                        "description": "The level of this validation result.",
                        "args": [],
                        "type": {
                            "kind": "ENUM",
                            "name": "ValidationLevel",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "message",
                        "description": "Description of this validation result.",
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "Viewer",
                "description": None,
                "fields": [
                    {
                        "name": "currentVersion",
                        "description": "Current HIVDB algorithm version.",
                        "args": [],
                        "type": {
                            "kind": "OBJECT",
                            "name": "DrugResistanceAlgorithm",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "currentProgramVersion",
                        "description": "Current Sierra program version.",
                        "args": [],
                        "type": {
                            "kind": "OBJECT",
                            "name": "SierraVersion",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "sequenceAnalysis",
                        "description": "Analyze sequences and output results.",
                        "args": [
                            {
                                "name": "sequences",
                                "description": "Sequences to be analyzed.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "INPUT_OBJECT",
                                        "name": "UnalignedSequenceInput",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            }
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "SequenceAnalysis",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "sequenceReadsAnalysis",
                        "description": "Analyze sequence reads and output results.",
                        "args": [
                            {
                                "name": "sequenceReads",
                                "description": "Sequence reads to be analyzed.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "INPUT_OBJECT",
                                        "name": "SequenceReadsInput",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            }
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "SequenceReadsAnalysis",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "mutationsAnalysis",
                        "description": "Analyze a list of mutations belong to a single sequence and output result.",
                        "args": [
                            {
                                "name": "mutations",
                                "description": "Mutations to be analyzed.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "SCALAR",
                                        "name": "String",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            }
                        ],
                        "type": {
                            "kind": "OBJECT",
                            "name": "MutationsAnalysis",
                            "ofType": None,
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "patternAnalysis",
                        "description": "Analyze mutation patterns (multiple lists of mutations) and output result.\nThe output list will be in the same order as the input list.",
                        "args": [
                            {
                                "name": "patterns",
                                "description": "Lists of mutations to be analyzed.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "LIST",
                                        "name": None,
                                        "ofType": {
                                            "kind": "SCALAR",
                                            "name": "String",
                                            "ofType": None,
                                        },
                                    },
                                },
                                "defaultValue": None,
                            },
                            {
                                "name": "patternNames",
                                "description": "Optional name for each mutation set. Length must be same to patterns.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "SCALAR",
                                        "name": "String",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            },
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "MutationsAnalysis",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "genes",
                        "description": "List all supported genes.",
                        "args": [
                            {
                                "name": "names",
                                "description": "Genes to be requested.",
                                "type": {
                                    "kind": "LIST",
                                    "name": None,
                                    "ofType": {
                                        "kind": "ENUM",
                                        "name": "EnumGene",
                                        "ofType": None,
                                    },
                                },
                                "defaultValue": None,
                            }
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "Gene",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "mutationPrevalenceSubtypes",
                        "description": "List all supported HIV-1 subtypes by mutation prevalence.",
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "MutationPrevalenceSubtype",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "__Directive",
                "description": None,
                "fields": [
                    {
                        "name": "name",
                        "description": None,
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "description",
                        "description": None,
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "locations",
                        "description": None,
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "NON_NULL",
                                "name": None,
                                "ofType": {
                                    "kind": "ENUM",
                                    "name": "__DirectiveLocation",
                                    "ofType": None,
                                },
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "args",
                        "description": None,
                        "args": [],
                        "type": {
                            "kind": "NON_NULL",
                            "name": None,
                            "ofType": {
                                "kind": "LIST",
                                "name": None,
                                "ofType": {
                                    "kind": "NON_NULL",
                                    "name": None,
                                    "ofType": {
                                        "kind": "OBJECT",
                                        "name": "__InputValue",
                                        "ofType": None,
                                    },
                                },
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "onOperation",
                        "description": None,
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": True,
                        "deprecationReason": "Use `locations`.",
                    },
                    {
                        "name": "onFragment",
                        "description": None,
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": True,
                        "deprecationReason": "Use `locations`.",
                    },
                    {
                        "name": "onField",
                        "description": None,
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "Boolean", "ofType": None},
                        "isDeprecated": True,
                        "deprecationReason": "Use `locations`.",
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "ENUM",
                "name": "__DirectiveLocation",
                "description": "An enum describing valid locations where a directive can be placed",
                "fields": None,
                "inputFields": None,
                "interfaces": None,
                "enumValues": [
                    {
                        "name": "QUERY",
                        "description": "Indicates the directive is valid on queries.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "MUTATION",
                        "description": "Indicates the directive is valid on mutations.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "FIELD",
                        "description": "Indicates the directive is valid on fields.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "FRAGMENT_DEFINITION",
                        "description": "Indicates the directive is valid on fragment definitions.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "FRAGMENT_SPREAD",
                        "description": "Indicates the directive is valid on fragment spreads.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "INLINE_FRAGMENT",
                        "description": "Indicates the directive is valid on inline fragments.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "SCHEMA",
                        "description": "Indicates the directive is valid on a schema SDL definition.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "SCALAR",
                        "description": "Indicates the directive is valid on a scalar SDL definition.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "OBJECT",
                        "description": "Indicates the directive is valid on an object SDL definition.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "FIELD_DEFINITION",
                        "description": "Indicates the directive is valid on a field SDL definition.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "ARGUMENT_DEFINITION",
                        "description": "Indicates the directive is valid on a field argument SDL definition.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "INTERFACE",
                        "description": "Indicates the directive is valid on an interface SDL definition.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "UNION",
                        "description": "Indicates the directive is valid on an union SDL definition.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "ENUM",
                        "description": "Indicates the directive is valid on an enum SDL definition.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "ENUM_VALUE",
                        "description": "Indicates the directive is valid on an enum value SDL definition.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "INPUT_OBJECT",
                        "description": "Indicates the directive is valid on an input object SDL definition.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "INPUT_FIELD_DEFINITION",
                        "description": "Indicates the directive is valid on an input object field SDL definition.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "__EnumValue",
                "description": None,
                "fields": [
                    {
                        "name": "name",
                        "description": None,
                        "args": [],
                        "type": {
                            "kind": "NON_NULL",
                            "name": None,
                            "ofType": {
                                "kind": "SCALAR",
                                "name": "String",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "description",
                        "description": None,
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "isDeprecated",
                        "description": None,
                        "args": [],
                        "type": {
                            "kind": "NON_NULL",
                            "name": None,
                            "ofType": {
                                "kind": "SCALAR",
                                "name": "Boolean",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "deprecationReason",
                        "description": None,
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "__Field",
                "description": None,
                "fields": [
                    {
                        "name": "name",
                        "description": None,
                        "args": [],
                        "type": {
                            "kind": "NON_NULL",
                            "name": None,
                            "ofType": {
                                "kind": "SCALAR",
                                "name": "String",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "description",
                        "description": None,
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "args",
                        "description": None,
                        "args": [],
                        "type": {
                            "kind": "NON_NULL",
                            "name": None,
                            "ofType": {
                                "kind": "LIST",
                                "name": None,
                                "ofType": {
                                    "kind": "NON_NULL",
                                    "name": None,
                                    "ofType": {
                                        "kind": "OBJECT",
                                        "name": "__InputValue",
                                        "ofType": None,
                                    },
                                },
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "type",
                        "description": None,
                        "args": [],
                        "type": {
                            "kind": "NON_NULL",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "__Type",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "isDeprecated",
                        "description": None,
                        "args": [],
                        "type": {
                            "kind": "NON_NULL",
                            "name": None,
                            "ofType": {
                                "kind": "SCALAR",
                                "name": "Boolean",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "deprecationReason",
                        "description": None,
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "__InputValue",
                "description": None,
                "fields": [
                    {
                        "name": "name",
                        "description": None,
                        "args": [],
                        "type": {
                            "kind": "NON_NULL",
                            "name": None,
                            "ofType": {
                                "kind": "SCALAR",
                                "name": "String",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "description",
                        "description": None,
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "type",
                        "description": None,
                        "args": [],
                        "type": {
                            "kind": "NON_NULL",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "__Type",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "defaultValue",
                        "description": None,
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "__Schema",
                "description": "A GraphQL Introspection defines the capabilities of a GraphQL server. It exposes all available types and directives on the server, the entry points for query, mutation, and subscription operations.",
                "fields": [
                    {
                        "name": "types",
                        "description": "A list of all types supported by this server.",
                        "args": [],
                        "type": {
                            "kind": "NON_NULL",
                            "name": None,
                            "ofType": {
                                "kind": "LIST",
                                "name": None,
                                "ofType": {
                                    "kind": "NON_NULL",
                                    "name": None,
                                    "ofType": {
                                        "kind": "OBJECT",
                                        "name": "__Type",
                                        "ofType": None,
                                    },
                                },
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "queryType",
                        "description": "The type that query operations will be rooted at.",
                        "args": [],
                        "type": {
                            "kind": "NON_NULL",
                            "name": None,
                            "ofType": {
                                "kind": "OBJECT",
                                "name": "__Type",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "mutationType",
                        "description": "If this server supports mutation, the type that mutation operations will be rooted at.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "__Type", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "directives",
                        "description": "'A list of all directives supported by this server.",
                        "args": [],
                        "type": {
                            "kind": "NON_NULL",
                            "name": None,
                            "ofType": {
                                "kind": "LIST",
                                "name": None,
                                "ofType": {
                                    "kind": "NON_NULL",
                                    "name": None,
                                    "ofType": {
                                        "kind": "OBJECT",
                                        "name": "__Directive",
                                        "ofType": None,
                                    },
                                },
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "subscriptionType",
                        "description": "'If this server support subscription, the type that subscription operations will be rooted at.",
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "__Type", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "OBJECT",
                "name": "__Type",
                "description": None,
                "fields": [
                    {
                        "name": "kind",
                        "description": None,
                        "args": [],
                        "type": {
                            "kind": "NON_NULL",
                            "name": None,
                            "ofType": {
                                "kind": "ENUM",
                                "name": "__TypeKind",
                                "ofType": None,
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "name",
                        "description": None,
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "description",
                        "description": None,
                        "args": [],
                        "type": {"kind": "SCALAR", "name": "String", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "fields",
                        "description": None,
                        "args": [
                            {
                                "name": "includeDeprecated",
                                "description": None,
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "Boolean",
                                    "ofType": None,
                                },
                                "defaultValue": "false",
                            }
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "NON_NULL",
                                "name": None,
                                "ofType": {
                                    "kind": "OBJECT",
                                    "name": "__Field",
                                    "ofType": None,
                                },
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "interfaces",
                        "description": None,
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "NON_NULL",
                                "name": None,
                                "ofType": {
                                    "kind": "OBJECT",
                                    "name": "__Type",
                                    "ofType": None,
                                },
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "possibleTypes",
                        "description": None,
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "NON_NULL",
                                "name": None,
                                "ofType": {
                                    "kind": "OBJECT",
                                    "name": "__Type",
                                    "ofType": None,
                                },
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "enumValues",
                        "description": None,
                        "args": [
                            {
                                "name": "includeDeprecated",
                                "description": None,
                                "type": {
                                    "kind": "SCALAR",
                                    "name": "Boolean",
                                    "ofType": None,
                                },
                                "defaultValue": "false",
                            }
                        ],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "NON_NULL",
                                "name": None,
                                "ofType": {
                                    "kind": "OBJECT",
                                    "name": "__EnumValue",
                                    "ofType": None,
                                },
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "inputFields",
                        "description": None,
                        "args": [],
                        "type": {
                            "kind": "LIST",
                            "name": None,
                            "ofType": {
                                "kind": "NON_NULL",
                                "name": None,
                                "ofType": {
                                    "kind": "OBJECT",
                                    "name": "__InputValue",
                                    "ofType": None,
                                },
                            },
                        },
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "ofType",
                        "description": None,
                        "args": [],
                        "type": {"kind": "OBJECT", "name": "__Type", "ofType": None},
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "inputFields": None,
                "interfaces": [],
                "enumValues": None,
                "possibleTypes": None,
            },
            {
                "kind": "ENUM",
                "name": "__TypeKind",
                "description": "An enum describing what kind of type a given __Type is",
                "fields": None,
                "inputFields": None,
                "interfaces": None,
                "enumValues": [
                    {
                        "name": "SCALAR",
                        "description": "Indicates this type is a scalar.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "OBJECT",
                        "description": "Indicates this type is an object. `fields` and `interfaces` are valid fields.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "INTERFACE",
                        "description": "Indicates this type is an interface. `fields` and `possibleTypes` are valid fields.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "UNION",
                        "description": "Indicates this type is a union. `possibleTypes` is a valid field.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "ENUM",
                        "description": "Indicates this type is an enum. `enumValues` is a valid field.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "INPUT_OBJECT",
                        "description": "Indicates this type is an input object. `inputFields` is a valid field.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "LIST",
                        "description": "Indicates this type is a list. `ofType` is a valid field.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                    {
                        "name": "NON_NULL",
                        "description": "Indicates this type is a non-null. `ofType` is a valid field.",
                        "isDeprecated": False,
                        "deprecationReason": None,
                    },
                ],
                "possibleTypes": None,
            },
        ],
        "directives": [
            {
                "name": "include",
                "description": "Directs the executor to include this field or fragment only when the `if` argument is true",
                "locations": ["FIELD", "FRAGMENT_SPREAD", "INLINE_FRAGMENT"],
                "args": [
                    {
                        "name": "if",
                        "description": "Included when true.",
                        "type": {
                            "kind": "NON_NULL",
                            "name": None,
                            "ofType": {
                                "kind": "SCALAR",
                                "name": "Boolean",
                                "ofType": None,
                            },
                        },
                        "defaultValue": None,
                    }
                ],
            },
            {
                "name": "skip",
                "description": "Directs the executor to skip this field or fragment when the `if`'argument is true.",
                "locations": ["FIELD", "FRAGMENT_SPREAD", "INLINE_FRAGMENT"],
                "args": [
                    {
                        "name": "if",
                        "description": "Skipped when true.",
                        "type": {
                            "kind": "NON_NULL",
                            "name": None,
                            "ofType": {
                                "kind": "SCALAR",
                                "name": "Boolean",
                                "ofType": None,
                            },
                        },
                        "defaultValue": None,
                    }
                ],
            },
        ],
    }
