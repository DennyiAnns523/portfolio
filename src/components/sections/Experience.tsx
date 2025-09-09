'use client';

import { motion } from 'framer-motion';
import { Calendar, MapPin, ExternalLink } from 'lucide-react';
import Image from 'next/image';

const experiences = [
  {
    id: '1',
    company: 'Tech Startup Inc.',
    position: 'Senior Full Stack Developer',
    description: 'Led development of the main product using React, Node.js, and PostgreSQL. Collaborated with design and product teams to deliver high-quality features.',
    startDate: new Date('2022-03-01'),
    endDate: null,
    current: true,
    location: 'San Francisco, CA',
    type: 'full-time' as const,
    skills: ['React', 'Node.js', 'PostgreSQL', 'AWS', 'TypeScript'],
    achievements: [
      'Increased application performance by 40%',
      'Led a team of 4 developers',
      'Implemented CI/CD pipeline',
    ],
    companyUrl: 'https://techstartup.com',
    logo: '/images/companies/tech-startup.jpg',
  },
  {
    id: '2',
    company: 'Digital Agency Co.',
    position: 'Frontend Developer',
    description: 'Developed responsive websites and web applications for various clients. Specialized in React and modern CSS frameworks.',
    startDate: new Date('2021-01-15'),
    endDate: new Date('2022-02-28'),
    current: false,
    location: 'Remote',
    type: 'full-time' as const,
    skills: ['React', 'Sass', 'JavaScript', 'Figma', 'Git'],
    achievements: [
      'Delivered 15+ client projects',
      'Improved code review process',
      'Mentored junior developers',
    ],
    companyUrl: 'https://digitalagency.com',
    logo: '/images/companies/digital-agency.jpg',
  },
  {
    id: '3',
    company: 'Freelance',
    position: 'Web Developer',
    description: 'Worked with various small businesses to create their online presence. Built custom websites and e-commerce solutions.',
    startDate: new Date('2020-06-01'),
    endDate: new Date('2020-12-31'),
    current: false,
    location: 'Remote',
    type: 'freelance' as const,
    skills: ['WordPress', 'PHP', 'MySQL', 'HTML/CSS', 'JavaScript'],
    achievements: [
      'Completed 20+ projects',
      'Built long-term client relationships',
      'Learned business development skills',
    ],
    logo: '/images/companies/freelance.jpg',
  },
];

const formatDate = (date: Date | null) => {
  if (!date) return 'Present';
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const calculateDuration = (start: Date, end: Date | null) => {
  const endDate = end || new Date();
  const months = (endDate.getFullYear() - start.getFullYear()) * 12 + 
                 (endDate.getMonth() - start.getMonth());
  
  if (months < 12) {
    return `${months} month${months !== 1 ? 's' : ''}`;
  }
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`;
  }
  
  return `${years} year${years !== 1 ? 's' : ''} ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
};

export function Experience() {
  return (
    <section id="experience" className="py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Work <span className="text-primary-600 dark:text-primary-400">Experience</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            My professional journey and the exciting projects I've worked on.
          </p>
        </motion.div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 md:left-1/2 transform md:-translate-x-px top-0 bottom-0 w-0.5 bg-primary-200 dark:bg-primary-800"></div>

          {experiences.map((exp, index) => (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className={`relative flex items-center mb-12 ${
                index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
              }`}
            >
              {/* Timeline dot */}
              <div className="absolute left-8 md:left-1/2 transform -translate-x-1/2 w-4 h-4 bg-primary-600 dark:bg-primary-400 rounded-full border-4 border-white dark:border-gray-900 z-10">
                {exp.current && (
                  <div className="absolute inset-0 bg-primary-600 dark:bg-primary-400 rounded-full animate-ping"></div>
                )}
              </div>

              {/* Content */}
              <div className={`w-full md:w-5/12 ml-16 md:ml-0 ${
                index % 2 === 0 ? 'md:pr-8' : 'md:pl-8'
              }`}>
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {exp.logo && (
                        <div className="w-12 h-12 relative rounded-lg overflow-hidden bg-white dark:bg-gray-700 p-2">
                          <Image
                            src={exp.logo}
                            alt={exp.company}
                            fill
                            className="object-contain"
                          />
                        </div>
                      )}
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {exp.position}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {exp.companyUrl ? (
                            <a
                              href={exp.companyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 dark:text-primary-400 hover:underline flex items-center"
                            >
                              {exp.company}
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-primary-600 dark:text-primary-400 font-medium">
                              {exp.company}
                            </span>
                          )}
                          {exp.current && (
                            <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Date and Location */}
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>
                        {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{exp.location}</span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {calculateDuration(exp.startDate, exp.endDate)} • {exp.type}
                  </div>

                  {/* Description */}
                  <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                    {exp.description}
                  </p>

                  {/* Achievements */}
                  {exp.achievements && exp.achievements.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Key Achievements:
                      </h4>
                      <ul className="space-y-1">
                        {exp.achievements.map((achievement, i) => (
                          <li
                            key={i}
                            className="flex items-start text-sm text-gray-600 dark:text-gray-300"
                          >
                            <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                            {achievement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Skills */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Technologies Used:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {exp.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-md"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-16 p-8 bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-2xl border border-primary-200 dark:border-primary-800"
        >
          <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Ready for the Next Challenge
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
            I'm always excited to work on new projects and collaborate with talented teams. 
            Let's build something amazing together!
          </p>
          <motion.a
            href="#contact"
            className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Let's Work Together
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}