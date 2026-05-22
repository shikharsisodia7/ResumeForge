export const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "by", "from", "as", "is", "was", "are", "were", "been", "be", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "may", "might", "must",
  "shall", "can", "need", "our", "your", "their", "this", "that", "these", "those",
  "we", "you", "they", "it", "its", "who", "which", "what", "when", "where", "how",
  "all", "each", "every", "both", "few", "more", "most", "other", "some", "such",
  "no", "not", "only", "own", "same", "so", "than", "too", "very", "just", "about",
  "into", "through", "during", "before", "after", "above", "below", "between",
  "under", "again", "further", "then", "once", "here", "there", "any", "both",
  "while", "also", "including", "able", "work", "working", "role", "position",
  "team", "company", "candidate", "ideal", "looking", "join", "opportunity",
]);

export const WEAK_VERBS = [
  "helped", "worked", "assisted", "did", "made", "participated",
  "responsible", "involved", "handled", "supported", "utilized",
];

export const STRONG_VERBS = [
  "built", "developed", "automated", "analyzed", "designed", "implemented",
  "launched", "led", "managed", "optimized", "researched", "deployed", "created",
  "improved", "increased", "reduced", "streamlined", "coordinated", "presented",
  "evaluated", "generated", "integrated", "tested", "architected", "engineered",
  "delivered", "scaled", "migrated", "refactored", "prototyped",
];

export const VAGUE_PHRASES = [
  "various", "several", "many", "some", "etc", "and more", "etc.",
  "responsible for", "duties included", "worked on", "helped with",
];

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "programming": ["python", "java", "javascript", "typescript", "c++", "c#", "go", "rust", "ruby", "swift", "kotlin", "scala", "r", "matlab"],
  "frameworks": ["react", "next.js", "nextjs", "vue", "angular", "node", "nodejs", "express", "django", "flask", "spring", "fastapi", "tailwind", "bootstrap"],
  "databases": ["sql", "mysql", "postgresql", "postgres", "mongodb", "redis", "sqlite", "dynamodb", "elasticsearch", "oracle"],
  "ai-ml": ["machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn", "nlp", "computer vision", "neural", "llm", "transformer", "model training"],
  "data-analysis": ["excel", "tableau", "power bi", "pandas", "numpy", "statistics", "regression", "visualization", "etl", "data pipeline"],
  "business": ["stakeholder", "cross-functional", "requirements", "process improvement", "kpi", "roi", "strategy", "roadmap"],
  "finance": ["financial modeling", "valuation", "dcf", "excel modeling", "accounting", "forecasting", "budget", "audit"],
  "marketing": ["seo", "sem", "campaign", "content", "brand", "social media", "analytics", "conversion", "crm"],
  "product": ["product management", "user research", "roadmap", "prd", "agile", "scrum", "backlog", "user stories"],
  "research": ["literature review", "hypothesis", "experiment", "publication", "lab", "methodology", "peer review"],
  "soft-skills": ["communication", "teamwork", "collaboration", "leadership", "problem solving", "critical thinking", "adaptability", "time management"],
  "leadership": ["led", "managed", "mentored", "coordinated", "facilitated", "delegated", "supervised"],
  "tools": ["git", "github", "docker", "kubernetes", "aws", "azure", "gcp", "jenkins", "ci/cd", "jira", "figma", "slack"],
  "education": ["bachelor", "master", "phd", "degree", "gpa", "coursework", "cs", "computer science", "engineering", "mba"],
  "experience-req": ["years of experience", "years experience", "minimum", "preferred", "senior", "junior", "entry level", "intern"],
};

export const DEFAULT_DICTIONARIES: Record<string, string[]> = {
  "software-engineering": ["algorithms", "data structures", "oop", "api", "rest", "microservices", "testing", "debugging", "code review", "agile", "scrum"],
  "frontend": ["html", "css", "responsive", "accessibility", "webpack", "vite", "state management", "redux", "ui/ux"],
  "backend": ["api design", "authentication", "authorization", "caching", "load balancing", "microservices", "message queue", "kafka"],
  "fullstack": ["full stack", "end-to-end", "mern", "mean", "rest api", "graphql"],
  "ai-ml": ["neural networks", "supervised learning", "unsupervised learning", "feature engineering", "model evaluation", "hyperparameter"],
  "data-science": ["jupyter", "a/b testing", "hypothesis testing", "clustering", "classification", "feature selection"],
  "data-analyst": ["sql queries", "dashboard", "reporting", "data cleaning", "pivot tables", "business intelligence"],
  "business-analyst": ["requirements gathering", "process mapping", "stakeholder management", "use cases", "gap analysis", "uml"],
  "product-management": ["prioritization", "metrics", "customer discovery", "go-to-market", "competitive analysis"],
  "finance": ["financial statements", "balance sheet", "income statement", "cash flow", "investment banking"],
  "marketing": ["market research", "customer segmentation", "go-to-market", "brand strategy"],
  "marketing-ops": ["marketing automation", "hubspot", "salesforce", "lead generation", "funnel optimization"],
  "consulting": ["case interview", "client engagement", "presentation", "framework", "due diligence"],
  "research-assistant": ["grant writing", "data collection", "statistical analysis", "manuscript", "irb"],
  "cybersecurity": ["penetration testing", "vulnerability", "encryption", "firewall", "soc", "incident response"],
  "ux-design": ["wireframe", "prototype", "usability testing", "design system", "user journey"],
  "operations": ["supply chain", "logistics", "inventory", "lean", "six sigma", "operations research"],
  "startup-bd": ["pitch deck", "fundraising", "venture", "growth hacking", "mvp", "customer acquisition"],
  "campus": ["student organization", "campus", "peer mentor", "orientation", "resident advisor"],
  "leadership": ["president", "vice president", "director", "chair", "executive board"],
};

export const TECH_PATTERNS = /\b(?:React|Node\.?js|Python|Java|TypeScript|JavaScript|SQL|AWS|Docker|Kubernetes|Git|MongoDB|PostgreSQL|TensorFlow|PyTorch|Excel|Tableau|Figma|Jira|CI\/CD|REST|GraphQL|Next\.?js|Vue|Angular|Flask|Django|Spring|Redis|Kafka|Spark|Hadoop|Azure|GCP|Linux|Bash|C\+\+|C#|Go|Rust|Swift|Kotlin|Scala|R|MATLAB|Power BI|SAP|Salesforce|HubSpot)\b/gi;

export const RESPONSIBILITY_VERBS = [
  "develop", "design", "implement", "build", "manage", "lead", "analyze",
  "create", "maintain", "collaborate", "coordinate", "support", "drive",
  "deliver", "optimize", "research", "test", "deploy", "document", "present",
];
