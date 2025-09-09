'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormState {
  loading: boolean;
  success: boolean;
  error: string | null;
}

const contactInfo = [
  {
    icon: Mail,
    label: 'Email',
    value: 'your.email@example.com',
    href: 'mailto:your.email@example.com',
  },
  {
    icon: Phone,
    label: 'Phone',
    value: '+1 (555) 123-4567',
    href: 'tel:+15551234567',
  },
  // Prefer a real map link instead of "#"
  {
    icon: MapPin,
    label: 'Location',
    value: 'Your City, Country',
    href: 'https://www.google.com/maps/search/?api=1&query=Your+City+Country',
  },
];

export function Contact() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [formState, setFormState] = useState<FormState>({
    loading: false,
    success: false,
    error: null,
  });

  const formRef = useRef<HTMLFormElement | null>(null);
  const firstErrorRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Basic email regex for client-side validation
  const emailIsValid = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Generic input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Client-side validation: returns first invalid field element or null if valid
  const validate = (): (HTMLInputElement | HTMLTextAreaElement | null) => {
    const { name, email, subject, message } = formData;

    if (!name.trim()) {
      return formRef.current?.querySelector<HTMLInputElement>('#name') ?? null;
    }
    if (!email.trim() || !emailIsValid(email)) {
      return formRef.current?.querySelector<HTMLInputElement>('#email') ?? null;
    }
    if (!subject.trim()) {
      return formRef.current?.querySelector<HTMLInputElement>('#subject') ?? null;
    }
    if (!message.trim() || message.trim().length < 10) {
      return formRef.current?.querySelector<HTMLTextAreaElement>('#message') ?? null;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset any previous state
    setFormState({ loading: false, success: false, error: null });

    // Validate
    const invalidField = validate();
    if (invalidField) {
      // focus the first invalid field and show friendly error
      invalidField.focus();
      setFormState({ loading: false, success: false, error: 'Please complete the highlighted fields.' });
      return;
    }

    setFormState({ loading: true, success: false, error: null });

    try {
      // You can add an AbortController here if you want to cancel on unmount
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      // Try to parse JSON if present, but handle non-JSON responses gracefully
      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        // prefer backend-sent message, otherwise fallback
        const message = (data && (data.error || data.message)) || `Server returned ${response.status}`;
        throw new Error(message);
      }

      // Success
      setFormState({ loading: false, success: true, error: null });
      setFormData({ name: '', email: '', subject: '', message: '' });

      // Reset success notification after 5s
      setTimeout(() => setFormState((s) => ({ ...s, success: false })), 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setFormState({ loading: false, success: false, error: message });
    }
  };

  // If an error appears, focus the first field (if present)
  useEffect(() => {
    if (formState.error && !firstErrorRef.current && formRef.current) {
      const firstField = formRef.current.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
      firstField?.focus();
    }
  }, [formState.error]);

  return (
    <section id="contact" className="py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Get In <span className="text-primary-600 dark:text-primary-400">Touch</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Ready to start your next project? Let's discuss how we can work together to bring your ideas to life.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Let's start a conversation</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              I'm always interested in new opportunities and exciting projects. Whether you have a question, want to work together,
              or just want to say hello, I'd love to hear from you.
            </p>

            <div className="space-y-4 mb-8">
              {contactInfo.map((info, index) => {
                const Icon = info.icon;
                const isLink = !!info.href && info.href !== '#';
                const container = (
                  <div
                    className={`flex items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 ${isLink ? 'hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md' : ''}`}
                  >
                    <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg mr-4 transition-colors duration-300">
                      <Icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{info.label}</p>
                      <p className="text-gray-600 dark:text-gray-300">{info.value}</p>
                    </div>
                  </div>
                );

                return (
                  <motion.div
                    key={info.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.08 }}
                    className="group"
                  >
                    {isLink ? (
                      <a href={info.href} className="block" target="_blank" rel="noopener noreferrer" aria-label={info.label}>
                        {container}
                      </a>
                    ) : (
                      container
                    )}
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse" />
                <span className="text-green-700 dark:text-green-400 font-medium">Available for new projects</span>
              </div>
              <p className="text-green-600 dark:text-green-300 text-sm mt-1">Usually responds within 24 hours</p>
            </motion.div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* Success */}
              {formState.success && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center" role="status" aria-live="polite">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                  <span className="text-green-700 dark:text-green-300">
                    Message sent successfully! I'll get back to you soon.
                  </span>
                </motion.div>
              )}

              {/* Error */}
              {formState.error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center" role="alert" aria-live="assertive">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                  <span className="text-red-700 dark:text-red-300">{formState.error}</span>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Your Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    aria-required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors duration-200"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    aria-required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors duration-200"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject *
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  aria-required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors duration-200"
                  placeholder="Project Discussion"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  aria-required
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors duration-200 resize-vertical"
                  placeholder="Tell me about your project..."
                />
              </div>

              <Button
                type="submit"
                size="lg"
                loading={formState.loading}
                disabled={formState.loading}
                className="w-full flex items-center justify-center"
                aria-live="polite"
              >
                {formState.loading ? 'Sending...' : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>

              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                * Required fields. Your information is kept private and secure.
              </p>
            </form>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-16 p-8 bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-2xl border border-primary-200 dark:border-primary-800"
        >
          <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Prefer a quick chat?</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Sometimes a conversation is worth a thousand emails. Let's schedule a call to discuss your project.
          </p>

          <Button variant="outline" size="lg" asChild>
            <a href="mailto:your.email@example.com?subject=Schedule%20a%20Call" aria-label="Schedule a call via email">
              Schedule a Call
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

export default Contact;
