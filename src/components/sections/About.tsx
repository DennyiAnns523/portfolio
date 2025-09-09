'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Download, MapPin, Calendar, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const stats = [
  { label: 'Projects Completed', value: '50+' },
  { label: 'Years Experience', value: '3+' },
  { label: 'Happy Clients', value: '25+' },
  { label: 'Technologies', value: '20+' },
];

const interests = [
  'Web Development',
  'UI/UX Design',
  'Open Source',
  'Photography',
  'Travel',
  'Coffee ☕',
];

export function About() {
  return (
    <section id="about" className="py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            About <span className="text-primary-600 dark:text-primary-400">Me</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Get to know me better - my journey, passions, and what drives me to create exceptional digital experiences.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Image & Info */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative w-full max-w-lg mx-auto">
              <div className="aspect-square relative rounded-2xl overflow-hidden">
                <Image
                  src="/images/about-me.jpg"
                  alt="About me"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              
              {/* Floating Info Cards */}
              <motion.div
                className="absolute -top-4 -right-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-primary-600" />
                  <span className="text-sm font-medium">Your City</span>
                </div>
              </motion.div>
              
              <motion.div
                className="absolute -bottom-4 -left-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
              >
                <div className="flex items-center space-x-2">
                  <Coffee className="h-4 w-4 text-accent-600" />
                  <span className="text-sm font-medium">Coffee Lover</span>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
              Hello! I'm a Full Stack Developer
            </h3>
            
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                I'm a passionate Full Stack Developer with over 3 years of experience creating 
                exceptional digital experiences. I specialize in modern web technologies and 
                love turning complex problems into simple, beautiful designs.
              </p>
              
              <p>
                My journey in web development started during college when I built my first 
                website. Since then, I've worked with startups and established companies, 
                helping them bring their ideas to life through clean, efficient code.
              </p>
              
              <p>
                When I'm not coding, you can find me exploring new technologies, contributing 
                to open-source projects, or enjoying a good cup of coffee while planning my 
                next adventure.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 py-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
                >
                  <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Interests */}
            <div>
              <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">
                Interests & Hobbies
              </h4>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest, index) => (
                  <motion.span
                    key={interest}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                  >
                    {interest}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <a href="/resume.pdf" download>
                  <Download className="mr-2 h-4 w-4" />
                  Download Resume
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#contact">Let's Work Together</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}