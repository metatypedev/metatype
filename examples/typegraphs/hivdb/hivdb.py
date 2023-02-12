from typegraph import TypeGraph, policies, t
from typegraph.importers.base.importer import Import
from typegraph.importers.graphql import GraphQLImporter
from typegraph.runtimes.graphql import GraphQLRuntime

GraphQLImporter("hivdb", "https://hivdb.stanford.edu/graphql").imp(False)


# Function generated by GraphQLImporter. Do not change.
def import_hivdb():
    hivdb = GraphQLRuntime("https://hivdb.stanford.edu/graphql")

    renames = {
        "AAReads": "_hivdb_1_AAReads",
        "ASIAlgorithm": "_hivdb_2_ASIAlgorithm",
        "AlgorithmComparison": "_hivdb_3_AlgorithmComparison",
        "AlignedGeneSequence": "_hivdb_4_AlignedGeneSequence",
        "BoundMutationComment": "_hivdb_5_BoundMutationComment",
        "BoundMutationPrevalence": "_hivdb_6_BoundMutationPrevalence",
        "BoundSubtype": "_hivdb_7_BoundSubtype",
        "CommentType": "_hivdb_8_CommentType",
        "CommentsByType": "_hivdb_9_CommentsByType",
        "ComparableDrugScore": "_hivdb_10_ComparableDrugScore",
        "CustomASIAlgorithm": "_hivdb_11_CustomASIAlgorithm",
        "CutoffKeyPoint": "_hivdb_12_CutoffKeyPoint",
        "DescriptiveStatistics": "_hivdb_13_DescriptiveStatistics",
        "Drug": "_hivdb_14_Drug",
        "DrugClass": "_hivdb_15_DrugClass",
        "DrugClassEnum": "_hivdb_16_DrugClassEnum",
        "DrugEnum": "_hivdb_17_DrugEnum",
        "DrugPartialScore": "_hivdb_18_DrugPartialScore",
        "DrugResistance": "_hivdb_19_DrugResistance",
        "DrugResistanceAlgorithm": "_hivdb_20_DrugResistanceAlgorithm",
        "DrugScore": "_hivdb_21_DrugScore",
        "EnumGene": "_hivdb_22_EnumGene",
        "EnumSequenceReadsHistogramAggregatesOption": "_hivdb_23_EnumSequenceReadsHistogramAggregatesOption",
        "FrameShift": "_hivdb_24_FrameShift",
        "Gene": "_hivdb_25_Gene",
        "GeneMutations": "_hivdb_26_GeneMutations",
        "GeneSequenceReads": "_hivdb_27_GeneSequenceReads",
        "HIVBoundSubtype": "_hivdb_28_HIVBoundSubtype",
        "HIVClassificationLevel": "_hivdb_29_HIVClassificationLevel",
        "HIVSubtype": "_hivdb_30_HIVSubtype",
        "Mutation": "_hivdb_31_Mutation",
        "MutationPrevalence": "_hivdb_32_MutationPrevalence",
        "MutationPrevalenceByAA": "_hivdb_33_MutationPrevalenceByAA",
        "MutationPrevalenceSubtype": "_hivdb_34_MutationPrevalenceSubtype",
        "MutationPrevalenceSubtypeStat": "_hivdb_35_MutationPrevalenceSubtypeStat",
        "MutationSetFilterOption": "_hivdb_36_MutationSetFilterOption",
        "MutationType": "_hivdb_37_MutationType",
        "MutationsAnalysis": "_hivdb_38_MutationsAnalysis",
        "MutationsByType": "_hivdb_39_MutationsByType",
        "OneCodonReads": "_hivdb_40_OneCodonReads",
        "OneCodonReadsCoverage": "_hivdb_41_OneCodonReadsCoverage",
        "OneCodonReadsInput": "_hivdb_42_OneCodonReadsInput",
        "PositionCodonReads": "_hivdb_43_PositionCodonReads",
        "PositionCodonReadsInput": "_hivdb_44_PositionCodonReadsInput",
        "PrettyPairwise": "_hivdb_45_PrettyPairwise",
        "SIR": "_hivdb_46_SIR",
        "SequenceAnalysis": "_hivdb_47_SequenceAnalysis",
        "SequenceReadsAnalysis": "_hivdb_48_SequenceReadsAnalysis",
        "SequenceReadsHistogram": "_hivdb_49_SequenceReadsHistogram",
        "SequenceReadsHistogramBin": "_hivdb_50_SequenceReadsHistogramBin",
        "SequenceReadsHistogramByCodonReads": "_hivdb_51_SequenceReadsHistogramByCodonReads",
        "SequenceReadsHistogramByCodonReadsBin": "_hivdb_52_SequenceReadsHistogramByCodonReadsBin",
        "SequenceReadsInput": "_hivdb_53_SequenceReadsInput",
        "SierraVersion": "_hivdb_54_SierraVersion",
        "Strain": "_hivdb_55_Strain",
        "StrainEnum": "_hivdb_56_StrainEnum",
        "Subtype": "_hivdb_57_Subtype",
        "UnalignedSequenceInput": "_hivdb_58_UnalignedSequenceInput",
        "UnalignedSequenceOutput": "_hivdb_59_UnalignedSequenceOutput",
        "UnsequencedRegion": "_hivdb_60_UnsequencedRegion",
        "UnsequencedRegions": "_hivdb_61_UnsequencedRegions",
        "UntranslatedRegionInput": "_hivdb_62_UntranslatedRegionInput",
        "ValidationLevel": "_hivdb_63_ValidationLevel",
        "ValidationResult": "_hivdb_64_ValidationResult",
        "Viewer": "_hivdb_65_Viewer",
    }

    types = {}
    types["AAReads"] = t.struct(
        {
            "aminoAcid": t.string().optional(),
            "percent": t.number().optional(),
            "numReads": t.integer().optional(),
        }
    ).named(renames["AAReads"])
    types["ASIAlgorithm"] = t.string().named(renames["ASIAlgorithm"])
    types["AlgorithmComparison"] = t.struct(
        {
            "drugClass": t.proxy(renames["DrugClass"]).optional(),
            "drugScores": t.array(
                t.proxy(renames["ComparableDrugScore"]).optional()
            ).optional(),
        }
    ).named(renames["AlgorithmComparison"])
    types["AlignedGeneSequence"] = t.struct(
        {
            "gene": t.proxy(renames["Gene"]).optional(),
            "firstAA": t.integer().optional(),
            "lastAA": t.integer().optional(),
            "firstNA": t.integer().optional(),
            "lastNA": t.integer().optional(),
            "matchPcnt": t.number().optional(),
            "size": t.integer().optional(),
            "prettyPairwise": t.proxy(renames["PrettyPairwise"]).optional(),
            "alignedNAs": t.string().optional(),
            "alignedAAs": t.string().optional(),
            "adjustedAlignedNAs": t.string().optional(),
            "adjustedAlignedAAs": t.string().optional(),
            "mutations": t.array(t.proxy(renames["Mutation"]).optional()).optional(),
            "mutationCount": t.integer().optional(),
            "unusualMutationCount": t.integer().optional(),
            "insertionCount": t.integer().optional(),
            "deletionCount": t.integer().optional(),
            "stopCodonCount": t.integer().optional(),
            "ambiguousMutationCount": t.integer().optional(),
            "apobecMutationCount": t.integer().optional(),
            "apobecDRMCount": t.integer().optional(),
            "frameShifts": t.array(
                t.proxy(renames["FrameShift"]).optional()
            ).optional(),
            "unsequencedRegions": t.proxy(renames["UnsequencedRegions"]).optional(),
        }
    ).named(renames["AlignedGeneSequence"])
    types["BoundMutationComment"] = t.struct(
        {
            "name": t.string().optional(),
            "gene": t.proxy(renames["Gene"]).optional(),
            "drugClass": t.proxy(renames["DrugClass"]).optional(),
            "type": t.proxy(renames["CommentType"]).optional(),
            "text": t.string().optional(),
            "triggeredAAs": t.string().optional(),
            "boundMutation": t.proxy(renames["Mutation"]).optional(),
            "highlightText": t.array(t.string().optional()).optional(),
        }
    ).named(renames["BoundMutationComment"])
    types["BoundMutationPrevalence"] = t.struct(
        {
            "boundMutation": t.proxy(renames["Mutation"]).optional(),
            "matched": t.array(
                t.proxy(renames["MutationPrevalenceByAA"]).optional()
            ).optional(),
            "others": t.array(
                t.proxy(renames["MutationPrevalenceByAA"]).optional()
            ).optional(),
        }
    ).named(renames["BoundMutationPrevalence"])
    types["BoundSubtype"] = t.struct(
        {
            "name": t.proxy(renames["Subtype"]).optional(),
            "distancePcnt": t.number().optional(),
            "display": t.string().optional(),
        }
    ).named(renames["BoundSubtype"])
    types["CommentType"] = t.string().named(renames["CommentType"])
    types["CommentsByType"] = t.struct(
        {
            "mutationType": t.proxy(renames["CommentType"]).optional(),
            "commentType": t.proxy(renames["CommentType"]).optional(),
            "comments": t.array(
                t.proxy(renames["BoundMutationComment"]).optional()
            ).optional(),
        }
    ).named(renames["CommentsByType"])
    types["ComparableDrugScore"] = t.struct(
        {
            "drug": t.proxy(renames["Drug"]).optional(),
            "algorithm": t.string().optional(),
            "SIR": t.proxy(renames["SIR"]).optional(),
            "interpretation": t.string().optional(),
            "explanation": t.string().optional(),
        }
    ).named(renames["ComparableDrugScore"])
    types["CustomASIAlgorithm"] = t.struct(
        {"name": t.string().optional(), "xml": t.string().optional()}
    ).named(renames["CustomASIAlgorithm"])
    types["CutoffKeyPoint"] = t.struct(
        {
            "mixtureRate": t.number().optional(),
            "minPrevalence": t.number().optional(),
            "isAboveMixtureRateThreshold": t.boolean().optional(),
            "isBelowMinPrevalenceThreshold": t.boolean().optional(),
        }
    ).named(renames["CutoffKeyPoint"])
    types["DescriptiveStatistics"] = t.struct(
        {
            "mean": t.number().optional(),
            "standardDeviation": t.number().optional(),
            "min": t.number().optional(),
            "max": t.number().optional(),
            "n": t.number().optional(),
            "sum": t.number().optional(),
            "values": t.array(t.number().optional()).optional(),
            "percentile": t.number().optional(),
        }
    ).named(renames["DescriptiveStatistics"])
    types["Drug"] = t.struct(
        {
            "name": t.proxy(renames["DrugEnum"]).optional(),
            "displayAbbr": t.string().optional(),
            "fullName": t.string().optional(),
            "drugClass": t.proxy(renames["DrugClass"]).optional(),
        }
    ).named(renames["Drug"])
    types["DrugClass"] = t.struct(
        {
            "name": t.proxy(renames["DrugClassEnum"]).optional(),
            "fullName": t.string().optional(),
            "drugs": t.array(t.proxy(renames["Drug"]).optional()).optional(),
            "gene": t.proxy(renames["Gene"]).optional(),
            "drugResistMutations": t.array(
                t.proxy(renames["Mutation"]).optional()
            ).optional(),
            "surveilDrugResistMutations": t.array(
                t.proxy(renames["Mutation"]).optional()
            ).optional(),
            "rxSelectedMutations": t.array(
                t.proxy(renames["Mutation"]).optional()
            ).optional(),
            "mutationTypes": t.array(
                t.proxy(renames["MutationType"]).optional()
            ).optional(),
            "hasDrugResistMutations": t.boolean().optional(),
            "hasSurveilDrugResistMutations": t.boolean().optional(),
            "hasRxSelectedMutations": t.boolean().optional(),
        }
    ).named(renames["DrugClass"])
    types["DrugClassEnum"] = t.string().named(renames["DrugClassEnum"])
    types["DrugEnum"] = t.string().named(renames["DrugEnum"])
    types["DrugPartialScore"] = t.struct(
        {
            "mutations": t.array(t.proxy(renames["Mutation"]).optional()).optional(),
            "score": t.number().optional(),
        }
    ).named(renames["DrugPartialScore"])
    types["DrugResistance"] = t.struct(
        {
            "version": t.proxy(renames["DrugResistanceAlgorithm"]).optional(),
            "algorithm": t.proxy(renames["DrugResistanceAlgorithm"]).optional(),
            "gene": t.proxy(renames["Gene"]).optional(),
            "drugScores": t.array(t.proxy(renames["DrugScore"]).optional()).optional(),
            "mutationsByTypes": t.array(
                t.proxy(renames["MutationsByType"]).optional()
            ).optional(),
            "commentsByTypes": t.array(
                t.proxy(renames["CommentsByType"]).optional()
            ).optional(),
        }
    ).named(renames["DrugResistance"])
    types["DrugResistanceAlgorithm"] = t.struct(
        {
            "text": t.string().optional(),
            "display": t.string().optional(),
            "family": t.string().optional(),
            "version": t.string().optional(),
            "strain": t.proxy(renames["Strain"]).optional(),
            "publishDate": t.string().optional(),
        }
    ).named(renames["DrugResistanceAlgorithm"])
    types["DrugScore"] = t.struct(
        {
            "drugClass": t.proxy(renames["DrugClass"]).optional(),
            "drug": t.proxy(renames["Drug"]).optional(),
            "SIR": t.proxy(renames["SIR"]).optional(),
            "score": t.number().optional(),
            "level": t.integer().optional(),
            "text": t.string().optional(),
            "partialScores": t.array(
                t.proxy(renames["DrugPartialScore"]).optional()
            ).optional(),
        }
    ).named(renames["DrugScore"])
    types["EnumGene"] = t.string().named(renames["EnumGene"])
    types["EnumSequenceReadsHistogramAggregatesOption"] = t.string().named(
        renames["EnumSequenceReadsHistogramAggregatesOption"]
    )
    types["FrameShift"] = t.struct(
        {
            "gene": t.proxy(renames["Gene"]).optional(),
            "position": t.integer().optional(),
            "isInsertion": t.boolean().optional(),
            "isDeletion": t.boolean().optional(),
            "size": t.integer().optional(),
            "NAs": t.string().optional(),
            "text": t.string().optional(),
        }
    ).named(renames["FrameShift"])
    types["Gene"] = t.struct(
        {
            "nameWithStrain": t.string().optional(),
            "name": t.proxy(renames["EnumGene"]).optional(),
            "strain": t.proxy(renames["Strain"]).optional(),
            "refSequence": t.string().optional(),
            "reference": t.string().optional(),
            "consensus": t.string().optional(),
            "length": t.integer().optional(),
            "AASize": t.integer().optional(),
            "NASize": t.integer().optional(),
            "drugClasses": t.array(t.proxy(renames["DrugClass"]).optional()).optional(),
            "mutationTypes": t.array(
                t.proxy(renames["MutationType"]).optional()
            ).optional(),
        }
    ).named(renames["Gene"])
    types["GeneMutations"] = t.struct(
        {
            "gene": t.proxy(renames["Gene"]).optional(),
            "mutations": t.array(t.proxy(renames["Mutation"]).optional()).optional(),
        }
    ).named(renames["GeneMutations"])
    types["GeneSequenceReads"] = t.struct(
        {
            "gene": t.proxy(renames["Gene"]).optional(),
            "firstAA": t.integer().optional(),
            "lastAA": t.integer().optional(),
            "allPositionCodonReads": t.array(
                t.proxy(renames["PositionCodonReads"]).optional()
            ).optional(),
            "internalJsonAllPositionCodonReads": t.string().optional(),
            "size": t.integer().optional(),
            "numPositions": t.integer().optional(),
            "readDepthStats": t.proxy(renames["DescriptiveStatistics"]).optional(),
            "alignedNAs": t.string().optional(),
            "alignedAAs": t.string().optional(),
            "mutations": t.array(t.proxy(renames["Mutation"]).optional()).optional(),
            "mutationCount": t.integer().optional(),
            "unusualMutationCount": t.integer().optional(),
            "histogram": t.proxy(renames["SequenceReadsHistogram"]).optional(),
            "unsequencedRegions": t.proxy(renames["UnsequencedRegions"]).optional(),
        }
    ).named(renames["GeneSequenceReads"])
    types["HIVBoundSubtype"] = t.struct(
        {
            "display": t.string().optional(),
            "displayWithoutDistance": t.string().optional(),
            "subtype": t.proxy(renames["HIVSubtype"]).optional(),
            "genotype": t.proxy(renames["HIVSubtype"]).optional(),
            "displaySubtypes": t.array(
                t.proxy(renames["HIVSubtype"]).optional()
            ).optional(),
            "displayGenotypes": t.array(
                t.proxy(renames["HIVSubtype"]).optional()
            ).optional(),
            "firstNA": t.integer().optional(),
            "lastNA": t.integer().optional(),
            "distance": t.number().optional(),
            "distancePcnt": t.string().optional(),
            "referenceAccession": t.string().optional(),
            "referenceCountry": t.string().optional(),
            "referenceYear": t.integer().optional(),
            "discordanceList": t.array(t.integer().optional()).optional(),
        }
    ).named(renames["HIVBoundSubtype"])
    types["HIVClassificationLevel"] = t.string().named(
        renames["HIVClassificationLevel"]
    )
    types["HIVSubtype"] = t.struct(
        {
            "indexName": t.string().optional(),
            "displayName": t.string().optional(),
            "classificationLevel": t.proxy(
                renames["HIVClassificationLevel"]
            ).optional(),
        }
    ).named(renames["HIVSubtype"])
    types["Mutation"] = t.struct(
        {
            "gene": t.proxy(renames["Gene"]).optional(),
            "reference": t.string().optional(),
            "consensus": t.string().optional(),
            "position": t.integer().optional(),
            "displayAAs": t.string().optional(),
            "AAs": t.string().optional(),
            "unusualAAs": t.string().optional(),
            "displayAAChars": t.array(t.string().optional()).optional(),
            "AAChars": t.array(t.string().optional()).optional(),
            "triplet": t.string().optional(),
            "insertedNAs": t.string().optional(),
            "isInsertion": t.boolean().optional(),
            "isDeletion": t.boolean().optional(),
            "isIndel": t.boolean().optional(),
            "isAmbiguous": t.boolean().optional(),
            "isApobecMutation": t.boolean().optional(),
            "isApobecDRM": t.boolean().optional(),
            "isUnsequenced": t.boolean().optional(),
            "isDRM": t.boolean().optional(),
            "DRMDrugClass": t.proxy(renames["DrugClass"]).optional(),
            "hasStop": t.boolean().optional(),
            "isUnusual": t.boolean().optional(),
            "isSDRM": t.boolean().optional(),
            "SDRMDrugClass": t.proxy(renames["DrugClass"]).optional(),
            "TSMDrugClass": t.proxy(renames["DrugClass"]).optional(),
            "types": t.array(t.proxy(renames["MutationType"]).optional()).optional(),
            "primaryType": t.proxy(renames["MutationType"]).optional(),
            "comments": t.array(
                t.proxy(renames["BoundMutationComment"]).optional()
            ).optional(),
            "text": t.string().optional(),
            "shortText": t.string().optional(),
            "totalReads": t.integer().optional(),
            "allAAReads": t.array(t.proxy(renames["AAReads"]).optional()).optional(),
        }
    ).named(renames["Mutation"])
    types["MutationPrevalence"] = t.struct(
        {
            "AA": t.string().optional(),
            "subtype": t.proxy(renames["MutationPrevalenceSubtype"]).optional(),
            "totalNaive": t.integer().optional(),
            "frequencyNaive": t.integer().optional(),
            "percentageNaive": t.number().optional(),
            "totalTreated": t.integer().optional(),
            "frequencyTreated": t.integer().optional(),
            "percentageTreated": t.number().optional(),
        }
    ).named(renames["MutationPrevalence"])
    types["MutationPrevalenceByAA"] = t.struct(
        {
            "AA": t.string().optional(),
            "subtypes": t.array(
                t.proxy(renames["MutationPrevalence"]).optional()
            ).optional(),
        }
    ).named(renames["MutationPrevalenceByAA"])
    types["MutationPrevalenceSubtype"] = t.struct(
        {
            "name": t.string().optional(),
            "stats": t.array(
                t.proxy(renames["MutationPrevalenceSubtypeStat"]).optional()
            ).optional(),
        }
    ).named(renames["MutationPrevalenceSubtype"])
    types["MutationPrevalenceSubtypeStat"] = t.struct(
        {
            "gene": t.proxy(renames["Gene"]).optional(),
            "totalNaive": t.integer().optional(),
            "totalTreated": t.integer().optional(),
        }
    ).named(renames["MutationPrevalenceSubtypeStat"])
    types["MutationSetFilterOption"] = t.string().named(
        renames["MutationSetFilterOption"]
    )
    types["MutationType"] = t.string().named(renames["MutationType"])
    types["MutationsAnalysis"] = t.struct(
        {
            "name": t.string().optional(),
            "validationResults": t.array(
                t.proxy(renames["ValidationResult"]).optional()
            ).optional(),
            "allGeneMutations": t.array(
                t.proxy(renames["GeneMutations"]).optional()
            ).optional(),
            "mutationPrevalences": t.array(
                t.proxy(renames["BoundMutationPrevalence"]).optional()
            ).optional(),
            "drugResistance": t.array(
                t.proxy(renames["DrugResistance"]).optional()
            ).optional(),
            "algorithmComparison": t.array(
                t.proxy(renames["AlgorithmComparison"]).optional()
            ).optional(),
        }
    ).named(renames["MutationsAnalysis"])
    types["MutationsByType"] = t.struct(
        {
            "drugClass": t.proxy(renames["DrugClass"]).optional(),
            "mutationType": t.proxy(renames["MutationType"]).optional(),
            "mutations": t.array(t.proxy(renames["Mutation"]).optional()).optional(),
        }
    ).named(renames["MutationsByType"])
    types["OneCodonReads"] = t.struct(
        {
            "codon": t.string().optional(),
            "reads": t.integer().optional(),
            "refAminoAcid": t.string().optional(),
            "aminoAcid": t.string().optional(),
            "proportion": t.number().optional(),
            "codonPercent": t.number().optional(),
            "aaPercent": t.number().optional(),
            "isReference": t.boolean().optional(),
            "isDRM": t.boolean().optional(),
            "isUnusual": t.boolean().optional(),
            "isApobecMutation": t.boolean().optional(),
            "isApobecDRM": t.boolean().optional(),
        }
    ).named(renames["OneCodonReads"])
    types["OneCodonReadsCoverage"] = t.struct(
        {
            "gene": t.proxy(renames["Gene"]).optional(),
            "position": t.integer().optional(),
            "totalReads": t.integer().optional(),
            "isTrimmed": t.boolean().optional(),
        }
    ).named(renames["OneCodonReadsCoverage"])
    types["OneCodonReadsInput"] = t.struct(
        {"codon": t.string().optional(), "reads": t.integer().optional()}
    ).named(renames["OneCodonReadsInput"])
    types["PositionCodonReads"] = t.struct(
        {
            "gene": t.proxy(renames["Gene"]).optional(),
            "position": t.integer().optional(),
            "totalReads": t.integer().optional(),
            "codonReads": t.array(
                t.proxy(renames["OneCodonReads"]).optional()
            ).optional(),
        }
    ).named(renames["PositionCodonReads"])
    types["PositionCodonReadsInput"] = t.struct(
        {
            "gene": t.proxy(renames["EnumGene"]).optional(),
            "position": t.integer().optional(),
            "totalReads": t.integer().optional(),
            "allCodonReads": t.array(
                t.proxy(renames["OneCodonReadsInput"]).optional()
            ).optional(),
        }
    ).named(renames["PositionCodonReadsInput"])
    types["PrettyPairwise"] = t.struct(
        {
            "positionLine": t.array(t.string().optional()).optional(),
            "refAALine": t.array(t.string().optional()).optional(),
            "alignedNAsLine": t.array(t.string().optional()).optional(),
            "mutationLine": t.array(t.string().optional()).optional(),
        }
    ).named(renames["PrettyPairwise"])
    types["SIR"] = t.string().named(renames["SIR"])
    types["SequenceAnalysis"] = t.struct(
        {
            "inputSequence": t.proxy(renames["UnalignedSequenceOutput"]).optional(),
            "strain": t.proxy(renames["Strain"]).optional(),
            "isReverseComplement": t.boolean().optional(),
            "availableGenes": t.array(t.proxy(renames["Gene"]).optional()).optional(),
            "validationResults": t.array(
                t.proxy(renames["ValidationResult"]).optional()
            ).optional(),
            "alignedGeneSequences": t.array(
                t.proxy(renames["AlignedGeneSequence"]).optional()
            ).optional(),
            "subtypesV2": t.array(
                t.proxy(renames["HIVBoundSubtype"]).optional()
            ).optional(),
            "bestMatchingSubtype": t.proxy(renames["HIVBoundSubtype"]).optional(),
            "genotypes": t.array(
                t.proxy(renames["HIVBoundSubtype"]).optional()
            ).optional(),
            "bestMatchingGenotype": t.proxy(renames["HIVBoundSubtype"]).optional(),
            "mixturePcnt": t.number().optional(),
            "mixtureRate": t.number().optional(),
            "mutations": t.array(t.proxy(renames["Mutation"]).optional()).optional(),
            "mutationCount": t.integer().optional(),
            "unusualMutationCount": t.integer().optional(),
            "insertionCount": t.integer().optional(),
            "deletionCount": t.integer().optional(),
            "stopCodonCount": t.integer().optional(),
            "ambiguousMutationCount": t.integer().optional(),
            "apobecMutationCount": t.integer().optional(),
            "apobecDRMCount": t.integer().optional(),
            "frameShiftCount": t.integer().optional(),
            "frameShifts": t.array(
                t.proxy(renames["FrameShift"]).optional()
            ).optional(),
            "mutationPrevalences": t.array(
                t.proxy(renames["BoundMutationPrevalence"]).optional()
            ).optional(),
            "subtypes": t.array(t.proxy(renames["BoundSubtype"]).optional()).optional(),
            "subtypeText": t.string().optional(),
            "drugResistance": t.array(
                t.proxy(renames["DrugResistance"]).optional()
            ).optional(),
            "algorithmComparison": t.array(
                t.proxy(renames["AlgorithmComparison"]).optional()
            ).optional(),
        }
    ).named(renames["SequenceAnalysis"])
    types["SequenceReadsAnalysis"] = t.struct(
        {
            "name": t.string().optional(),
            "strain": t.proxy(renames["Strain"]).optional(),
            "cutoffSuggestionLooserLimit": t.number().optional(),
            "cutoffSuggestionStricterLimit": t.number().optional(),
            "validationResults": t.array(
                t.proxy(renames["ValidationResult"]).optional()
            ).optional(),
            "actualMinPrevalence": t.number().optional(),
            "minPrevalence": t.number().optional(),
            "minCodonReads": t.integer().optional(),
            "minPositionReads": t.integer().optional(),
            "availableGenes": t.array(t.proxy(renames["Gene"]).optional()).optional(),
            "allGeneSequenceReads": t.array(
                t.proxy(renames["GeneSequenceReads"]).optional()
            ).optional(),
            "subtypes": t.array(
                t.proxy(renames["HIVBoundSubtype"]).optional()
            ).optional(),
            "bestMatchingSubtype": t.proxy(renames["HIVBoundSubtype"]).optional(),
            "maxMixtureRate": t.number().optional(),
            "mixtureRate": t.number().optional(),
            "mutations": t.array(t.proxy(renames["Mutation"]).optional()).optional(),
            "mutationCount": t.integer().optional(),
            "unusualMutationCount": t.integer().optional(),
            "histogram": t.proxy(renames["SequenceReadsHistogram"]).optional(),
            "histogramByCodonReads": t.proxy(
                renames["SequenceReadsHistogramByCodonReads"]
            ).optional(),
            "readDepthStats": t.proxy(renames["DescriptiveStatistics"]).optional(),
            "readDepthStatsDRP": t.proxy(renames["DescriptiveStatistics"]).optional(),
            "codonReadsCoverage": t.array(
                t.proxy(renames["OneCodonReadsCoverage"]).optional()
            ).optional(),
            "internalJsonCodonReadsCoverage": t.string().optional(),
            "cutoffKeyPoints": t.array(
                t.proxy(renames["CutoffKeyPoint"]).optional()
            ).optional(),
            "assembledConsensus": t.string().optional(),
            "assembledUnambiguousConsensus": t.string().optional(),
            "mutationPrevalences": t.array(
                t.proxy(renames["BoundMutationPrevalence"]).optional()
            ).optional(),
            "drugResistance": t.array(
                t.proxy(renames["DrugResistance"]).optional()
            ).optional(),
            "algorithmComparison": t.array(
                t.proxy(renames["AlgorithmComparison"]).optional()
            ).optional(),
        }
    ).named(renames["SequenceReadsAnalysis"])
    types["SequenceReadsHistogram"] = t.struct(
        {
            "usualSites": t.array(
                t.proxy(renames["SequenceReadsHistogramBin"]).optional()
            ).optional(),
            "usualSitesBy": t.array(
                t.proxy(renames["SequenceReadsHistogramBin"]).optional()
            ).optional(),
            "drmSites": t.array(
                t.proxy(renames["SequenceReadsHistogramBin"]).optional()
            ).optional(),
            "unusualSites": t.array(
                t.proxy(renames["SequenceReadsHistogramBin"]).optional()
            ).optional(),
            "unusualApobecSites": t.array(
                t.proxy(renames["SequenceReadsHistogramBin"]).optional()
            ).optional(),
            "unusualNonApobecSites": t.array(
                t.proxy(renames["SequenceReadsHistogramBin"]).optional()
            ).optional(),
            "apobecSites": t.array(
                t.proxy(renames["SequenceReadsHistogramBin"]).optional()
            ).optional(),
            "apobecDrmSites": t.array(
                t.proxy(renames["SequenceReadsHistogramBin"]).optional()
            ).optional(),
            "stopCodonSites": t.array(
                t.proxy(renames["SequenceReadsHistogramBin"]).optional()
            ).optional(),
            "numPositions": t.integer().optional(),
        }
    ).named(renames["SequenceReadsHistogram"])
    types["SequenceReadsHistogramBin"] = t.struct(
        {
            "percentStart": t.number().optional(),
            "percentStop": t.number().optional(),
            "count": t.integer().optional(),
        }
    ).named(renames["SequenceReadsHistogramBin"])
    types["SequenceReadsHistogramByCodonReads"] = t.struct(
        {
            "usualSites": t.array(
                t.proxy(renames["SequenceReadsHistogramByCodonReadsBin"]).optional()
            ).optional(),
            "drmSites": t.array(
                t.proxy(renames["SequenceReadsHistogramByCodonReadsBin"]).optional()
            ).optional(),
            "unusualSites": t.array(
                t.proxy(renames["SequenceReadsHistogramByCodonReadsBin"]).optional()
            ).optional(),
            "unusualApobecSites": t.array(
                t.proxy(renames["SequenceReadsHistogramByCodonReadsBin"]).optional()
            ).optional(),
            "unusualNonApobecSites": t.array(
                t.proxy(renames["SequenceReadsHistogramByCodonReadsBin"]).optional()
            ).optional(),
            "apobecSites": t.array(
                t.proxy(renames["SequenceReadsHistogramByCodonReadsBin"]).optional()
            ).optional(),
            "apobecDrmSites": t.array(
                t.proxy(renames["SequenceReadsHistogramByCodonReadsBin"]).optional()
            ).optional(),
            "stopCodonSites": t.array(
                t.proxy(renames["SequenceReadsHistogramByCodonReadsBin"]).optional()
            ).optional(),
            "numPositions": t.integer().optional(),
        }
    ).named(renames["SequenceReadsHistogramByCodonReads"])
    types["SequenceReadsHistogramByCodonReadsBin"] = t.struct(
        {"cutoff": t.integer().optional(), "count": t.integer().optional()}
    ).named(renames["SequenceReadsHistogramByCodonReadsBin"])
    types["SequenceReadsInput"] = t.struct(
        {
            "name": t.string().optional(),
            "strain": t.proxy(renames["StrainEnum"]).optional(),
            "allReads": t.array(
                t.proxy(renames["PositionCodonReadsInput"]).optional()
            ).optional(),
            "untranslatedRegions": t.array(
                t.proxy(renames["UntranslatedRegionInput"]).optional()
            ).optional(),
            "maxMixtureRate": t.number().optional(),
            "minPrevalence": t.number().optional(),
            "minCodonReads": t.integer().optional(),
            "minPositionReads": t.integer().optional(),
        }
    ).named(renames["SequenceReadsInput"])
    types["SierraVersion"] = t.struct(
        {"text": t.string().optional(), "publishDate": t.string().optional()}
    ).named(renames["SierraVersion"])
    types["Strain"] = t.struct(
        {"name": t.string().optional(), "display": t.string().optional()}
    ).named(renames["Strain"])
    types["StrainEnum"] = t.string().named(renames["StrainEnum"])
    types["Subtype"] = t.string().named(renames["Subtype"])
    types["UnalignedSequenceInput"] = t.struct(
        {"header": t.string().optional(), "sequence": t.string().optional()}
    ).named(renames["UnalignedSequenceInput"])
    types["UnalignedSequenceOutput"] = t.struct(
        {
            "header": t.string().optional(),
            "sequence": t.string().optional(),
            "MD5": t.string().optional(),
            "SHA512": t.string().optional(),
        }
    ).named(renames["UnalignedSequenceOutput"])
    types["UnsequencedRegion"] = t.struct(
        {
            "posStart": t.integer().optional(),
            "posEnd": t.integer().optional(),
            "size": t.integer().optional(),
        }
    ).named(renames["UnsequencedRegion"])
    types["UnsequencedRegions"] = t.struct(
        {
            "gene": t.proxy(renames["Gene"]).optional(),
            "regions": t.array(
                t.proxy(renames["UnsequencedRegion"]).optional()
            ).optional(),
            "size": t.integer().optional(),
        }
    ).named(renames["UnsequencedRegions"])
    types["UntranslatedRegionInput"] = t.struct(
        {
            "name": t.string().optional(),
            "refStart": t.integer().optional(),
            "refEnd": t.integer().optional(),
            "consensus": t.string().optional(),
        }
    ).named(renames["UntranslatedRegionInput"])
    types["ValidationLevel"] = t.string().named(renames["ValidationLevel"])
    types["ValidationResult"] = t.struct(
        {
            "level": t.proxy(renames["ValidationLevel"]).optional(),
            "message": t.string().optional(),
        }
    ).named(renames["ValidationResult"])
    types["Viewer"] = t.struct(
        {
            "currentVersion": t.proxy(renames["DrugResistanceAlgorithm"]).optional(),
            "currentProgramVersion": t.proxy(renames["SierraVersion"]).optional(),
            "sequenceAnalysis": t.array(
                t.proxy(renames["SequenceAnalysis"]).optional()
            ).optional(),
            "sequenceReadsAnalysis": t.array(
                t.proxy(renames["SequenceReadsAnalysis"]).optional()
            ).optional(),
            "mutationsAnalysis": t.proxy(renames["MutationsAnalysis"]).optional(),
            "patternAnalysis": t.array(
                t.proxy(renames["MutationsAnalysis"]).optional()
            ).optional(),
            "genes": t.array(t.proxy(renames["Gene"]).optional()).optional(),
            "mutationPrevalenceSubtypes": t.array(
                t.proxy(renames["MutationPrevalenceSubtype"]).optional()
            ).optional(),
        }
    ).named(renames["Viewer"])

    functions = {}
    functions["currentVersion"] = hivdb.query(
        t.struct({}), t.proxy(renames["DrugResistanceAlgorithm"]).optional()
    )
    functions["currentProgramVersion"] = hivdb.query(
        t.struct({}), t.proxy(renames["SierraVersion"]).optional()
    )
    functions["sequenceAnalysis"] = hivdb.query(
        t.struct(
            {
                "sequences": t.array(
                    t.proxy(renames["UnalignedSequenceInput"]).optional()
                ).optional()
            }
        ),
        t.array(t.proxy(renames["SequenceAnalysis"]).optional()).optional(),
    )
    functions["sequenceReadsAnalysis"] = hivdb.query(
        t.struct(
            {
                "sequenceReads": t.array(
                    t.proxy(renames["SequenceReadsInput"]).optional()
                ).optional()
            }
        ),
        t.array(t.proxy(renames["SequenceReadsAnalysis"]).optional()).optional(),
    )
    functions["mutationsAnalysis"] = hivdb.query(
        t.struct({"mutations": t.array(t.string().optional()).optional()}),
        t.proxy(renames["MutationsAnalysis"]).optional(),
    )
    functions["patternAnalysis"] = hivdb.query(
        t.struct(
            {
                "patterns": t.array(
                    t.array(t.string().optional()).optional()
                ).optional(),
                "patternNames": t.array(t.string().optional()).optional(),
            }
        ),
        t.array(t.proxy(renames["MutationsAnalysis"]).optional()).optional(),
    )
    functions["genes"] = hivdb.query(
        t.struct(
            {"names": t.array(t.proxy(renames["EnumGene"]).optional()).optional()}
        ),
        t.array(t.proxy(renames["Gene"]).optional()).optional(),
    )
    functions["mutationPrevalenceSubtypes"] = hivdb.query(
        t.struct({}),
        t.array(t.proxy(renames["MutationPrevalenceSubtype"]).optional()).optional(),
    )
    functions["viewer"] = hivdb.query(
        t.struct({}), t.proxy(renames["Viewer"]).optional()
    )

    return Import(importer="hivdb", renames=renames, types=types, functions=functions)


with TypeGraph(name="hivdb") as g:
    hivdb = import_hivdb()

    public = policies.public()
    g.expose(
        mutationPrevalenceSubtypes=hivdb.func("mutationPrevalenceSubtypes").add_policy(
            public
        )
    )
