// roles-data.js
// Keyword and project suggestions per role. Used for role-wise keyword
// gap analysis and the chat assistant's "what should I add" answers.
// This is general, well-known guidance for each field, not a claim about
// any specific employer's requirements.

const ROLE_LIBRARY = {
  "Data Analyst": {
    keywords: ["SQL", "Excel", "Power BI", "Tableau", "Python", "data cleaning",
      "dashboards", "A/B testing", "statistics", "data visualization",
      "ETL", "reporting", "stakeholder communication", "KPI"],
    projects: [
      "Build a sales dashboard in Power BI/Tableau from a public dataset and document the insights.",
      "Clean and analyze a messy real-world CSV dataset in Python/Excel, showing before/after data quality.",
      "Run an A/B test simulation and write up the statistical conclusion in plain language."
    ]
  },
  "Data Scientist": {
    keywords: ["Python", "machine learning", "pandas", "scikit-learn", "statistics",
      "feature engineering", "model evaluation", "SQL", "A/B testing",
      "deep learning", "data pipelines", "experimentation"],
    projects: [
      "Train and evaluate a classification or regression model on a public dataset, with a clear metrics writeup.",
      "Build an end-to-end pipeline (data -> features -> model -> report) and publish it on GitHub.",
      "Design and simulate an A/B test with a documented hypothesis and result."
    ]
  },
  "Software Engineer": {
    keywords: ["data structures", "algorithms", "system design", "Git", "unit testing",
      "REST APIs", "CI/CD", "debugging", "code review", "object-oriented design"],
    projects: [
      "Build a small full-stack app with a documented API and automated tests.",
      "Contribute a real pull request to an open-source project and link it.",
      "Write a design doc + implementation for a small system (e.g. a URL shortener) with tradeoffs explained."
    ]
  },
  "Frontend Developer": {
    keywords: ["JavaScript", "TypeScript", "React", "CSS", "accessibility",
      "responsive design", "component libraries", "state management", "performance", "testing"],
    projects: [
      "Build a responsive, accessible UI component library and publish it.",
      "Recreate a real product screen with attention to performance and accessibility (WCAG).",
      "Build a small React app with tests and a CI pipeline that runs them."
    ]
  },
  "Backend Developer": {
    keywords: ["APIs", "databases", "SQL", "system design", "microservices",
      "caching", "authentication", "scalability", "Docker", "cloud (AWS/GCP/Azure)"],
    projects: [
      "Build a REST or GraphQL API with authentication, tests, and API docs.",
      "Design a database schema for a real-world app and explain your indexing choices.",
      "Containerize a service with Docker and deploy it to a cloud provider."
    ]
  },
  "Full Stack Developer": {
    keywords: ["JavaScript", "React", "Node.js", "databases", "REST APIs",
      "authentication", "deployment", "Git", "testing", "cloud hosting"],
    projects: [
      "Ship a full-stack app end-to-end (frontend + backend + database) and deploy it live.",
      "Add authentication and role-based access to a personal project.",
      "Set up a CI/CD pipeline that tests and deploys your app automatically."
    ]
  },
  "AI/ML Engineer": {
    keywords: ["PyTorch", "TensorFlow", "model deployment", "MLOps", "data pipelines",
      "LLMs", "vector databases", "fine-tuning", "evaluation metrics", "Python"],
    projects: [
      "Fine-tune or prompt-engineer a model for a specific task and document the evaluation.",
      "Deploy a model behind an API with monitoring and version control.",
      "Build a retrieval-augmented (RAG) demo over a small document set."
    ]
  },
  "Cybersecurity Analyst": {
    keywords: ["SIEM", "incident response", "vulnerability assessment", "network security",
      "risk assessment", "penetration testing", "compliance", "threat detection"],
    projects: [
      "Run a vulnerability scan on a lab environment and write a remediation report.",
      "Set up a home SIEM lab and document detection rules you built.",
      "Complete a CTF (capture the flag) challenge and write up your approach."
    ]
  },
  "Cloud/DevOps Engineer": {
    keywords: ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "Terraform",
      "infrastructure as code", "monitoring", "automation"],
    projects: [
      "Automate infrastructure provisioning with Terraform for a small app.",
      "Set up a CI/CD pipeline that builds, tests, and deploys to a container platform.",
      "Deploy a monitored, auto-scaling service on a cloud provider."
    ]
  },
  "Business Analyst": {
    keywords: ["requirements gathering", "SQL", "process mapping", "stakeholder management",
      "data analysis", "Excel", "documentation", "Agile", "reporting"],
    projects: [
      "Document a business process end-to-end with a swimlane diagram and improvement recommendations.",
      "Build a requirements document and wireframe for a sample feature request.",
      "Analyze a public dataset to answer a specific business question and present findings."
    ]
  },
  "Product Manager": {
    keywords: ["roadmap", "user research", "prioritization", "A/B testing", "metrics",
      "stakeholder management", "product strategy", "Agile", "wireframing"],
    projects: [
      "Write a full product spec/PRD for a feature idea, including success metrics.",
      "Run a small user research study and summarize actionable findings.",
      "Design an A/B test plan for a real or hypothetical feature."
    ]
  },
  "UI/UX Designer": {
    keywords: ["Figma", "user research", "wireframing", "prototyping", "usability testing",
      "design systems", "accessibility", "information architecture"],
    projects: [
      "Redesign a real app screen with a documented before/after and rationale.",
      "Run a usability test on a prototype and summarize the findings and changes made.",
      "Build a small design system with reusable components."
    ]
  },
  "Marketing Analyst": {
    keywords: ["Google Analytics", "SQL", "A/B testing", "campaign analysis", "SEO",
      "attribution modeling", "reporting", "Excel", "data visualization"],
    projects: [
      "Analyze a public marketing/campaign dataset and present ROI findings.",
      "Build a dashboard tracking key marketing metrics for a mock campaign.",
      "Run an SEO audit on a real site and document recommended fixes."
    ]
  },
  "Finance Analyst": {
    keywords: ["financial modeling", "Excel", "forecasting", "variance analysis",
      "budgeting", "SQL", "valuation", "reporting", "GAAP"],
    projects: [
      "Build a financial model/forecast for a sample company in Excel.",
      "Perform a variance analysis on sample budget-vs-actual data.",
      "Create an investment or valuation analysis with documented assumptions."
    ]
  },
  "QA Engineer": {
    keywords: ["test automation", "Selenium", "test cases", "regression testing",
      "bug tracking", "CI/CD", "manual testing", "API testing"],
    projects: [
      "Build an automated test suite for a sample web app using Selenium/Playwright.",
      "Write a test plan and a set of test cases for a real feature.",
      "Set up automated tests running in a CI pipeline."
    ]
  }
};

