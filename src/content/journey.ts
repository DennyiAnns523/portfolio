// Everything on the /journey page (the academic and professional side of the site).
// Edit the text here; the page layout lives in src/app/journey/page.tsx.

export interface Img {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export const profile = {
  name: 'Dennyi Anns',
  tagline: 'AI adventurer and a newbee developer.',
  // The headline under the name.
  headline: { role: 'Data Scientist', org: 'Carer.ai', url: 'https://carer.ai/' },
  roles: ['Data Scientist @ Carer.ai', 'M.Tech, Computer Science (Intelligent Systems), IIT Mandi'],
  location: 'Mandi, Himachal Pradesh',
  photo: { src: '/images/profile.jpg', width: 1024, height: 1024, alt: 'Illustrated portrait of Dennyi in a blue bandana and glasses, coding at a glowing screen' } as Img,
  links: {
    resume: 'https://drive.google.com/file/d/1nWI04fHZ8A6SnHggTRfCT0ZYBqRMa-Jq/view?usp=sharing',
    github: 'https://github.com/DennyiAnns523',
    linkedin: 'https://www.linkedin.com/in/dennyi-anns-konyak-3303951b5',
    email: 'dennyimoiok@gmail.com',
  },
};

export const about = {
  paragraphs: [
    'Hello! Namaste! Salam! I’m a developer still discovering the builder side of me. My M.Tech at IIT Mandi specialises in Intelligent Systems, and alongside the AI/ML coursework I love building software end to end.',
    'My web journey started in college with my first website, Cafe Books and Coffee. I always wanted a portfolio of my own: a bookmark for my developing era, and a place to keep sharpening the craft.',
    'This is where I share my projects, the things I have explored and worked on, and what I want to explore next.',
  ],
  photo: { src: '/images/about-me.jpg', width: 853, height: 1280, alt: 'IIT Mandi’s administrative building at dusk, framed by leaves, with the hills behind' } as Img,
  caption: 'IIT Mandi at dusk',
  interests: ['AI/ML', 'Web development', 'UI/UX design', 'DevOps & MLOps', 'Open source', 'Photography', 'Travel', 'Coffee ☕'],
  extracurricular: 'Inter-IIT women’s basketball team member',
};

export interface Milestone {
  kind: 'Work' | 'Education' | 'Internship';
  title: string;
  org: string;
  orgUrl?: string;
  when: string;
  current?: boolean;
  place?: string;
  logo?: Img;
  summary: string;
  highlights?: string[];
  topics?: string[];
}

// Newest first.
export const journey: Milestone[] = [
  {
    kind: 'Work',
    title: 'Data Scientist',
    org: 'Carer.ai',
    orgUrl: 'https://carer.ai/',
    when: 'Present',
    current: true,
    summary: 'Data science at Carer.ai.',
  },
  {
    kind: 'Education',
    title: 'M.Tech, Computer Science (Intelligent Systems)',
    org: 'IIT Mandi',
    orgUrl: 'https://iitmandi.ac.in',
    when: 'Jul 2024 – Present',
    current: true,
    place: 'Mandi, Himachal Pradesh',
    logo: { src: '/images/companies/iit-mandi.png', width: 227, height: 148, alt: 'IIT Mandi logo' },
    summary: 'Graduate studies and research in machine learning and deep learning, with a research focus on cognitive modeling of cyberattack simulations.',
    highlights: ['Research on cognitive modeling of adversarial decision-making (see Research below)'],
    topics: ['Machine learning', 'Deep learning', 'Python', 'Research'],
  },
  {
    kind: 'Internship',
    title: 'Cybersecurity Intern',
    org: 'NIELIT Kohima',
    orgUrl: 'https://www.nielit.gov.in',
    when: 'Jul 2023 – Sep 2023',
    place: 'Kohima, India',
    logo: { src: '/images/companies/nielit-kohima.png', width: 314, height: 160, alt: 'NIELIT logo' },
    summary: 'A two-month internship in cybersecurity and digital forensics, assisting with investigations and tool development.',
    highlights: ['Contributed to forensic analysis workflows', 'Wrote an automation script to speed up evidence parsing'],
    topics: ['Digital forensics', 'Malware analysis', 'Python', 'Report writing'],
  },
  {
    kind: 'Education',
    title: 'B.Tech, Computer Science',
    org: 'NIT Nagaland',
    when: 'Aug 2019 – Jun 2023',
    logo: { src: '/images/companies/nit-nagaland.jpg', width: 224, height: 225, alt: 'NIT Nagaland logo' },
    summary: 'Undergraduate programme in core computer science: data structures, algorithms, operating systems and computer networks.',
    highlights: ['Graduated, Class of 2023', 'Final-year project: forehead crease biometric recognition'],
    topics: ['C++', 'Python', 'Data structures', 'Algorithms'],
  },
];

export interface Project {
  title: string;
  status: 'Completed' | 'In progress';
  summary: string;
  tags: string[];
  image?: Img;
  links?: { label: string; href: string }[];
}

export const research: Project = {
  title: 'Adversarial AI Decision-Making & Cognitive Modeling Framework',
  status: 'In progress',
  summary:
    'A comparative modeling study using Instance-Based Learning and GPT-4o to simulate and analyse human adversarial decision-making in deceptive cybersecurity environments.',
  tags: ['Python', 'GPT-4o', 'Instance-Based Learning (IBL)', 'Cognitive modeling', 'Cybersecurity'],
  image: { src: '/images/projects/hackit1.png', width: 1452, height: 800, alt: 'The HackIT tool: upload index and test spreadsheets, choose an LLM and RAG settings, and process files' },
};

export const projects: Project[] = [
  {
    title: 'AdaDistill HeadCrease',
    status: 'Completed',
    summary: 'Adaptive knowledge distillation for deep face recognition, adapted to recognise people by their forehead creases when masks hide the rest of the face.',
    tags: ['Python', 'Shell scripting', 'Knowledge distillation', 'Biometrics'],
    image: { src: '/images/projects/adadistill.jpg', width: 726, height: 396, alt: 'AdaDistill HeadCrease project preview' },
    links: [{ label: 'Code', href: 'https://github.com/DennyiAnns523/headcrease_tune_ada' }],
  },
  {
    title: 'This portfolio',
    status: 'Completed',
    summary: 'An interactive little world (a floating island, a black hole, free throws, a Rubik’s cube and a 3D garden) plus this page, with a secure backend for notes, ideas and feedback.',
    tags: ['Next.js', 'TypeScript', 'MongoDB', 'Three.js'],
    image: { src: '/images/projects/portfolio.png', width: 1766, height: 778, alt: 'Portfolio website preview' },
    links: [
      { label: 'Code', href: 'https://github.com/DennyiAnns523/portfolio' },
      { label: 'Visit the world', href: '/' },
    ],
  },
  {
    title: 'Music recommendation chatbot',
    status: 'Completed',
    summary: 'A chatbot that recommends music based on the emotions it detects in what you write.',
    tags: ['NLP', 'Emotion detection'],
    image: { src: '/images/projects/music1.jpg', width: 1702, height: 838, alt: 'Music recommendation chatbot preview' },
  },
  {
    title: 'Student attendance management system',
    status: 'Completed',
    summary: 'A web-based system to manage student data, attendance and academic records.',
    tags: ['Next.js', 'TypeScript'],
  },
  {
    title: 'Banking app UI design',
    status: 'Completed',
    summary: 'A modern banking app interface designed around a clear, accessible user experience.',
    tags: ['Figma', 'Adobe XD', 'Prototyping', 'User research'],
  },
];

export const skills: { group: string; items: string[] }[] = [
  { group: 'AI / ML', items: ['PyTorch', 'Fine-tuning', 'Deep learning', 'LLMs'] },
  { group: 'Languages', items: ['Python', 'C / C++', 'TypeScript'] },
  { group: 'Frontend', items: ['React', 'Next.js', 'Tailwind CSS', 'Framer Motion'] },
  { group: 'Backend', items: ['Node.js', 'Express', 'FastAPI', 'PostgreSQL', 'MongoDB', 'REST APIs'] },
  { group: 'Design', items: ['Figma', 'Adobe XD', 'Prototyping', 'User research', 'Design systems'] },
  { group: 'DevOps & tools', items: ['Git', 'Docker', 'AWS'] },
];
