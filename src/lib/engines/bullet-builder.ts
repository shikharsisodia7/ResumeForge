const TEMPLATES: Record<string, string[]> = {
  "software-engineering": [
    "Built {what} using {tool} to {problem}, improving {metric}.",
    "Developed {what} with {tool} that {outcome}, resulting in {metric}.",
    "Implemented {what} in {tool} to optimize {problem}, achieving {metric}.",
  ],
  "ai-ml": [
    "Trained {what} using {tool} to {problem}, achieving {metric} accuracy/improvement.",
    "Built ML pipeline with {tool} to analyze {problem}, delivering {metric}.",
    "Researched and implemented {what} with {tool}, improving {metric}.",
  ],
  "data-analysis": [
    "Analyzed {what} using {tool} to identify {problem}, helping {audience} achieve {metric}.",
    "Built dashboard/report in {tool} tracking {what}, driving {metric} improvement.",
    "Cleaned and modeled {what} with {tool} to uncover {problem}, resulting in {metric}.",
  ],
  "product-management": [
    "Defined requirements for {what} by {method}, prioritizing {problem} and delivering {metric}.",
    "Led discovery on {what} with {audience}, shaping roadmap that achieved {metric}.",
    "Coordinated cross-functional team on {what}, launching {outcome} with {metric}.",
  ],
  "business-analysis": [
    "Mapped {what} process using {tool}, identifying {problem} and recommending {metric} savings.",
    "Gathered requirements from {audience} for {what}, documenting specs that enabled {metric}.",
    "Analyzed {what} data with {tool} to support {problem}, improving {metric}.",
  ],
  marketing: [
    "Executed {what} campaign using {tool}, increasing {metric} across {audience}.",
    "Created {what} content strategy with {tool}, driving {metric} engagement.",
    "Optimized {what} funnel via {tool}, improving {metric} conversion.",
  ],
  finance: [
    "Built {what} model in {tool} to evaluate {problem}, supporting {metric} decision.",
    "Analyzed {what} financials using {tool}, identifying {problem} with {metric} impact.",
    "Prepared {what} reports for {audience}, improving {metric} accuracy/efficiency.",
  ],
  research: [
    "Conducted research on {what} using {tool}, contributing to {problem} with {metric}.",
    "Designed experiment for {what} with {tool}, validating {problem} at {metric}.",
    "Co-authored analysis of {what}, presenting findings to {audience} on {metric}.",
  ],
  leadership: [
    "Led {audience} through {what}, coordinating {tool} and achieving {metric}.",
    "Managed {what} initiative for {audience}, delivering {outcome} with {metric}.",
    "Mentored {audience} on {what}, improving {metric} team performance.",
  ],
  "startup-founder": [
    "Founded {what} to solve {problem}, using {tool} to reach {metric} users/traction.",
    "Launched MVP of {what} with {tool}, validating {problem} and securing {metric}.",
    "Pitched {what} to {audience}, securing {metric} funding/partnerships.",
  ],
  hackathon: [
    "Built {what} in 24-48 hours using {tool}, winning {metric} at {audience} hackathon.",
    "Developed prototype {what} with {tool} addressing {problem}, earning {metric}.",
  ],
  campus: [
    "Organized {what} for {audience}, increasing participation by {metric}.",
    "Led {what} as {role} for {audience}, delivering {metric} impact.",
  ],
  volunteer: [
    "Volunteered {what} hours on {problem} with {audience}, achieving {metric}.",
    "Coordinated {what} for {audience}, improving {metric} community outcome.",
  ],
  operations: [
    "Streamlined {what} process using {tool}, reducing {metric} time/cost.",
    "Implemented {what} workflow with {tool}, improving {metric} efficiency.",
  ],
};

export interface BulletBuilderFields {
  what: string;
  problem: string;
  tool: string;
  audience: string;
  outcome: string;
  metric: string;
  skill: string;
  role: string;
}

export function generateBulletsFromFields(fields: BulletBuilderFields): string[] {
  const category = fields.role || "software-engineering";
  const templates = TEMPLATES[category] ?? TEMPLATES["software-engineering"];
  const replacements: Record<string, string> = {
    "{what}": fields.what || "the solution",
    "{problem}": fields.problem || "a key challenge",
    "{tool}": fields.tool || "relevant tools",
    "{audience}": fields.audience || "stakeholders",
    "{outcome}": fields.outcome || "a positive outcome",
    "{metric}": fields.metric || "measurable impact",
    "{method}": fields.tool || "structured methods",
    "{role}": fields.role || "team lead",
  };

  return templates.map((tpl) => {
    let result = tpl;
    Object.entries(replacements).forEach(([key, val]) => {
      result = result.replaceAll(key, val);
    });
    if (fields.skill) {
      result += ` (Skills: ${fields.skill})`;
    }
    return result;
  });
}
