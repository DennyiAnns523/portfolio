'use client';

import { motion } from 'framer-motion';
import { Code, Palette, Database, Smartphone, Globe, Zap } from 'lucide-react';

const skillCategories = [
  {
    title: 'Frontend Development',
    icon: Code,
    color: 'bg-blue-500',
    skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Framer Motion'],
    description: 'Creating responsive and interactive user interfaces',
  },
  {
    title: 'Backend Development',
    icon: Database,
    color: 'bg-green-500',
    skills: ['Node.js', 'Express.js', 'PostgreSQL', 'MongoDB', 'REST APIs'],
    description: 'Building robust server-side applications and APIs',
  },
  {
    title: 'UI/UX Design',
    icon: Palette,
    color: 'bg-purple-500',
    skills: ['Figma', 'Adobe XD', 'Prototyping', 'User Research', 'Design Systems'],
    description: 'Designing beautiful and user-friendly interfaces',
  },
  {
    title: 'Mobile Development',
    icon: Smartphone,
    color: 'bg-pink-500',
    skills: ['React Native', 'Expo', 'iOS', 'Android', 'App Store'],
    description: 'Creating cross-platform mobile applications',
  },
  {
    title: 'DevOps & Tools',
    icon: Globe,
    color: 'bg-orange-500',
    skills: ['Git', 'Docker', 'AWS', 'Vercel', 'CI/CD'],
    description: 'Managing deployment and development workflows',
  },
  {
    title: 'Performance & SEO',
    icon: Zap,
    color: 'bg-yellow-500',
    skills: ['Web Vitals', 'Lighthouse', 'SEO', 'Analytics', 'Optimization'],
    description: 'Optimizing websites for speed and search engines',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
    },
  },
};

export function Skills() {
  return (
    <section id="skills" className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            My <span className="text-primary-600 dark:text-primary-400">Skills</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            A comprehensive overview of my technical expertise and the tools I use to bring ideas to life.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {skillCategories.map((category, index) => (
            <motion.div
              key={category.title}
              variants={itemVariants}
              className="group"
            >
              <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 h-full">
                {/* Icon */}
                <div className="relative mb-6">
                  <div className={`${category.color} w-16 h-16 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <category.icon className="h-8 w-8 text-white" />
                  </div>
                  
                  {/* Decorative element */}
                  <div className={`absolute -top-2 -right-2 w-6 h-6 ${category.color} opacity-20 rounded-full group-hover:scale-150 transition-transform duration-300`} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                  {category.title}
                </h3>
                
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  {category.description}
                </p>

                {/* Skills */}
                <div className="space-y-3">
                  {category.skills.map((skill, skillIndex) => (
                    <motion.div
                      key={skill}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ 
                        duration: 0.4, 
                        delay: (index * 0.2) + (skillIndex * 0.1) 
                      }}
                      className="flex items-center"
                    >
                      <div className={`w-2 h-2 ${category.color} rounded-full mr-3 flex-shrink-0`} />
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {skill}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-accent-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Skills Progress Bars */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-2xl font-bold mb-8 text-center text-gray-900 dark:text-white">
            Technical Proficiency
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { name: 'JavaScript/TypeScript', level: 95 },
              { name: 'React/Next.js', level: 90 },
              { name: 'Node.js/Express', level: 85 },
              { name: 'UI/UX Design', level: 80 },
              { name: 'Database Design', level: 85 },
              { name: 'DevOps/Deployment', level: 75 },
            ].map((skill, index) => (
              <div key={skill.name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {skill.name}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {skill.level}%
                  </span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${skill.level}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, delay: index * 0.1 }}
                    className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}