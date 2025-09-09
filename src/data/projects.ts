export const projects = [
  {
    id: '1',
    title: 'E-Commerce Platform',
    description: 'A modern e-commerce platform with shopping cart, payment integration, and admin dashboard.',
    longDescription: `
      A full-featured e-commerce platform built with Next.js and Stripe integration. 
      Features include user authentication, product management, shopping cart functionality, 
      and a complete admin dashboard for inventory management.
    `,
    image: '/images/projects/ecommerce.jpg',
    images: [
      '/images/projects/ecommerce-1.jpg',
      '/images/projects/ecommerce-2.jpg',
      '/images/projects/ecommerce-3.jpg',
    ],
    technologies: ['Next.js', 'TypeScript', 'Stripe', 'PostgreSQL', 'Tailwind CSS'],
    category: 'web' as const,
    featured: true,
    githubUrl: 'https://github.com/yourusername/ecommerce-platform',
    liveUrl: 'https://your-ecommerce-demo.vercel.app',
    status: 'completed' as const,
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-03-20'),
    slug: 'ecommerce-platform',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-03-20'),
  },
  {
    id: '2',
    title: 'Task Management App',
    description: 'A collaborative task management application with real-time updates and team features.',
    longDescription: `
      A comprehensive task management solution with real-time collaboration features. 
      Built with React and Socket.io for live updates, featuring drag-and-drop kanban boards, 
      team management, and progress tracking.
    `,
    image: '/images/projects/taskapp.jpg',
    images: [
      '/images/projects/taskapp-1.jpg',
      '/images/projects/taskapp-2.jpg',
    ],
    technologies: ['React', 'Node.js', 'Socket.io', 'MongoDB', 'Material-UI'],
    category: 'web' as const,
    featured: true,
    githubUrl: 'https://github.com/yourusername/task-manager',
    liveUrl: 'https://your-taskapp-demo.vercel.app',
    status: 'completed' as const,
    startDate: new Date('2023-10-01'),
    endDate: new Date('2023-12-15'),
    slug: 'task-management-app',
    createdAt: new Date('2023-10-01'),
    updatedAt: new Date('2023-12-15'),
  },
  {
    id: '3',
    title: 'Portfolio Website',
    description: 'A modern, responsive portfolio website built with Next.js and Framer Motion.',
    longDescription: `
      A personal portfolio website showcasing projects, skills, and experience. 
      Built with Next.js 14, TypeScript, and Framer Motion for smooth animations. 
      Features dark mode, responsive design, and optimized performance.
    `,
    image: '/images/projects/portfolio.jpg',
    images: [
      '/images/projects/portfolio-1.jpg',
      '/images/projects/portfolio-2.jpg',
    ],
    technologies: ['Next.js', 'TypeScript', 'Framer Motion', 'Tailwind CSS'],
    category: 'web' as const,
    featured: false,
    githubUrl: 'https://github.com/yourusername/portfolio',
    liveUrl: 'https://yourportfolio.com',
    status: 'completed' as const,
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-02-28'),
    slug: 'portfolio-website',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-28'),
  },
  {
    id: '4',
    title: 'Weather Mobile App',
    description: 'A cross-platform weather app with location-based forecasts and beautiful UI.',
    longDescription: `
      A React Native weather application providing accurate weather forecasts 
      with location-based services. Features include hourly and weekly forecasts, 
      weather maps, and push notifications for severe weather alerts.
    `,
    image: '/images/projects/weather-app.jpg',
    images: [
      '/images/projects/weather-app-1.jpg',
      '/images/projects/weather-app-2.jpg',
    ],
    technologies: ['React Native', 'Expo', 'Weather API', 'AsyncStorage'],
    category: 'mobile' as const,
    featured: false,
    githubUrl: 'https://github.com/yourusername/weather-app',
    liveUrl: 'https://expo.dev/@yourusername/weather-app',
    status: 'completed' as const,
    startDate: new Date('2023-08-01'),
    endDate: new Date('2023-09-15'),
    slug: 'weather-mobile-app',
    createdAt: new Date('2023-08-01'),
    updatedAt: new Date('2023-09-15'),
  },
  {
    id: '5',
    title: 'Banking App UI Design',
    description: 'Modern UI/UX design for a banking application with focus on user experience.',
    longDescription: `
      A complete UI/UX design for a modern banking application focusing on 
      user experience and accessibility. Includes user research, wireframes, 
      prototypes, and a comprehensive design system.
    `,
    image: '/images/projects/banking-ui.jpg',
    images: [
      '/images/projects/banking-ui-1.jpg',
      '/images/projects/banking-ui-2.jpg',
      '/images/projects/banking-ui-3.jpg',
    ],
    technologies: ['Figma', 'Adobe XD', 'Prototyping', 'User Research'],
    category: 'ui-ux' as const,
    featured: true,
    liveUrl: 'https://www.figma.com/file/banking-app-design',
    status: 'completed' as const,
    startDate: new Date('2023-11-01'),
    endDate: new Date('2023-12-01'),
    slug: 'banking-app-ui-design',
    createdAt: new Date('2023-11-01'),
    updatedAt: new Date('2023-12-01'),
  },
  {
    id: '6',
    title: 'Blog Platform',
    description: 'A full-stack blog platform with content management and user authentication.',
    longDescription: `
      A comprehensive blogging platform with content management system, 
      user authentication, comment system, and analytics. Built with modern 
      web technologies and optimized for SEO and performance.
    `,
    image: '/images/projects/blog-platform.jpg',
    technologies: ['Next.js', 'MDX', 'Prisma', 'PostgreSQL', 'NextAuth.js'],
    category: 'web' as const,
    featured: false,
    githubUrl: 'https://github.com/yourusername/blog-platform',
    liveUrl: 'https://your-blog-platform.vercel.app',
    status: 'in-progress' as const,
    startDate: new Date('2024-03-01'),
    slug: 'blog-platform',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-15'),
  },
];

// Helper functions
export const getFeaturedProjects = () => projects.filter(project => project.featured);

export const getProjectBySlug = (slug: string) => projects.find(project => project.slug === slug);

export const getProjectsByCategory = (category: string) => 
  projects.filter(project => project.category === category);

export const getProjectsByStatus = (status: string) => 
  projects.filter(project => project.status === status);