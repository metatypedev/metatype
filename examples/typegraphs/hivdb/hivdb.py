from typegraph import t
from typegraph import TypeGraph
from typegraph.importers.graphql import GraphQLImporter
from typegraph.runtimes.graphql import GraphQLRuntime

GraphQLImporter("hivdb", "https://hivdb.stanford.edu/graphql").imp(False)

with TypeGraph(name="hivdb") as g:
    hivdb = GraphQLRuntime("https://hivdb.stanford.edu/graphql")

    t.struct(
        {
            "aminoAcid": t.string().optional(),
            "percent": t.number().optional(),
            "numReads": t.integer().optional(),
        }
    ).named("AAReads")
    t.string().named("ASIAlgorithm")
    t.struct(
        {
            "drugClass": g("DrugClass").optional(),
            "drugScores": t.array(g("ComparableDrugScore").optional()).optional(),
        }
    ).named("AlgorithmComparison")
    t.struct(
        {
            "gene": g("Gene").optional(),
            "firstAA": t.integer().optional(),
            "lastAA": t.integer().optional(),
            "firstNA": t.integer().optional(),
            "lastNA": t.integer().optional(),
            "matchPcnt": t.number().optional(),
            "size": t.integer().optional(),
            "prettyPairwise": g("PrettyPairwise").optional(),
            "alignedNAs": t.string().optional(),
            "alignedAAs": t.string().optional(),
            "adjustedAlignedNAs": t.string().optional(),
            "adjustedAlignedAAs": t.string().optional(),
            "mutations": t.array(g("Mutation_hivdb").optional()).optional(),
            "mutationCount": t.integer().optional(),
            "unusualMutationCount": t.integer().optional(),
            "insertionCount": t.integer().optional(),
            "deletionCount": t.integer().optional(),
            "stopCodonCount": t.integer().optional(),
            "ambiguousMutationCount": t.integer().optional(),
            "apobecMutationCount": t.integer().optional(),
            "apobecDRMCount": t.integer().optional(),
            "frameShifts": t.array(g("FrameShift").optional()).optional(),
            "unsequencedRegions": g("UnsequencedRegions").optional(),
        }
    ).named("AlignedGeneSequence")
    t.struct(
        {
            "name": t.string().optional(),
            "gene": g("Gene").optional(),
            "drugClass": g("DrugClass").optional(),
            "type": g("CommentType").optional(),
            "text": t.string().optional(),
            "triggeredAAs": t.string().optional(),
            "boundMutation": g("Mutation_hivdb").optional(),
            "highlightText": t.array(t.string().optional()).optional(),
        }
    ).named("BoundMutationComment")
    t.struct(
        {
            "boundMutation": g("Mutation_hivdb").optional(),
            "matched": t.array(g("MutationPrevalenceByAA").optional()).optional(),
            "others": t.array(g("MutationPrevalenceByAA").optional()).optional(),
        }
    ).named("BoundMutationPrevalence")
    t.struct(
        {
            "name": g("Subtype").optional(),
            "distancePcnt": t.number().optional(),
            "display": t.string().optional(),
        }
    ).named("BoundSubtype")
    t.string().named("CommentType")
    t.struct(
        {
            "mutationType": g("CommentType").optional(),
            "commentType": g("CommentType").optional(),
            "comments": t.array(g("BoundMutationComment").optional()).optional(),
        }
    ).named("CommentsByType")
    t.struct(
        {
            "drug": g("Drug").optional(),
            "algorithm": t.string().optional(),
            "SIR": g("SIR").optional(),
            "interpretation": t.string().optional(),
            "explanation": t.string().optional(),
        }
    ).named("ComparableDrugScore")
    t.struct({"name": t.string().optional(), "xml": t.string().optional()}).named(
        "CustomASIAlgorithm"
    )
    t.struct(
        {
            "mixtureRate": t.number().optional(),
            "minPrevalence": t.number().optional(),
            "isAboveMixtureRateThreshold": t.boolean().optional(),
            "isBelowMinPrevalenceThreshold": t.boolean().optional(),
        }
    ).named("CutoffKeyPoint")
    t.struct(
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
    ).named("DescriptiveStatistics")
    t.struct(
        {
            "name": g("DrugEnum").optional(),
            "displayAbbr": t.string().optional(),
            "fullName": t.string().optional(),
            "drugClass": g("DrugClass").optional(),
        }
    ).named("Drug")
    t.struct(
        {
            "name": g("DrugClassEnum").optional(),
            "fullName": t.string().optional(),
            "drugs": t.array(g("Drug").optional()).optional(),
            "gene": g("Gene").optional(),
            "drugResistMutations": t.array(g("Mutation_hivdb").optional()).optional(),
            "surveilDrugResistMutations": t.array(
                g("Mutation_hivdb").optional()
            ).optional(),
            "rxSelectedMutations": t.array(g("Mutation_hivdb").optional()).optional(),
            "mutationTypes": t.array(g("MutationType").optional()).optional(),
            "hasDrugResistMutations": t.boolean().optional(),
            "hasSurveilDrugResistMutations": t.boolean().optional(),
            "hasRxSelectedMutations": t.boolean().optional(),
        }
    ).named("DrugClass")
    t.string().named("DrugClassEnum")
    t.string().named("DrugEnum")
    t.struct(
        {
            "mutations": t.array(g("Mutation_hivdb").optional()).optional(),
            "score": t.number().optional(),
        }
    ).named("DrugPartialScore")
    t.struct(
        {
            "version": g("DrugResistanceAlgorithm").optional(),
            "algorithm": g("DrugResistanceAlgorithm").optional(),
            "gene": g("Gene").optional(),
            "drugScores": t.array(g("DrugScore").optional()).optional(),
            "mutationsByTypes": t.array(g("MutationsByType").optional()).optional(),
            "commentsByTypes": t.array(g("CommentsByType").optional()).optional(),
        }
    ).named("DrugResistance")
    t.struct(
        {
            "text": t.string().optional(),
            "display": t.string().optional(),
            "family": t.string().optional(),
            "version": t.string().optional(),
            "strain": g("Strain").optional(),
            "publishDate": t.string().optional(),
        }
    ).named("DrugResistanceAlgorithm")
    t.struct(
        {
            "drugClass": g("DrugClass").optional(),
            "drug": g("Drug").optional(),
            "SIR": g("SIR").optional(),
            "score": t.number().optional(),
            "level": t.integer().optional(),
            "text": t.string().optional(),
            "partialScores": t.array(g("DrugPartialScore").optional()).optional(),
        }
    ).named("DrugScore")
    t.string().named("EnumGene")
    t.string().named("EnumSequenceReadsHistogramAggregatesOption")
    t.struct(
        {
            "gene": g("Gene").optional(),
            "position": t.integer().optional(),
            "isInsertion": t.boolean().optional(),
            "isDeletion": t.boolean().optional(),
            "size": t.integer().optional(),
            "NAs": t.string().optional(),
            "text": t.string().optional(),
        }
    ).named("FrameShift")
    t.struct(
        {
            "nameWithStrain": t.string().optional(),
            "name": g("EnumGene").optional(),
            "strain": g("Strain").optional(),
            "refSequence": t.string().optional(),
            "reference": t.string().optional(),
            "consensus": t.string().optional(),
            "length": t.integer().optional(),
            "AASize": t.integer().optional(),
            "NASize": t.integer().optional(),
            "drugClasses": t.array(g("DrugClass").optional()).optional(),
            "mutationTypes": t.array(g("MutationType").optional()).optional(),
        }
    ).named("Gene")
    t.struct(
        {
            "gene": g("Gene").optional(),
            "mutations": t.array(g("Mutation_hivdb").optional()).optional(),
        }
    ).named("GeneMutations")
    t.struct(
        {
            "gene": g("Gene").optional(),
            "firstAA": t.integer().optional(),
            "lastAA": t.integer().optional(),
            "allPositionCodonReads": t.array(
                g("PositionCodonReads").optional()
            ).optional(),
            "internalJsonAllPositionCodonReads": t.string().optional(),
            "size": t.integer().optional(),
            "numPositions": t.integer().optional(),
            "readDepthStats": g("DescriptiveStatistics").optional(),
            "alignedNAs": t.string().optional(),
            "alignedAAs": t.string().optional(),
            "mutations": t.array(g("Mutation_hivdb").optional()).optional(),
            "mutationCount": t.integer().optional(),
            "unusualMutationCount": t.integer().optional(),
            "histogram": g("SequenceReadsHistogram").optional(),
            "unsequencedRegions": g("UnsequencedRegions").optional(),
        }
    ).named("GeneSequenceReads")
    t.struct(
        {
            "display": t.string().optional(),
            "displayWithoutDistance": t.string().optional(),
            "subtype": g("HIVSubtype").optional(),
            "genotype": g("HIVSubtype").optional(),
            "displaySubtypes": t.array(g("HIVSubtype").optional()).optional(),
            "displayGenotypes": t.array(g("HIVSubtype").optional()).optional(),
            "firstNA": t.integer().optional(),
            "lastNA": t.integer().optional(),
            "distance": t.number().optional(),
            "distancePcnt": t.string().optional(),
            "referenceAccession": t.string().optional(),
            "referenceCountry": t.string().optional(),
            "referenceYear": t.integer().optional(),
            "discordanceList": t.array(t.integer().optional()).optional(),
        }
    ).named("HIVBoundSubtype")
    t.string().named("HIVClassificationLevel")
    t.struct(
        {
            "indexName": t.string().optional(),
            "displayName": t.string().optional(),
            "classificationLevel": g("HIVClassificationLevel").optional(),
        }
    ).named("HIVSubtype")
    t.struct(
        {
            "gene": g("Gene").optional(),
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
            "DRMDrugClass": g("DrugClass").optional(),
            "hasStop": t.boolean().optional(),
            "isUnusual": t.boolean().optional(),
            "isSDRM": t.boolean().optional(),
            "SDRMDrugClass": g("DrugClass").optional(),
            "TSMDrugClass": g("DrugClass").optional(),
            "types": t.array(g("MutationType").optional()).optional(),
            "primaryType": g("MutationType").optional(),
            "comments": t.array(g("BoundMutationComment").optional()).optional(),
            "text": t.string().optional(),
            "shortText": t.string().optional(),
            "totalReads": t.integer().optional(),
            "allAAReads": t.array(g("AAReads").optional()).optional(),
        }
    ).named("Mutation_hivdb")
    t.struct(
        {
            "AA": t.string().optional(),
            "subtype": g("MutationPrevalenceSubtype").optional(),
            "totalNaive": t.integer().optional(),
            "frequencyNaive": t.integer().optional(),
            "percentageNaive": t.number().optional(),
            "totalTreated": t.integer().optional(),
            "frequencyTreated": t.integer().optional(),
            "percentageTreated": t.number().optional(),
        }
    ).named("MutationPrevalence")
    t.struct(
        {
            "AA": t.string().optional(),
            "subtypes": t.array(g("MutationPrevalence").optional()).optional(),
        }
    ).named("MutationPrevalenceByAA")
    t.struct(
        {
            "name": t.string().optional(),
            "stats": t.array(g("MutationPrevalenceSubtypeStat").optional()).optional(),
        }
    ).named("MutationPrevalenceSubtype")
    t.struct(
        {
            "gene": g("Gene").optional(),
            "totalNaive": t.integer().optional(),
            "totalTreated": t.integer().optional(),
        }
    ).named("MutationPrevalenceSubtypeStat")
    t.string().named("MutationSetFilterOption")
    t.string().named("MutationType")
    t.struct(
        {
            "name": t.string().optional(),
            "validationResults": t.array(g("ValidationResult").optional()).optional(),
            "allGeneMutations": t.array(g("GeneMutations").optional()).optional(),
            "mutationPrevalences": t.array(
                g("BoundMutationPrevalence").optional()
            ).optional(),
            "drugResistance": t.array(g("DrugResistance").optional()).optional(),
            "algorithmComparison": t.array(
                g("AlgorithmComparison").optional()
            ).optional(),
        }
    ).named("MutationsAnalysis")
    t.struct(
        {
            "drugClass": g("DrugClass").optional(),
            "mutationType": g("MutationType").optional(),
            "mutations": t.array(g("Mutation_hivdb").optional()).optional(),
        }
    ).named("MutationsByType")
    t.struct(
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
    ).named("OneCodonReads")
    t.struct(
        {
            "gene": g("Gene").optional(),
            "position": t.integer().optional(),
            "totalReads": t.integer().optional(),
            "isTrimmed": t.boolean().optional(),
        }
    ).named("OneCodonReadsCoverage")
    t.struct({"codon": t.string().optional(), "reads": t.integer().optional()}).named(
        "OneCodonReadsInput"
    )
    t.struct(
        {
            "gene": g("Gene").optional(),
            "position": t.integer().optional(),
            "totalReads": t.integer().optional(),
            "codonReads": t.array(g("OneCodonReads").optional()).optional(),
        }
    ).named("PositionCodonReads")
    t.struct(
        {
            "gene": g("EnumGene").optional(),
            "position": t.integer().optional(),
            "totalReads": t.integer().optional(),
            "allCodonReads": t.array(g("OneCodonReadsInput").optional()).optional(),
        }
    ).named("PositionCodonReadsInput")
    t.struct(
        {
            "positionLine": t.array(t.string().optional()).optional(),
            "refAALine": t.array(t.string().optional()).optional(),
            "alignedNAsLine": t.array(t.string().optional()).optional(),
            "mutationLine": t.array(t.string().optional()).optional(),
        }
    ).named("PrettyPairwise")
    t.string().named("SIR")
    t.struct(
        {
            "inputSequence": g("UnalignedSequenceOutput").optional(),
            "strain": g("Strain").optional(),
            "isReverseComplement": t.boolean().optional(),
            "availableGenes": t.array(g("Gene").optional()).optional(),
            "validationResults": t.array(g("ValidationResult").optional()).optional(),
            "alignedGeneSequences": t.array(
                g("AlignedGeneSequence").optional()
            ).optional(),
            "subtypesV2": t.array(g("HIVBoundSubtype").optional()).optional(),
            "bestMatchingSubtype": g("HIVBoundSubtype").optional(),
            "genotypes": t.array(g("HIVBoundSubtype").optional()).optional(),
            "bestMatchingGenotype": g("HIVBoundSubtype").optional(),
            "mixturePcnt": t.number().optional(),
            "mixtureRate": t.number().optional(),
            "mutations": t.array(g("Mutation_hivdb").optional()).optional(),
            "mutationCount": t.integer().optional(),
            "unusualMutationCount": t.integer().optional(),
            "insertionCount": t.integer().optional(),
            "deletionCount": t.integer().optional(),
            "stopCodonCount": t.integer().optional(),
            "ambiguousMutationCount": t.integer().optional(),
            "apobecMutationCount": t.integer().optional(),
            "apobecDRMCount": t.integer().optional(),
            "frameShiftCount": t.integer().optional(),
            "frameShifts": t.array(g("FrameShift").optional()).optional(),
            "mutationPrevalences": t.array(
                g("BoundMutationPrevalence").optional()
            ).optional(),
            "subtypes": t.array(g("BoundSubtype").optional()).optional(),
            "subtypeText": t.string().optional(),
            "drugResistance": t.array(g("DrugResistance").optional()).optional(),
            "algorithmComparison": t.array(
                g("AlgorithmComparison").optional()
            ).optional(),
        }
    ).named("SequenceAnalysis")
    t.struct(
        {
            "name": t.string().optional(),
            "strain": g("Strain").optional(),
            "cutoffSuggestionLooserLimit": t.number().optional(),
            "cutoffSuggestionStricterLimit": t.number().optional(),
            "validationResults": t.array(g("ValidationResult").optional()).optional(),
            "actualMinPrevalence": t.number().optional(),
            "minPrevalence": t.number().optional(),
            "minCodonReads": t.integer().optional(),
            "minPositionReads": t.integer().optional(),
            "availableGenes": t.array(g("Gene").optional()).optional(),
            "allGeneSequenceReads": t.array(
                g("GeneSequenceReads").optional()
            ).optional(),
            "subtypes": t.array(g("HIVBoundSubtype").optional()).optional(),
            "bestMatchingSubtype": g("HIVBoundSubtype").optional(),
            "maxMixtureRate": t.number().optional(),
            "mixtureRate": t.number().optional(),
            "mutations": t.array(g("Mutation_hivdb").optional()).optional(),
            "mutationCount": t.integer().optional(),
            "unusualMutationCount": t.integer().optional(),
            "histogram": g("SequenceReadsHistogram").optional(),
            "histogramByCodonReads": g("SequenceReadsHistogramByCodonReads").optional(),
            "readDepthStats": g("DescriptiveStatistics").optional(),
            "readDepthStatsDRP": g("DescriptiveStatistics").optional(),
            "codonReadsCoverage": t.array(
                g("OneCodonReadsCoverage").optional()
            ).optional(),
            "internalJsonCodonReadsCoverage": t.string().optional(),
            "cutoffKeyPoints": t.array(g("CutoffKeyPoint").optional()).optional(),
            "assembledConsensus": t.string().optional(),
            "assembledUnambiguousConsensus": t.string().optional(),
            "mutationPrevalences": t.array(
                g("BoundMutationPrevalence").optional()
            ).optional(),
            "drugResistance": t.array(g("DrugResistance").optional()).optional(),
            "algorithmComparison": t.array(
                g("AlgorithmComparison").optional()
            ).optional(),
        }
    ).named("SequenceReadsAnalysis")
    t.struct(
        {
            "usualSites": t.array(g("SequenceReadsHistogramBin").optional()).optional(),
            "usualSitesBy": t.array(
                g("SequenceReadsHistogramBin").optional()
            ).optional(),
            "drmSites": t.array(g("SequenceReadsHistogramBin").optional()).optional(),
            "unusualSites": t.array(
                g("SequenceReadsHistogramBin").optional()
            ).optional(),
            "unusualApobecSites": t.array(
                g("SequenceReadsHistogramBin").optional()
            ).optional(),
            "unusualNonApobecSites": t.array(
                g("SequenceReadsHistogramBin").optional()
            ).optional(),
            "apobecSites": t.array(
                g("SequenceReadsHistogramBin").optional()
            ).optional(),
            "apobecDrmSites": t.array(
                g("SequenceReadsHistogramBin").optional()
            ).optional(),
            "stopCodonSites": t.array(
                g("SequenceReadsHistogramBin").optional()
            ).optional(),
            "numPositions": t.integer().optional(),
        }
    ).named("SequenceReadsHistogram")
    t.struct(
        {
            "percentStart": t.number().optional(),
            "percentStop": t.number().optional(),
            "count": t.integer().optional(),
        }
    ).named("SequenceReadsHistogramBin")
    t.struct(
        {
            "usualSites": t.array(
                g("SequenceReadsHistogramByCodonReadsBin").optional()
            ).optional(),
            "drmSites": t.array(
                g("SequenceReadsHistogramByCodonReadsBin").optional()
            ).optional(),
            "unusualSites": t.array(
                g("SequenceReadsHistogramByCodonReadsBin").optional()
            ).optional(),
            "unusualApobecSites": t.array(
                g("SequenceReadsHistogramByCodonReadsBin").optional()
            ).optional(),
            "unusualNonApobecSites": t.array(
                g("SequenceReadsHistogramByCodonReadsBin").optional()
            ).optional(),
            "apobecSites": t.array(
                g("SequenceReadsHistogramByCodonReadsBin").optional()
            ).optional(),
            "apobecDrmSites": t.array(
                g("SequenceReadsHistogramByCodonReadsBin").optional()
            ).optional(),
            "stopCodonSites": t.array(
                g("SequenceReadsHistogramByCodonReadsBin").optional()
            ).optional(),
            "numPositions": t.integer().optional(),
        }
    ).named("SequenceReadsHistogramByCodonReads")
    t.struct({"cutoff": t.integer().optional(), "count": t.integer().optional()}).named(
        "SequenceReadsHistogramByCodonReadsBin"
    )
    t.struct(
        {
            "name": t.string().optional(),
            "strain": g("StrainEnum").optional(),
            "allReads": t.array(g("PositionCodonReadsInput").optional()).optional(),
            "untranslatedRegions": t.array(
                g("UntranslatedRegionInput").optional()
            ).optional(),
            "maxMixtureRate": t.number().optional(),
            "minPrevalence": t.number().optional(),
            "minCodonReads": t.integer().optional(),
            "minPositionReads": t.integer().optional(),
        }
    ).named("SequenceReadsInput")
    t.struct(
        {"text": t.string().optional(), "publishDate": t.string().optional()}
    ).named("SierraVersion")
    t.struct({"name": t.string().optional(), "display": t.string().optional()}).named(
        "Strain"
    )
    t.string().named("StrainEnum")
    t.string().named("Subtype")
    t.struct(
        {"header": t.string().optional(), "sequence": t.string().optional()}
    ).named("UnalignedSequenceInput")
    t.struct(
        {
            "header": t.string().optional(),
            "sequence": t.string().optional(),
            "MD5": t.string().optional(),
            "SHA512": t.string().optional(),
        }
    ).named("UnalignedSequenceOutput")
    t.struct(
        {
            "posStart": t.integer().optional(),
            "posEnd": t.integer().optional(),
            "size": t.integer().optional(),
        }
    ).named("UnsequencedRegion")
    t.struct(
        {
            "gene": g("Gene").optional(),
            "regions": t.array(g("UnsequencedRegion").optional()).optional(),
            "size": t.integer().optional(),
        }
    ).named("UnsequencedRegions")
    t.struct(
        {
            "name": t.string().optional(),
            "refStart": t.integer().optional(),
            "refEnd": t.integer().optional(),
            "consensus": t.string().optional(),
        }
    ).named("UntranslatedRegionInput")
    t.string().named("ValidationLevel")
    t.struct(
        {"level": g("ValidationLevel").optional(), "message": t.string().optional()}
    ).named("ValidationResult")
    t.struct(
        {
            "currentVersion": g("DrugResistanceAlgorithm").optional(),
            "currentProgramVersion": g("SierraVersion").optional(),
            "sequenceAnalysis": t.array(g("SequenceAnalysis").optional()).optional(),
            "sequenceReadsAnalysis": t.array(
                g("SequenceReadsAnalysis").optional()
            ).optional(),
            "mutationsAnalysis": g("MutationsAnalysis").optional(),
            "patternAnalysis": t.array(g("MutationsAnalysis").optional()).optional(),
            "genes": t.array(g("Gene").optional()).optional(),
            "mutationPrevalenceSubtypes": t.array(
                g("MutationPrevalenceSubtype").optional()
            ).optional(),
        }
    ).named("Viewer")

    g.expose(
        currentVersion=hivdb.query(
            t.struct({}), g("DrugResistanceAlgorithm").optional()
        ),
        currentProgramVersion=hivdb.query(t.struct({}), g("SierraVersion").optional()),
        sequenceAnalysis=hivdb.query(
            t.struct(
                {
                    "sequences": t.array(
                        g("UnalignedSequenceInput").optional()
                    ).optional()
                }
            ),
            t.array(g("SequenceAnalysis").optional()).optional(),
        ),
        sequenceReadsAnalysis=hivdb.query(
            t.struct(
                {
                    "sequenceReads": t.array(
                        g("SequenceReadsInput").optional()
                    ).optional()
                }
            ),
            t.array(g("SequenceReadsAnalysis").optional()).optional(),
        ),
        mutationsAnalysis=hivdb.query(
            t.struct({"mutations": t.array(t.string().optional()).optional()}),
            g("MutationsAnalysis").optional(),
        ),
        patternAnalysis=hivdb.query(
            t.struct(
                {
                    "patterns": t.array(
                        t.array(t.string().optional()).optional()
                    ).optional(),
                    "patternNames": t.array(t.string().optional()).optional(),
                }
            ),
            t.array(g("MutationsAnalysis").optional()).optional(),
        ),
        genes=hivdb.query(
            t.struct({"names": t.array(g("EnumGene").optional()).optional()}),
            t.array(g("Gene").optional()).optional(),
        ),
        mutationPrevalenceSubtypes=hivdb.query(
            t.struct({}), t.array(g("MutationPrevalenceSubtype").optional()).optional()
        ),
        viewer=hivdb.query(t.struct({}), g("Viewer").optional()),
    )
