const COVER_TEMPLATES: Record<string, (f: CoverLetterFields) => string> = {
  internship: (f) => `${f.date}\n\nDear Hiring Manager,\n\nI am writing to apply for the ${f.role} internship at ${f.company}. As a motivated student with hands-on experience in ${f.topSkills}, I am eager to contribute to your team.\n\nThrough my work at ${f.topExperiences}, I developed skills in ${f.topSkills}, directly aligning with your need for candidates who can ${f.whyRole}.\n\n${f.whyCompany}\n\nI would welcome the opportunity to discuss how I can support ${f.company}. ${f.closing}\n\nSincerely,\n${f.name}`,
  "software-engineering": (f) => `${f.date}\n\nDear Hiring Manager,\n\nI am excited to apply for the ${f.role} position at ${f.company}. With experience building software through ${f.topExperiences}, I bring strong fundamentals in ${f.topSkills}.\n\nHighlights relevant to this role:\n• ${f.topExperiences.split(",")[0] ?? f.topExperiences}\n• Proficiency in ${f.topSkills}\n\n${f.whyCompany}\n\n${f.whyRole}\n\n${f.closing}\n\nBest regards,\n${f.name}`,
  "research-assistant": (f) => `${f.date}\n\nDear Professor/Hiring Committee,\n\nI am applying for the ${f.role} role at ${f.company}. My background in ${f.topSkills} and research experience through ${f.topExperiences} prepare me to contribute to your lab's work.\n\n${f.whyRole}\n\n${f.whyCompany}\n\n${f.closing}\n\nSincerely,\n${f.name}`,
  "business-analyst": (f) => `${f.date}\n\nDear Hiring Manager,\n\nI am writing regarding the ${f.role} opening at ${f.company}. My experience ${f.topExperiences} has strengthened my analytical skills in ${f.topSkills}.\n\n${f.whyCompany}\n\n${f.whyRole}\n\n${f.closing}\n\nRegards,\n${f.name}`,
  marketing: (f) => `${f.date}\n\nDear Hiring Manager,\n\nI am enthusiastic about the ${f.role} opportunity at ${f.company}. Through ${f.topExperiences}, I have applied ${f.topSkills} to drive measurable outcomes.\n\n${f.whyCompany}\n\n${f.whyRole}\n\n${f.closing}\n\nBest,\n${f.name}`,
  finance: (f) => `${f.date}\n\nDear Hiring Manager,\n\nPlease consider my application for ${f.role} at ${f.company}. My experience with ${f.topExperiences} and skills in ${f.topSkills} align with your team's needs.\n\n${f.whyCompany}\n\n${f.whyRole}\n\n${f.closing}\n\nSincerely,\n${f.name}`,
  "startup-role": (f) => `${f.date}\n\nDear ${f.company} Team,\n\nI am drawn to the ${f.role} role because of your mission and pace. I have built and shipped through ${f.topExperiences}, wearing multiple hats across ${f.topSkills}.\n\n${f.whyCompany}\n\n${f.whyRole}\n\n${f.closing}\n\n${f.name}`,
  "campus-job": (f) => `${f.date}\n\nDear Hiring Manager,\n\nI am applying for ${f.role} at ${f.company}. As an engaged campus leader (${f.topExperiences}), I bring reliability and skills in ${f.topSkills}.\n\n${f.whyRole}\n\n${f.closing}\n\n${f.name}`,
  "cold-outreach": (f) => `${f.date}\n\nDear ${f.company} Team,\n\nI admire the work your team is doing and wanted to introduce myself regarding ${f.role} opportunities. My background in ${f.topSkills} from ${f.topExperiences} may be a fit.\n\n${f.whyCompany}\n\nWould you be open to a brief conversation?\n\n${f.closing}\n\n${f.name}`,
};

export interface CoverLetterFields {
  name: string;
  date: string;
  company: string;
  role: string;
  topExperiences: string;
  topSkills: string;
  whyCompany: string;
  whyRole: string;
  closing: string;
}

export function generateCoverLetter(template: string, fields: CoverLetterFields): string {
  const fn = COVER_TEMPLATES[template] ?? COVER_TEMPLATES.internship;
  return fn(fields);
}
