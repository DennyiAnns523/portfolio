'use client';

import Link from 'next/link';
import { Github, Linkedin, Twitter, Mail, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import React from 'react';

const DEFAULT_SOCIAL = [
  { name: 'GitHub', href: 'https://github.com/yourusername', icon: Github },
  { name: 'LinkedIn', href: 'https://linkedin.com/in/yourusername', icon: Linkedin },
  { name: 'Twitter', href: 'https://twitter.com/yourusername', icon: Twitter },
  { name: 'Email', href: 'mailto:your.email@example.com', icon: Mail },
];

const DEFAULT_QUICKLINKS = [
  { name: 'About', href: '#about' },
  { name: 'Projects', href: '#projects' },
  { name: 'Blog', href: '/blog' },
  { name: 'Contact', href: '#contact' },
];

export function Footer({
  name = 'Your Name',
  description = 'Full Stack Developer passionate about creating exceptional digital experiences with modern technologies and clean, efficient code.',
  socialLinks = DEFAULT_SOCIAL,
  quickLinks = DEFAULT_QUICKLINKS,
  contact = { email: 'your.email@example.com', phone: '+1 (555) 000-0000' },
}: {
  name?: string;
  description?: string;
  socialLinks?: { name: string; href: string; icon: any }[];
  quickLinks?: { name: string; href: string }[];
  contact?: { email: string; phone?: string };
}) {
  const currentYear = new Date().getFullYear();

  // Helper - picks Link for internal and <a> for external/hash/mailto
  const NavLink: React.FC<{ href: string; children: React.ReactNode; className?: string }> = ({ href, children, className = '' }) => {
    const isInternal = href.startsWith('/') || href.startsWith('#');
    if (isInternal) {
      return (
        <Link href={href} className={className}>
          {children}
        </Link>
      );
    }
    return (
      // external link
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  };

  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <NavLink href="/" className="text-2xl font-bold mb-4 block">
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                {name}
              </span>
            </NavLink>

            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">{description}</p>

            <div className="flex items-center space-x-3">
              {socialLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <motion.a
                    key={link.name}
                    href={link.href}
                    target={link.href.startsWith('mailto:') ? undefined : '_blank'}
                    rel={link.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                    aria-label={link.name}
                    className="inline-flex items-center justify-center p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 dark:border-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden />
                    <span className="sr-only">{link.name}</span>
                  </motion.a>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <NavLink
                    href={link.href}
                    className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
                  >
                    {link.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Get in Touch</h3>
            <div className="space-y-2 text-gray-600 dark:text-gray-400">
              <a href={`mailto:${contact.email}`} className="block break-all hover:underline">
                {contact.email}
              </a>
              {contact.phone && (
                <a href={`tel:${contact.phone.replace(/\s+/g, '')}`} className="block hover:underline">
                  {contact.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between text-gray-600 dark:text-gray-400">
          <p className="text-sm">
            © {currentYear} {name}. Built with <Heart className="inline-block h-4 w-4 align-middle mx-1" aria-hidden /> and care.
          </p>

          <div className="mt-4 md:mt-0 text-sm">
            <NavLink href="/privacy" className="mr-4 hover:underline">
              Privacy
            </NavLink>
            <NavLink href="/terms" className="hover:underline">
              Terms
            </NavLink>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
