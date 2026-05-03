import { textResult, type ToolResult } from "../types.js";

const ARXIV_CATEGORIES: Record<string, Record<string, string>> = {
  "Computer Science": {
    "cs.AI": "Artificial Intelligence",
    "cs.CL": "Computation and Language",
    "cs.CV": "Computer Vision and Pattern Recognition",
    "cs.LG": "Machine Learning",
    "cs.CR": "Cryptography and Security",
    "cs.DB": "Databases",
    "cs.DC": "Distributed, Parallel, and Cluster Computing",
    "cs.DS": "Data Structures and Algorithms",
    "cs.HC": "Human-Computer Interaction",
    "cs.IR": "Information Retrieval",
    "cs.IT": "Information Theory",
    "cs.MA": "Multiagent Systems",
    "cs.NE": "Neural and Evolutionary Computing",
    "cs.PL": "Programming Languages",
    "cs.RO": "Robotics",
    "cs.SE": "Software Engineering",
    "cs.SI": "Social and Information Networks",
    "cs.SY": "Systems and Control",
  },
  "Mathematics": {
    "math.AG": "Algebraic Geometry",
    "math.CO": "Combinatorics",
    "math.NA": "Numerical Analysis",
    "math.OC": "Optimization and Control",
    "math.PR": "Probability",
    "math.ST": "Statistics Theory",
  },
  "Physics": {
    "astro-ph": "Astrophysics",
    "cond-mat": "Condensed Matter",
    "hep-ph": "High Energy Physics - Phenomenology",
    "hep-th": "High Energy Physics - Theory",
    "quant-ph": "Quantum Physics",
    "physics.comp-ph": "Computational Physics",
  },
  "Statistics": {
    "stat.ML": "Machine Learning",
    "stat.ME": "Methodology",
    "stat.TH": "Statistics Theory",
    "stat.AP": "Applications",
    "stat.CO": "Computation",
  },
  "Electrical Engineering": {
    "eess.AS": "Audio and Speech Processing",
    "eess.IV": "Image and Video Processing",
    "eess.SP": "Signal Processing",
    "eess.SY": "Systems and Control",
  },
  "Quantitative Biology": {
    "q-bio.BM": "Biomolecules",
    "q-bio.GN": "Genomics",
    "q-bio.NC": "Neurons and Cognition",
    "q-bio.QM": "Quantitative Methods",
  },
  "Quantitative Finance": {
    "q-fin.CP": "Computational Finance",
    "q-fin.RM": "Risk Management",
    "q-fin.ST": "Statistical Finance",
  },
};

export const listCategoriesTool = {
  name: "list_categories",
  description: "List arXiv subject categories, optionally filtered by group",
  inputSchema: {
    type: "object" as const,
    properties: {
      group: {
        type: "string",
        description:
          "Filter by group name (e.g. 'Computer Science', 'Physics', 'Statistics'). Omit to list all.",
      },
    },
  },
};

export async function handleListCategories(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const group = args.group as string | undefined;

  if (group) {
    const cats = ARXIV_CATEGORIES[group];
    if (!cats) {
      const available = Object.keys(ARXIV_CATEGORIES).join(", ");
      return textResult(`Unknown group "${group}". Available: ${available}`);
    }
    const lines = Object.entries(cats).map(([code, name]) => `  ${code}: ${name}`);
    return textResult(`${group}:\n${lines.join("\n")}`);
  }

  const lines: string[] = [];
  for (const [groupName, cats] of Object.entries(ARXIV_CATEGORIES)) {
    lines.push(`\n**${groupName}**`);
    for (const [code, name] of Object.entries(cats)) {
      lines.push(`  ${code}: ${name}`);
    }
  }
  return textResult(lines.join("\n"));
}
