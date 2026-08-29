import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Target,
  Rocket,
  CheckCircle2,
  Sparkles,
  Lightbulb,
  CheckSquare,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  HelpCircle,
  Flame,
  Star,
  Compass,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface GeminiResponseRendererProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
  hideRawJson?: boolean;
  onSaveGoal?: (goalData: { title: string; tasks: string[] }) => void;
}

// Helper to detect section type and icon from heading text
function getSectionMeta(headingText: string): {
  icon: React.ReactNode;
  variant: 'goal' | 'phases' | 'action_steps' | 'next_step' | 'insights' | 'challenge' | 'general';
  title: string;
  badgeLabel?: string;
} {
  const clean = headingText.trim();
  const lower = clean.toLowerCase();

  if (clean.includes('🎯') || lower.includes('goal') || lower.includes('objective')) {
    return {
      icon: <Target className="w-4 h-4 text-amber-500" />,
      variant: 'goal',
      title: clean.replace(/^[#\s🎯]+/, '').trim() || 'Goal',
      badgeLabel: 'Primary Goal',
    };
  }

  if (clean.includes('🚀') || lower.includes('phase') || lower.includes('roadmap') || lower.includes('milestone')) {
    return {
      icon: <Rocket className="w-4 h-4 text-sky-500" />,
      variant: 'phases',
      title: clean.replace(/^[#\s🚀]+/, '').trim() || 'Phases & Roadmap',
      badgeLabel: 'Roadmap',
    };
  }

  if (
    clean.includes('✅') ||
    lower.includes('action step') ||
    lower.includes('action items') ||
    lower.includes('checklist') ||
    lower.includes('steps to take')
  ) {
    return {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      variant: 'action_steps',
      title: clean.replace(/^[#\s✅]+/, '').trim() || 'Action Steps',
      badgeLabel: 'Checklist',
    };
  }

  if (
    clean.includes('✨') ||
    lower.includes('next step') ||
    lower.includes('immediate focus') ||
    lower.includes('key takeaway') ||
    lower.includes('daily focus')
  ) {
    return {
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
      variant: 'next_step',
      title: clean.replace(/^[#\s✨]+/, '').trim() || 'Next Step',
      badgeLabel: 'Immediate Focus',
    };
  }

  if (clean.includes('💡') || lower.includes('insight') || lower.includes('idea') || lower.includes('brainstorm')) {
    return {
      icon: <Lightbulb className="w-4 h-4 text-yellow-400" />,
      variant: 'insights',
      title: clean.replace(/^[#\s💡]+/, '').trim() || 'Key Insights',
      badgeLabel: 'Insight',
    };
  }

  if (clean.includes('🛡️') || clean.includes('🔍') || lower.includes('challenge') || lower.includes('blind spot') || lower.includes('question')) {
    return {
      icon: <HelpCircle className="w-4 h-4 text-purple-400" />,
      variant: 'challenge',
      title: clean.replace(/^[#\s🛡️🔍]+/, '').trim() || 'Reflection Inquiry',
      badgeLabel: 'Deep Question',
    };
  }

  return {
    icon: <Sparkles className="w-4 h-4 text-stone-400" />,
    variant: 'general',
    title: clean.replace(/^[#\s]+/, '').trim(),
  };
}

// Clean code block with Copy button
const CodeBlock: React.FC<{
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  hideRawJson?: boolean;
}> = ({ inline, className, children, hideRawJson }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const textContent = String(children).replace(/\n$/, '');

  // If this is a machine-readable JSON block (like goal extraction), hide or minimize
  if (language === 'json' && hideRawJson && textContent.includes('goalTitle')) {
    return null;
  }

  if (inline) {
    return (
      <code className="px-1.5 py-0.5 rounded-md bg-stone-200/80 dark:bg-stone-800/90 text-amber-800 dark:text-amber-300 font-mono text-[13px] border border-stone-300/40 dark:border-stone-700/50">
        {children}
      </code>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-2xl overflow-hidden bg-stone-950 text-stone-100 border border-stone-800 shadow-md">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-stone-900 border-b border-stone-800/80 text-[11px] text-stone-400 font-mono">
        <span>{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-stone-200 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed text-stone-200">
        <code>{children}</code>
      </pre>
    </div>
  );
};

export const GeminiResponseRenderer: React.FC<GeminiResponseRendererProps> = ({
  content,
  isStreaming = false,
  className = '',
  hideRawJson = true,
}) => {
  if (!content || content.trim().length === 0) {
    return null;
  }

  // Pre-process content to remove any unclosed trailing raw JSON if hidden
  let processedContent = content;
  if (hideRawJson) {
    processedContent = processedContent.replace(/```json\s*\{[\s\S]*?\}\s*```/g, '').trim();
    // Also clean up any unclosed json block if in streaming mode
    if (isStreaming && processedContent.includes('```json')) {
      processedContent = processedContent.split('```json')[0].trim();
    }
  }

  return (
    <div className={`gemini-formatted-response text-stone-800 dark:text-stone-100 text-sm leading-relaxed space-y-3.5 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Heading 1 & 2
          h1: ({ node, children, ...props }) => {
            const rawText = String(children);
            const meta = getSectionMeta(rawText);
            return (
              <div className="pt-3 pb-1 border-b border-stone-200/80 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                    {meta.icon}
                  </span>
                  <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-50 tracking-tight" {...props}>
                    {meta.title}
                  </h2>
                </div>
              </div>
            );
          },
          h2: ({ node, children, ...props }) => {
            const rawText = String(children);
            const meta = getSectionMeta(rawText);
            return (
              <div className="pt-3 pb-1">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-stone-200/80 dark:bg-stone-800/80 text-amber-700 dark:text-amber-400">
                    {meta.icon}
                  </span>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 tracking-tight" {...props}>
                    {meta.title}
                  </h3>
                  {meta.badgeLabel && (
                    <span className="ml-auto text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100/90 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                      {meta.badgeLabel}
                    </span>
                  )}
                </div>
              </div>
            );
          },
          // Heading 3 & 4: Highlighted section blocks for Action Plans & Special Sections
          h3: ({ node, children, ...props }) => {
            const rawText = String(children);
            const meta = getSectionMeta(rawText);

            if (meta.variant === 'goal') {
              return (
                <div className="mt-4 mb-2 p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300/70 dark:border-amber-800/60 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-200/90 dark:bg-amber-900/70 flex items-center justify-center text-amber-900 dark:text-amber-200 shadow-2xs">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 dark:text-amber-400">
                        Target Objective
                      </span>
                      <h4 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100">
                        {meta.title}
                      </h4>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                    🎯 Goal
                  </span>
                </div>
              );
            }

            if (meta.variant === 'phases') {
              return (
                <div className="mt-4 mb-2 p-3 rounded-2xl bg-sky-500/10 dark:bg-sky-950/30 border border-sky-300/60 dark:border-sky-800/50 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-200 dark:bg-sky-900/70 flex items-center justify-center text-sky-800 dark:text-sky-300">
                    <Rocket className="w-4 h-4" />
                  </div>
                  <h4 className="font-serif text-sm font-semibold text-sky-950 dark:text-sky-200">
                    {meta.title}
                  </h4>
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-200/70 dark:bg-sky-900/60 text-sky-900 dark:text-sky-300">
                    🚀 Phases
                  </span>
                </div>
              );
            }

            if (meta.variant === 'action_steps') {
              return (
                <div className="mt-4 mb-2 p-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-300/60 dark:border-emerald-800/50 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-200 dark:bg-emerald-900/70 flex items-center justify-center text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <h4 className="font-serif text-sm font-semibold text-emerald-950 dark:text-emerald-200">
                    {meta.title}
                  </h4>
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-300">
                    ✅ Action Steps
                  </span>
                </div>
              );
            }

            if (meta.variant === 'next_step') {
              return (
                <div className="mt-4 mb-2 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 dark:from-amber-950/50 dark:to-orange-950/40 border border-amber-300/80 dark:border-amber-700/60 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-300/80 dark:bg-amber-800/80 flex items-center justify-center text-amber-950 dark:text-amber-100">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 dark:text-amber-400">
                        Immediate Action
                      </span>
                      <h4 className="font-serif text-sm font-bold text-stone-900 dark:text-stone-100">
                        {meta.title}
                      </h4>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                    ✨ Next Step
                  </span>
                </div>
              );
            }

            return (
              <h4 className="font-serif text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 mt-3.5 mb-1.5 flex items-center gap-1.5" {...props}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>{meta.title}</span>
              </h4>
            );
          },
          h4: ({ node, children, ...props }) => (
            <h5 className="font-serif text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200 mt-2 mb-1 uppercase tracking-wider text-stone-600 dark:text-stone-400" {...props}>
              {children}
            </h5>
          ),

          // Paragraphs
          p: ({ node, children, ...props }) => (
            <p className="text-stone-800 dark:text-stone-200 leading-relaxed font-normal text-sm" {...props}>
              {children}
            </p>
          ),

          // Strong / Bold
          strong: ({ node, children, ...props }) => (
            <strong className="font-semibold text-stone-900 dark:text-stone-100" {...props}>
              {children}
            </strong>
          ),

          // Emphasis / Italic
          em: ({ node, children, ...props }) => (
            <em className="italic text-stone-700 dark:text-stone-300 font-serif" {...props}>
              {children}
            </em>
          ),

          // Unordered Lists
          ul: ({ node, children, ...props }) => (
            <ul className="space-y-1.5 my-2 pl-1" {...props}>
              {children}
            </ul>
          ),

          // Ordered Lists
          ol: ({ node, children, ...props }) => (
            <ol className="space-y-2 my-2.5 pl-1 counter-reset-list" {...props}>
              {children}
            </ol>
          ),

          // List Items
          li: ({ node, children, ...props }) => {
            const raw = String(children);
            const isChecked = raw.startsWith('[x]') || raw.startsWith('✅');
            const isUnchecked = raw.startsWith('[ ]');

            if (isChecked || isUnchecked) {
              return (
                <li className="flex items-start gap-2.5 p-2 rounded-xl bg-stone-200/40 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/50 text-xs sm:text-sm text-stone-800 dark:text-stone-200">
                  <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${isChecked ? 'text-emerald-500' : 'text-stone-400'}`} />
                  <div className="flex-1 leading-snug">
                    {children}
                  </div>
                </li>
              );
            }

            return (
              <li className="flex items-start gap-2 text-stone-800 dark:text-stone-200 text-xs sm:text-sm leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80 dark:bg-amber-400 shrink-0 mt-2" />
                <div className="flex-1">{children}</div>
              </li>
            );
          },

          // Blockquotes
          blockquote: ({ node, children, ...props }) => (
            <blockquote className="my-3 p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border-l-3 border-amber-500 dark:border-amber-400 text-stone-800 dark:text-stone-200 italic font-serif text-sm leading-relaxed">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 not-italic" />
                <div className="space-y-1">{children}</div>
              </div>
            </blockquote>
          ),

          // Tables
          table: ({ node, children, ...props }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xs">
              <table className="w-full text-xs text-left" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ node, children, ...props }) => (
            <thead className="bg-stone-200/70 dark:bg-stone-800/80 text-stone-900 dark:text-stone-100 font-semibold border-b border-stone-200 dark:border-stone-700" {...props}>
              {children}
            </thead>
          ),
          tbody: ({ node, children, ...props }) => (
            <tbody className="divide-y divide-stone-200/60 dark:divide-stone-800" {...props}>
              {children}
            </tbody>
          ),
          tr: ({ node, children, ...props }) => (
            <tr className="hover:bg-stone-100/50 dark:hover:bg-stone-800/40 transition-colors" {...props}>
              {children}
            </tr>
          ),
          th: ({ node, children, ...props }) => (
            <th className="px-3 py-2 font-semibold text-stone-900 dark:text-stone-100" {...props}>
              {children}
            </th>
          ),
          td: ({ node, children, ...props }) => (
            <td className="px-3 py-2 text-stone-700 dark:text-stone-300" {...props}>
              {children}
            </td>
          ),

          // Code blocks
          code: ({ node, className, children, ...props }) => (
            <CodeBlock
              className={className}
              inline={!className}
              hideRawJson={hideRawJson}
              {...props}
            >
              {children}
            </CodeBlock>
          ),

          // Links
          a: ({ node, href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 dark:text-amber-400 underline hover:text-amber-700 dark:hover:text-amber-300 font-medium"
              {...props}
            >
              {children}
            </a>
          ),

          // Horizontal rule
          hr: () => <hr className="my-4 border-stone-200 dark:border-stone-800" />,
        }}
      >
        {processedContent}
      </ReactMarkdown>

      {/* Streaming cursor indicator */}
      {isStreaming && (
        <span className="inline-block w-2 h-3.5 bg-amber-500 dark:bg-amber-400 animate-pulse rounded-xs ml-1" />
      )}
    </div>
  );
};
