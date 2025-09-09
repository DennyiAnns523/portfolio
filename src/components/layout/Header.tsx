'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const NAVIGATION = [
  { name: 'Home', href: '#home' },
  { name: 'About', href: '#about' },
  { name: 'Skills', href: '#skills' },
  { name: 'Experience', href: '#experience' },
  { name: 'Projects', href: '#projects' },
  { name: 'Contact', href: '#contact' },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  // hydration guard
  useEffect(() => {
    setMounted(true);
  }, []);

  // Scroll handler: sets scrolled + active section. Runs on mount and on scroll/resize.
  useEffect(() => {
    const sections = NAVIGATION.map((item) => item.href.replace('#', ''));

    const handleScroll = () => {
      const offset = window.scrollY;
      setScrolled(offset > 50);

      // find currently visible section
      const current = sections.find((section) => {
        const el = document.getElementById(section);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        // tuned: check element that crosses a 100px line from top
        return rect.top <= 100 && rect.bottom > 100;
      });

      if (current) setActiveSection(current);
    };

    // listen to scroll and resize
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  // close mobile menu on escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // close mobile menu when clicking outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!isOpen) return;
      const target = e.target as Node | null;
      if (mobileMenuRef.current && target && !mobileMenuRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [isOpen]);

  // Generic scroll-to handler that supports hashes and external/internal links
  const scrollTo = (href: string) => {
    // hash -> smooth scroll
    if (href.startsWith('#')) {
      const el = document.querySelector(href);
      if (el) {
        (el as HTMLElement).scrollIntoView({ behavior: 'smooth' });
      }
      setIsOpen(false);
      return;
    }

    // internal route (starts with /) -> use next/link (we fallback to location for safety)
    if (href.startsWith('/')) {
      // next/link is used where appropriate; for programmatic navigation you might want router.push
      window.location.href = href;
      setIsOpen(false);
      return;
    }

    // external -> open in new tab
    window.open(href, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const toggleTheme = () => {
    // cycle: dark -> light -> system -> dark
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  const getThemeIcon = () => {
    if (!mounted) return <Monitor className="h-4 w-4" />;
    if (theme === 'dark') return <Moon className="h-4 w-4" />;
    if (theme === 'light') return <Sun className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  return (
    <motion.header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700'
          : 'bg-transparent'
      )}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.45 }}
      role="banner"
    >
      <nav
        className="container mx-auto px-6 py-4"
        aria-label="Primary"
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <Link href="/" className="text-2xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded">
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                Your Name
              </span>
            </Link>
          </motion.div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {NAVIGATION.map((item, idx) => {
              const id = item.href.replace('#', '');
              const isActive = activeSection === id;
              return (
                <motion.button
                  key={item.name}
                  onClick={() => scrollTo(item.href)}
                  className={cn(
                    'relative px-3 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded',
                    isActive
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * idx }}
                >
                  {item.name}
                  {isActive && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
                      layoutId="activeSection"
                      transition={{ duration: 0.25 }}
                      aria-hidden
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Theme toggle & mobile menu button */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hidden md:flex focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {getThemeIcon()}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen((s) => !s)}
              className="md:hidden focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-expanded={isOpen}
              aria-controls="mobile-navigation"
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              id="mobile-navigation"
              ref={mobileMenuRef}
              className="md:hidden mt-4 pb-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28 }}
              role="region"
              aria-label="Mobile"
            >
              <div className="flex flex-col space-y-2 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-700">
                {NAVIGATION.map((item) => {
                  const id = item.href.replace('#', '');
                  const isActive = activeSection === id;
                  return (
                    <button
                      key={item.name}
                      onClick={() => scrollTo(item.href)}
                      className={cn(
                        'text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                        isActive
                          ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {item.name}
                    </button>
                  );
                })}

                <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleTheme}
                    className="w-full justify-start"
                    aria-label="Toggle theme"
                  >
                    {getThemeIcon()}
                    <span className="ml-2">
                      {theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System'} Mode
                    </span>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}

export default Header;
