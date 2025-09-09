'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Mail, Github } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface HeroProps {
  name?: string;
  role?: string;
  tagline?: string;
  ctaHref?: string;
  ctaText?: string;
  secondaryHref?: string;
  secondaryText?: string;
  imageSrc?: string;
}

export const Hero: React.FC<HeroProps> = ({
  name = 'Your Name',
  role = 'Full Stack Developer',
  tagline = 'I build delightful web experiences with React, Next.js, and TypeScript.',
  ctaHref = '#contact',
  ctaText = 'Start a Project',
  secondaryHref = '/portfolio',
  secondaryText = 'View Work',
  imageSrc = '/images/profile.jpg',
}) => {
  const shouldReduceMotion = useReducedMotion();

  const container = {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.08, delayChildren: 0.06 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
  };

  return (
    <section
      aria-label="Hero"
      className="relative pt-20 pb-12 bg-white dark:bg-gray-900"
    >
      <div className="container mx-auto px-6">
        <motion.div
          initial={shouldReduceMotion ? 'show' : 'hidden'}
          animate="show"
          variants={container}
          className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center"
        >
          {/* Text column */}
          <motion.div variants={item} className="max-w-2xl">
            <p className="text-sm font-medium uppercase text-primary-600 dark:text-primary-400 mb-3">
              Hello, I’m {name.split(' ')[0]}
            </p>

            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-gray-100 mb-4">
              {role}.
            </h1>

            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">{tagline}</p>

            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <a href={ctaHref} aria-label={ctaText}>
                  {ctaText} <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>

              <Button
                variant="outline"
                size="md"
                asChild
                className="hidden sm:inline-flex"
              >
                <Link href={secondaryHref}>
                  <a aria-label={secondaryText} className="inline-flex items-center">
                    {secondaryText}
                  </a>
                </Link>
              </Button>

              {/* simple social links */}
              <div className="ml-0 sm:ml-2 flex items-center gap-2">
                <a
                  href="https://github.com/yourhandle"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  aria-label="GitHub"
                >
                  <Github className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                </a>

                <a
                  href="mailto:hello@yourdomain.com"
                  className="inline-flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  aria-label="Email"
                >
                  <Mail className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                </a>
              </div>
            </div>
          </motion.div>

          {/* Visual / image column */}
          <motion.div
            variants={item}
            className="flex justify-center lg:justify-end"
            aria-hidden={false}
          >
            <div className="relative w-56 h-56 md:w-72 md:h-72 rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5 dark:ring-white/5">
              <Image
                src={imageSrc}
                alt={`${name} portrait`}
                fill
                className="object-cover"
                priority
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