const GENERIC_WEAK_PHRASES = [
  "responsible for", "worked on", "helped with", "assisted with",
  "duties included", "tasked with", "in charge of"
];

const STRONG_ACTION_VERBS = [
  "led", "built", "designed", "developed", "implemented", "launched",
  "created", "improved", "reduced", "increased", "automated", "optimized",
  "managed", "delivered", "architected", "streamlined", "drove", "achieved",
  "spearheaded", "analyzed", "engineered", "deployed", "migrated", "scaled",
  "negotiated", "coordinated", "resolved", "mentored", "trained", "presented"
];

const STOPWORDS = new Set(("a about above after again against all am an and any are as at be "
  + "because been before being below between both but by could did do does "
  + "doing down during each few for from further had has have having he her "
  + "here hers herself him himself his how i if in into is it its itself just "
  + "me more most my myself no nor not now of off on once only or other our "
  + "ours ourselves out over own same she should so some such than that the "
  + "their theirs them themselves then there these they this those through to "
  + "too under until up very was we were what when where which while who whom "
  + "why will with you your yours yourself yourselves the a an will able across " 
  + "e.g etc within per via using use used").split(/\s+/));

const SAMPLE_RESUME = `Jordan Rivera
jordan.rivera@email.com | (555) 214-7788 | linkedin.com/in/jordanrivera | github.com/jrivera

SUMMARY
Data analyst with 3 years of experience turning messy datasets into clear business decisions. Comfortable across SQL, Python, and dashboarding tools.

EXPERIENCE
Data Analyst — Northwind Retail Co.
Jan 2023 - Present
- Built a Power BI dashboard tracking weekly sales across 40 stores, cutting reporting time by 6 hours per week.
- Wrote SQL queries to clean and join 5 disparate data sources into one reporting table.
- Partnered with the marketing team to analyze a promotional campaign, finding a 12% lift in repeat purchases.

Junior Analyst — Bright Path Analytics
Jun 2021 - Dec 2022
- Assisted with monthly reporting for internal stakeholders.
- Helped with data entry and basic Excel formulas.

PROJECTS
Retail Churn Prediction (Python, scikit-learn)
- Built a churn prediction model on public retail data reaching 82% accuracy.

SKILLS
SQL, Python, Excel, Power BI, Tableau, data cleaning, dashboards, statistics

EDUCATION
B.S. in Economics — State University, 2021
`;
