# 🌟 Portfolio Website

A modern, fully responsive portfolio website showcasing my journey as an AI adventurer and developer, built with Next.js and deployed on Vercel.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://den-s-portfolio-4737.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🚀 Live Demo

Visit the live website: [https://den-s-portfolio-4737.vercel.app/](https://den-s-portfolio-4737.vercel.app/)

## 📋 About

This portfolio website serves as a comprehensive showcase of my work, skills, and academic journey. As a student at IIT Mandi specializing in Intelligent Systems, this project represents my exploration into web development and AI/ML technologies.

### Key Features

- **Responsive Design** - Fully optimized for desktop, tablet, and mobile devices
- **Modern UI/UX** - Clean, professional interface with smooth animations
- **TypeScript** - Full type safety and better developer experience
- **Modular Architecture** - Well-organized component structure for scalability
- **Theme Support** - Dark/Light mode toggle with ThemeProvider
- **Custom Animations** - Engaging UI elements with FloatingElements and TypewriterEffect
- **Project Showcase** - Detailed presentation of featured projects and research work
- **Experience Timeline** - Visual representation of educational background and achievements
- **Skills Matrix** - Comprehensive overview of technical expertise
- **Contact Integration** - Easy-to-use contact form for collaboration opportunities
- **Content Management** - Structured content directories for blog and projects

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS with PostCSS
- **UI Components:** Custom React components
- **Animations:** Custom animation components (FloatingElements, TypewriterEffect)
- **Theme:** Dark/Light mode with ThemeProvider

### Deployment
- **Platform:** Vercel
- **CI/CD:** Automatic deployment from GitHub

### Development Tools
- **Linting:** ESLint
- **Type Checking:** TypeScript
- **Package Manager:** npm

## 📂 Project Structure

```
portfolio/
├── .gitignore
├── README.md
├── content/                    # Content management
│   ├── blog/                  # Blog posts (future)
│   └── projects/              # Project content files
├── eslint.config.mjs
├── next.config.js
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.js
├── public/                     # Static assets
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── favicon.ico
│   │   ├── globals.css       # Global styles
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Home page
│   ├── components/
│   │   ├── animations/       # Animation components
│   │   │   ├── FloatingElements.tsx
│   │   │   └── TypewriterEffect.tsx
│   │   ├── layout/           # Layout components
│   │   │   ├── Footer.tsx
│   │   │   └── Header.tsx
│   │   ├── providers/        # Context providers
│   │   │   └── ThemeProvider.tsx
│   │   ├── sections/         # Page sections
│   │   │   ├── About.tsx
│   │   │   ├── Contact.tsx
│   │   │   ├── Experience.tsx
│   │   │   ├── Hero.tsx
│   │   │   ├── Projects.tsx
│   │   │   └── Skills.tsx
│   │   └── ui/               # Reusable UI components
│   │       └── Button.tsx
│   ├── data/                 # Static data
│   │   └── projects.ts
│   ├── lib/                  # Utility functions
│   │   └── utils.ts
│   └── types/                # TypeScript type definitions
│       └── index.ts
├── tailwind.config.js
└── tsconfig.json
```

## 🎨 Sections

### 1. Hero Section
Introduction with a brief tagline: "AI adventurer and a newbee developer"

### 2. About Me
Personal introduction highlighting:
- Background as an IIT Mandi student
- Specialization in Intelligent Systems
- Journey into web development
- Interests in AI/ML and full-stack development

### 3. Skills
Technical expertise categories:
- **Frontend Development:** React, Next.js, Tailwind CSS
- **Backend Development:** Node.js, APIs, Database Management
- **UI/UX Design:** Figma, Responsive Design
- **AI/ML:** Machine Learning Models, Deep Learning
- **DevOps & Tools:** Git, Docker, CI/CD

### 4. Academic Journey
Educational timeline featuring:
- **B.Tech in Computer Science** - NIT Nagaland (Class of 2023)
  - Final Year Project: Forehead crease biometric recognition
- **Internship** - Cybersecurity and Digital Forensics
- **M.Tech** - IIT Mandi (Current)
  - Research focus: Cognitive modeling of cyberattack simulations

### 5. Projects
Featured works including:
- **Portfolio Website** - This project
- **AdaDistill HeadCrease** - Adaptive knowledge distillation for face recognition
- **Student Attendance Management System** - Web-based management solution
- **Music Recommendation Chatbot** - Emotion-based music recommendations
- **Banking App UI Design** - Modern banking application interface

### 6. Contact
Multiple channels for collaboration and communication

## 🚦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/DennyiAnns523/portfolio.git
cd portfolio
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Run the development server
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
# or
yarn build
yarn start
```

## 📝 Customization

To customize this portfolio for your own use:

1. **Update Personal Information**
   - Edit content in `/src/data/projects.ts`
   - Modify component text in `/src/components/sections/`
   - Update static assets in `/public/`

2. **Add/Remove Projects**
   - Update the projects data in `/src/data/projects.ts`
   - Add project content files to `/content/projects/`

3. **Customize Components**
   - Modify existing components in `/src/components/`
   - Add new UI components in `/src/components/ui/`
   - Create new sections in `/src/components/sections/`

4. **Styling**
   - Adjust Tailwind classes in component files
   - Customize color scheme and theme in `tailwind.config.js`
   - Modify global styles in `/src/app/globals.css`

5. **Animations**
   - Edit animation components in `/src/components/animations/`
   - Create new animation effects as needed

6. **Type Definitions**
   - Update TypeScript types in `/src/types/index.ts`
   - Add new type definitions as your project grows

## 🎯 Future Enhancements

- [ ] Blog section with MDX support
- [ ] Enhanced theme customization options
- [ ] More animation variations and transitions
- [ ] Integration with headless CMS for easier content updates
- [ ] Advanced project filtering and search
- [ ] Performance optimizations and lazy loading
- [ ] SEO improvements and metadata management
- [ ] Analytics integration
- [ ] Newsletter subscription feature
- [ ] Multi-language support

## 📧 Contact

**DENNYI ANNS**
- Portfolio: [https://den-s-portfolio-4737.vercel.app/](https://den-s-portfolio-4737.vercel.app/)
- GitHub: [@DennyiAnns523](https://github.com/DennyiAnns523)
- Institution: IIT Mandi

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built as part of my learning journey in web development
- Inspired by modern portfolio designs and best practices
- Special thanks to the IIT Mandi community

---

⭐ If you find this project helpful, please consider giving it a star!

**Note:** This portfolio is actively maintained and regularly updated with new projects and achievements.
