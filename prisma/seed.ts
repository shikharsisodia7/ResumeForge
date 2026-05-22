import { PrismaClient } from "@prisma/client";
import { DEFAULT_DICTIONARIES, STRONG_VERBS, WEAK_VERBS } from "../src/lib/dictionaries/default-keywords";
import { scoreBullet } from "../src/lib/engines/bullet-scoring";
import { analyzeJobDescription } from "../src/lib/engines/text-analysis";

const prisma = new PrismaClient();

async function main() {
  await prisma.timelineEvent.deleteMany();
  await prisma.exportHistory.deleteMany();
  await prisma.scoreReport.deleteMany();
  await prisma.matchReport.deleteMany();
  await prisma.jobKeyword.deleteMany();
  await prisma.interviewPrep.deleteMany();
  await prisma.application.deleteMany();
  await prisma.coverLetter.deleteMany();
  await prisma.starStory.deleteMany();
  await prisma.resumeVersion.deleteMany();
  await prisma.resumeSection.deleteMany();
  await prisma.resume.deleteMany();
  await prisma.bullet.deleteMany();
  await prisma.experience.deleteMany();
  await prisma.project.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.education.deleteMany();
  await prisma.jobDescription.deleteMany();
  await prisma.fileAsset.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.keywordDictionary.deleteMany();
  await prisma.actionVerbDictionary.deleteMany();

  const profile = await prisma.userProfile.create({
    data: {
      fullName: "Alex Chen",
      email: "alex.chen@university.edu",
      phone: "(555) 234-7890",
      location: "Boston, MA",
      linkedIn: "linkedin.com/in/alexchen",
      github: "github.com/alexchen-dev",
      portfolio: "alexchen.dev",
      summary:
        "Computer Science student passionate about full-stack development, ML applications, and product-minded engineering. Seeking software engineering and AI/ML internships.",
    },
  });

  await prisma.education.create({
    data: {
      profileId: profile.id,
      school: "Northeastern University",
      degree: "B.S.",
      major: "Computer Science",
      minor: "Business Administration",
      gpa: "3.78/4.0",
      graduationDate: "May 2027",
      coursework: JSON.stringify(["Algorithms", "Machine Learning", "Database Systems", "Software Engineering"]),
      honors: "Dean's List (4 semesters)",
      order: 0,
    },
  });

  const experiences = await Promise.all([
    prisma.experience.create({
      data: {
        profileId: profile.id,
        title: "Software Engineering Intern",
        organization: "TechFlow Labs",
        location: "Remote",
        startDate: "Jun 2025",
        endDate: "Aug 2025",
        type: "internship",
        description: "Full-stack development on customer analytics platform",
        order: 0,
      },
    }),
    prisma.experience.create({
      data: {
        profileId: profile.id,
        title: "Teaching Assistant",
        organization: "Northeastern CS Department",
        location: "Boston, MA",
        startDate: "Jan 2025",
        endDate: "Present",
        type: "campus-leadership",
        order: 1,
      },
    }),
    prisma.experience.create({
      data: {
        profileId: profile.id,
        title: "Co-Founder",
        organization: "CampusCart Startup",
        location: "Boston, MA",
        startDate: "Sep 2024",
        endDate: "Present",
        type: "startup",
        order: 2,
      },
    }),
    prisma.experience.create({
      data: {
        profileId: profile.id,
        title: "Data Analyst Intern",
        organization: "RetailMetrics Inc",
        location: "Boston, MA",
        startDate: "Jan 2025",
        endDate: "May 2025",
        type: "internship",
        order: 3,
      },
    }),
    prisma.experience.create({
      data: {
        profileId: profile.id,
        title: "Research Assistant",
        organization: "NLP Research Lab",
        location: "Boston, MA",
        startDate: "Sep 2024",
        endDate: "Present",
        type: "research",
        order: 4,
      },
    }),
    prisma.experience.create({
      data: {
        profileId: profile.id,
        title: "VP of Technology",
        organization: "Student Government Association",
        location: "Boston, MA",
        startDate: "Sep 2024",
        endDate: "Present",
        type: "campus-leadership",
        order: 5,
      },
    }),
    prisma.experience.create({
      data: {
        profileId: profile.id,
        title: "Hackathon Winner",
        organization: "HackMIT 2024",
        location: "Cambridge, MA",
        startDate: "Oct 2024",
        endDate: "Oct 2024",
        type: "hackathon",
        order: 6,
      },
    }),
    prisma.experience.create({
      data: {
        profileId: profile.id,
        title: "Business Analyst Intern",
        organization: "ConsultCo Partners",
        location: "Remote",
        startDate: "May 2024",
        endDate: "Aug 2024",
        type: "internship",
        order: 7,
      },
    }),
  ]);

  const projects = await Promise.all([
    prisma.project.create({
      data: {
        profileId: profile.id,
        name: "ResumeTailor Engine",
        shortDescription: "Local-first resume intelligence platform with job matching",
        problemSolved: "Students struggle to tailor resumes per job without expensive AI tools",
        techStack: JSON.stringify(["Next.js", "TypeScript", "Prisma", "SQLite", "Tailwind"]),
        githubLink: "github.com/alexchen-dev/resume-tailor",
        personalContribution: "Built entire matching engine, UI, and database schema",
        metrics: "Supports 20+ job categories with rule-based scoring",
        readinessScore: 85,
        order: 0,
      },
    }),
    prisma.project.create({
      data: {
        profileId: profile.id,
        name: "AI Project Analyzer",
        shortDescription: "ML pipeline to classify and summarize GitHub repositories",
        problemSolved: "Recruiters need quick project summaries",
        techStack: JSON.stringify(["Python", "TensorFlow", "Flask", "SQL"]),
        githubLink: "github.com/alexchen-dev/ai-analyzer",
        readinessScore: 78,
        order: 1,
      },
    }),
    prisma.project.create({
      data: {
        profileId: profile.id,
        name: "CampusCart Mobile App",
        shortDescription: "Peer marketplace for campus students",
        techStack: JSON.stringify(["React Native", "Firebase", "Stripe"]),
        demoLink: "campuscart.app",
        metrics: "500+ active users, $12K GMV in first semester",
        readinessScore: 82,
        order: 2,
      },
    }),
    prisma.project.create({
      data: {
        profileId: profile.id,
        name: "Sales Dashboard",
        shortDescription: "Tableau-style analytics for retail internship",
        techStack: JSON.stringify(["Python", "Pandas", "SQL", "Tableau"]),
        readinessScore: 70,
        order: 3,
      },
    }),
    prisma.project.create({
      data: {
        profileId: profile.id,
        name: "NLP Sentiment API",
        shortDescription: "Research project on sentiment classification",
        techStack: JSON.stringify(["PyTorch", "Hugging Face", "FastAPI"]),
        readinessScore: 75,
        order: 4,
      },
    }),
    prisma.project.create({
      data: {
        profileId: profile.id,
        name: "HackMIT Health Tracker",
        shortDescription: "24-hour hackathon wellness app",
        techStack: JSON.stringify(["React", "Node.js", "MongoDB"]),
        hackathonName: "HackMIT 2024",
        awards: "1st Place - Health Track",
        readinessScore: 72,
        order: 5,
      },
    }),
  ]);

  const skillNames = [
    "Python", "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "SQL", "PostgreSQL",
    "MongoDB", "Git", "Docker", "AWS", "TensorFlow", "PyTorch", "Pandas", "Machine Learning",
    "REST APIs", "Agile", "Tableau", "Excel", "Figma", "Leadership", "Communication",
    "Product Management", "Financial Modeling", "Java", "C++", "Redis", "Kubernetes",
    "Data Analysis", "Scrum", "Public Speaking", "Technical Writing",
  ];

  const skills = await Promise.all(
    skillNames.map((name, i) =>
      prisma.skill.create({
        data: {
          profileId: profile.id,
          name,
          category: name.match(/Python|Java|TypeScript|React|SQL|JavaScript/)
            ? "programming"
            : name.match(/TensorFlow|PyTorch|Machine Learning/)
              ? "ai-ml"
              : name.match(/Leadership|Communication|Scrum/)
                ? "leadership"
                : "tools",
          proficiency: i < 10 ? "advanced" : "intermediate",
          evidenceStrength: 60 + (i % 30),
          resumeUsageCount: Math.floor(Math.random() * 5),
          order: i,
        },
      })
    )
  );

  const bulletTexts = [
    { text: "Built full-stack analytics dashboard using React and Node.js, reducing report generation time by 40% for 12 enterprise clients", category: "technical", exp: 0, proj: null },
    { text: "Developed REST APIs with PostgreSQL and Redis caching, handling 50K+ daily requests with 99.9% uptime", category: "technical", exp: 0, proj: 0 },
    { text: "Implemented CI/CD pipeline with Docker and GitHub Actions, cutting deployment time from 2 hours to 15 minutes", category: "technical", exp: 0, proj: null },
    { text: "Trained sentiment classification model using PyTorch achieving 91% F1 score on 10K labeled reviews", category: "technical", exp: 4, proj: 4 },
    { text: "Led team of 4 engineers to ship MVP in 6 weeks, acquiring 500+ users and $12K gross merchandise value", category: "leadership", exp: 2, proj: 2 },
    { text: "Mentored 30+ students in Data Structures course, improving average exam scores by 12%", category: "leadership", exp: 1, proj: null },
    { text: "Analyzed sales data using SQL and Python Pandas, identifying $200K revenue opportunity for retail client", category: "data", exp: 3, proj: 3 },
    { text: "Designed Tableau dashboards tracking 15 KPIs, presented findings to VP of Operations", category: "business", exp: 3, proj: null },
    { text: "Coordinated cross-functional team of 8 to launch campus voting platform used by 3,000 students", category: "leadership", exp: 5, proj: null },
    { text: "Researched transformer-based models for text classification, contributing to lab publication draft", category: "research", exp: 4, proj: 4 },
    { text: "Won 1st place at HackMIT by building React Native health tracker with real-time sync for 200+ beta users", category: "hackathon", exp: 6, proj: 5 },
    { text: "Automated ETL pipeline processing 2M rows nightly using Python, reducing manual work by 20 hours/week", category: "technical", exp: 3, proj: null },
    { text: "Optimized database queries reducing page load latency from 3.2s to 800ms across core product flows", category: "technical", exp: 0, proj: 0 },
    { text: "Presented technical roadmap to stakeholders, aligning engineering priorities with business goals", category: "business", exp: 2, proj: null },
    { text: "Documented API specifications and onboarding guides, decreasing new developer setup time by 50%", category: "technical", exp: 0, proj: null },
    { text: "Managed product backlog of 40+ user stories using Jira and Scrum ceremonies with 2-week sprints", category: "business", exp: 2, proj: null },
    { text: "Built financial forecast model in Excel projecting 3-year revenue scenarios for startup pitch deck", category: "finance", exp: 7, proj: null },
    { text: "Conducted user interviews with 25 students to validate marketplace features, increasing retention 18%", category: "marketing", exp: 2, proj: 2 },
    { text: "Deployed ML inference service on AWS Lambda with Docker, serving 1K predictions/min at peak", category: "technical", exp: 4, proj: 1 },
    { text: "Collaborated with designers in Figma to implement responsive UI components used across 8 pages", category: "technical", exp: 0, proj: 0 },
    { text: "Streamlined code review process by introducing linting standards and PR templates for 6-person team", category: "operations", exp: 0, proj: null },
    { text: "Volunteered 100+ hours teaching Python basics to underrepresented high school students", category: "volunteer", exp: null, proj: null },
    { text: "Integrated Stripe payments and Firebase auth for mobile marketplace serving 500 monthly active users", category: "technical", exp: 2, proj: 2 },
  ];

  const bullets = await Promise.all(
    bulletTexts.map((b, i) => {
      const scored = scoreBullet(b.text);
      return prisma.bullet.create({
        data: {
          profileId: profile.id,
          text: b.text,
          category: b.category,
          status: i < 15 ? "polished" : "edited",
          experienceId: b.exp != null ? experiences[b.exp].id : undefined,
          projectId: b.proj != null ? projects[b.proj].id : undefined,
          actionVerb: b.text.split(" ")[0],
          strengthScore: scored.actionVerb * 6,
          clarityScore: scored.clearOutcome * 6,
          specificityScore: scored.specificTask * 6,
          impactScore: scored.measurableImpact * 5,
          keywordScore: 70,
          atsScore: scored.totalScore,
          totalScore: scored.totalScore,
          skillTags: JSON.stringify(["React", "Python", "SQL"].filter((s) => b.text.includes(s))),
        },
      });
    })
  );

  const jobs = [
    {
      title: "Software Engineering Intern",
      company: "Stripe",
      category: "software-engineering",
      text: `Software Engineering Intern - Summer 2026
Requirements:
- Pursuing BS in Computer Science
- Experience with JavaScript, React, and SQL
- Strong problem solving and communication skills
- Build scalable APIs and web applications
- Collaborate in agile teams using Git
Preferred: Python, distributed systems, Docker, AWS`,
    },
    {
      title: "Machine Learning Intern",
      company: "OpenAI",
      category: "ai-ml",
      text: `ML Intern
Required: Python, PyTorch, machine learning fundamentals, research experience
Responsibilities: Train models, evaluate experiments, document results
Preferred: NLP, transformers, FastAPI`,
    },
    {
      title: "Business Analyst Intern",
      company: "Deloitte",
      category: "business-analyst",
      text: `Business Analyst Intern
Requirements: Excel, SQL, stakeholder management, requirements gathering
Experience with Tableau preferred. Strong communication and presentation skills.`,
    },
    {
      title: "Product Management Intern",
      company: "Notion",
      category: "product-management",
      text: `PM Intern - analyze user feedback, write PRDs, prioritize roadmap
Skills: user research, agile, metrics, cross-functional collaboration`,
    },
    {
      title: "Data Analyst Intern",
      company: "Spotify",
      category: "data-analyst",
      text: `Data Analyst Intern
SQL, Python, Pandas, data visualization, dashboard building
Tableau or similar BI tools. A/B testing experience a plus.`,
    },
  ];

  for (const job of jobs) {
    const analysis = analyzeJobDescription(job.text, job.title, job.category);
    const jd = await prisma.jobDescription.create({
      data: {
        title: job.title,
        company: job.company,
        location: "Remote / Hybrid",
        descriptionText: job.text,
        category: job.category,
        extractedKeywords: JSON.stringify(analysis),
      },
    });
    for (const kw of analysis.rankedKeywords.slice(0, 25)) {
      await prisma.jobKeyword.create({
        data: {
          jobDescriptionId: jd.id,
          term: kw.term,
          category: kw.category,
          importance: kw.importance,
          frequency: kw.frequency,
          isRequired: kw.isRequired,
        },
      });
    }
  }

  const resumes = await Promise.all([
    prisma.resume.create({ data: { profileId: profile.id, name: "Master SWE Resume", targetRole: "Software Engineering", template: "software", sectionOrder: JSON.stringify(["skills", "experience", "projects", "education"]) } }),
    prisma.resume.create({ data: { profileId: profile.id, name: "Business Analyst Resume", targetRole: "Business Analyst", template: "business-intern" } }),
    prisma.resume.create({ data: { profileId: profile.id, name: "AI/ML Research Resume", targetRole: "AI/ML", template: "research" } }),
    prisma.resume.create({ data: { profileId: profile.id, name: "Product Resume", targetRole: "Product Management", template: "classic" } }),
    prisma.resume.create({ data: { profileId: profile.id, name: "Data Analyst Resume", targetRole: "Data Analyst", template: "data-analyst" } }),
  ]);

  const bulletIds = bullets.slice(0, 12).map((b) => b.id);
  const skillIds = skills.slice(0, 15).map((s) => s.id);
  const projectIds = projects.slice(0, 4).map((p) => p.id);
  const expIds = experiences.slice(0, 4).map((e) => e.id);

  const versions = [];
  for (let i = 0; i < resumes.length; i++) {
    const v = await prisma.resumeVersion.create({
      data: {
        resumeId: resumes[i].id,
        versionName: `v1.0 - ${resumes[i].targetRole}`,
        targetRole: resumes[i].targetRole ?? undefined,
        selectedBullets: JSON.stringify(bulletIds),
        selectedSkills: JSON.stringify(skillIds),
        selectedProjects: JSON.stringify(projectIds),
        selectedExperiences: JSON.stringify(expIds),
        atsScore: 72 + i * 3,
        jobMatchScore: 65 + i * 5,
        keywordScore: 70 + i * 2,
        bulletScore: 78,
        tailoringConfidence: 80,
      },
    });
    versions.push(v);
    await prisma.scoreReport.create({
      data: {
        resumeVersionId: v.id,
        type: "ats",
        totalScore: v.atsScore,
        breakdown: JSON.stringify({ formatting: 85, keywords: v.keywordScore }),
      },
    });
  }

  const jds = await prisma.jobDescription.findMany();
  if (jds[0] && versions[0]) {
    await prisma.matchReport.create({
      data: {
        jobDescriptionId: jds[0].id,
        resumeVersionId: versions[0].id,
        overallScore: 78,
        hardSkillScore: 82,
        softSkillScore: 70,
        keywordScore: 75,
        experienceScore: 80,
        projectScore: 85,
        reportData: JSON.stringify({ note: "Sample match report" }),
      },
    });
  }

  const coverLetters = await Promise.all([
    prisma.coverLetter.create({ data: { title: "Stripe SWE Cover Letter", template: "software-engineering", company: "Stripe", role: "Software Engineering Intern", content: "Sample cover letter content for Stripe..." } }),
    prisma.coverLetter.create({ data: { title: "Deloitte BA Cover Letter", template: "business-analyst", company: "Deloitte", role: "Business Analyst Intern", content: "Sample cover letter for Deloitte..." } }),
    prisma.coverLetter.create({ data: { title: "OpenAI ML Cover Letter", template: "research-assistant", company: "OpenAI", role: "ML Intern", content: "Sample ML cover letter..." } }),
  ]);

  const apps = await Promise.all([
    prisma.application.create({ data: { company: "Stripe", role: "Software Engineering Intern", status: "applied", resumeVersionId: versions[0].id, jobDescriptionId: jds[0]?.id, matchScoreAtApply: 78, dateApplied: "2026-03-01" } }),
    prisma.application.create({ data: { company: "OpenAI", role: "ML Intern", status: "interview", resumeVersionId: versions[2].id, jobDescriptionId: jds[1]?.id, matchScoreAtApply: 72 } }),
    prisma.application.create({ data: { company: "Deloitte", role: "Business Analyst Intern", status: "saved", resumeVersionId: versions[1].id, jobDescriptionId: jds[2]?.id, matchScoreAtApply: 65 } }),
    prisma.application.create({ data: { company: "Notion", role: "PM Intern", status: "tailoring", resumeVersionId: versions[3].id, jobDescriptionId: jds[3]?.id } }),
    prisma.application.create({ data: { company: "Spotify", role: "Data Analyst Intern", status: "rejected", resumeVersionId: versions[4].id, jobDescriptionId: jds[4]?.id, matchScoreAtApply: 70, outcome: "Rejected after phone screen" } }),
  ]);

  for (const app of apps.slice(0, 2)) {
    await prisma.interviewPrep.create({
      data: {
        applicationId: app.id,
        keywords: JSON.stringify(["React", "SQL", "APIs"]),
        likelyTopics: JSON.stringify(["System design basics", "Past projects", "Behavioral"]),
        prepData: JSON.stringify({ generated: true }),
      },
    });
  }

  const starStories = [
    { situation: "Team conflict during hackathon", task: "Deliver MVP in 24 hours", action: "Mediated roles and split tasks", result: "Won 1st place", category: "teamwork" },
    { situation: "Production bug before demo", task: "Fix critical API failure", action: "Debugged Redis cache issue", result: "Restored service in 2 hours", category: "technical-challenge" },
    { situation: "Low user retention", task: "Improve onboarding", action: "Ran 25 user interviews", result: "18% retention increase", category: "problem-solving" },
    { situation: "First leadership role", task: "Lead SGA tech initiative", action: "Coordinated 8-person team", result: "3,000 students onboarded", category: "leadership" },
    { situation: "Failed first ML model", task: "Improve F1 score", action: "Iterated features and hyperparameters", result: "91% F1 achieved", category: "learning-quickly" },
  ];

  for (const s of starStories) {
    await prisma.starStory.create({
      data: { ...s, skillsShown: "leadership, communication", strengthScore: 85, applicationId: apps[0].id },
    });
  }

  for (const [cat, terms] of Object.entries(DEFAULT_DICTIONARIES)) {
    await prisma.keywordDictionary.create({ data: { category: cat, terms: JSON.stringify(terms) } });
  }
  await prisma.actionVerbDictionary.create({ data: { type: "strong", verbs: JSON.stringify(STRONG_VERBS) } });
  await prisma.actionVerbDictionary.create({ data: { type: "weak", verbs: JSON.stringify(WEAK_VERBS) } });
  await prisma.settings.upsert({
    where: { id: "default" },
    create: { id: "default", theme: "system", defaultTemplate: "software" },
    update: {},
  });

  const events = [
    ["resume_created", "Created Master SWE Resume"],
    ["bullet_edited", "Polished TechFlow internship bullet"],
    ["job_imported", "Imported Stripe job description"],
    ["resume_scanned", "Ran ATS scan on SWE resume — score 78"],
    ["resume_tailored", "Tailored resume for Stripe SWE role"],
    ["application_submitted", "Applied to Stripe"],
    ["interview_received", "Interview scheduled at OpenAI"],
    ["skill_added", "Added Kubernetes to skill matrix"],
    ["export_pdf", "Exported PDF for Deloitte application"],
    ["score_improved", "Bullet score improved from 62 to 85"],
  ];

  for (const [type, title] of events) {
    await prisma.timelineEvent.create({ data: { type, title, description: `Sample event: ${title}` } });
  }

  console.log("Seed completed successfully");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
