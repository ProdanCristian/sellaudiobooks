'use client';

import type { HTMLAttributes } from 'react';
import { memo } from 'react';
import ReactMarkdown, { type Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

export type AIResponseProps = HTMLAttributes<HTMLDivElement> & {
  options?: Options;
  children: Options['children'];
};

const components: Options['components'] = {
  ol: ({ node: _node, children, className, ..._props }) => (
    <ol className={cn('ml-4 list-outside list-decimal', className)} {..._props}>
      {children}
    </ol>
  ),
  li: ({ node: _node, children, className, ..._props }) => (
    <li className={cn('py-1', className)} {..._props}>
      {children}
    </li>
  ),
  ul: ({ node: _node, children, className, ..._props }) => (
    <ul className={cn('ml-4 list-outside list-disc', className)} {..._props}>
      {children}
    </ul>
  ),
  strong: ({ node: _node, children, className, ..._props }) => (
    <span className={cn('font-semibold', className)} {..._props}>
      {children}
    </span>
  ),
  a: ({ node: _node, children, className, ..._props }) => (
    <a
      className={cn('font-medium text-primary underline hover:text-primary/80', className)}
      rel="noreferrer"
      target="_blank"
      {..._props}
    >
      {children}
    </a>
  ),
  h1: ({ node: _node, children, className, ..._props }) => (
    <h1
      className={cn('mt-6 mb-2 font-semibold text-2xl', className)}
      {..._props}
    >
      {children}
    </h1>
  ),
  h2: ({ node: _node, children, className, ..._props }) => (
    <h2
      className={cn('mt-5 mb-2 font-semibold text-xl', className)}
      {..._props}
    >
      {children}
    </h2>
  ),
  h3: ({ node: _node, children, className, ..._props }) => (
    <h3 className={cn('mt-4 mb-2 font-semibold text-lg', className)} {..._props}>
      {children}
    </h3>
  ),
  h4: ({ node: _node, children, className, ..._props }) => (
    <h4 className={cn('mt-4 mb-2 font-semibold text-base', className)} {..._props}>
      {children}
    </h4>
  ),
  h5: ({ node: _node, children, className, ..._props }) => (
    <h5
      className={cn('mt-3 mb-2 font-semibold text-sm', className)}
      {..._props}
    >
      {children}
    </h5>
  ),
  h6: ({ node: _node, children, className, ..._props }) => (
    <h6 className={cn('mt-3 mb-2 font-semibold text-xs', className)} {..._props}>
      {children}
    </h6>
  ),
  p: ({ node: _node, children, className, ..._props }) => (
    <p className={cn('leading-relaxed', className)} {..._props}>
      {children}
    </p>
  ),
  blockquote: ({ node: _node, children, className, ..._props }) => (
    <blockquote 
      className={cn('border-l-4 border-border pl-4 my-4 italic text-muted-foreground', className)} 
      {..._props}
    >
      {children}
    </blockquote>
  ),
  code: ({ node: _node, className, children, ..._props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const isInline = !match;
    
    if (isInline) {
      return (
        <code 
          className={cn('bg-muted px-1.5 py-0.5 rounded text-sm font-mono', className)} 
          {..._props}
        >
          {children}
        </code>
      );
    }
    
    return (
      <div className="my-4 relative">
        <div className="bg-muted/50 border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b text-xs text-muted-foreground">
            <span>{match[1]}</span>
          </div>
          <pre className="p-4 overflow-x-auto">
            <code className={cn('text-sm font-mono', className)} {..._props}>
              {children}
            </code>
          </pre>
        </div>
      </div>
    );
  },
  pre: ({ node: _node, children, className, ..._props }) => {
    // Handle pre tags that contain code
    return <>{children}</>;
  },
  table: ({ node: _node, children, className, ..._props }) => (
    <div className="my-4 overflow-x-auto">
      <table className={cn('w-full border-collapse border border-border', className)} {..._props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ node: _node, children, className, ..._props }) => (
    <thead className={cn('bg-muted/50', className)} {..._props}>
      {children}
    </thead>
  ),
  tbody: ({ node: _node, children, className, ..._props }) => (
    <tbody className={className} {..._props}>
      {children}
    </tbody>
  ),
  tr: ({ node: _node, children, className, ..._props }) => (
    <tr className={cn('border-b border-border', className)} {..._props}>
      {children}
    </tr>
  ),
  th: ({ node: _node, children, className, ..._props }) => (
    <th className={cn('border border-border px-3 py-2 text-left font-semibold', className)} {..._props}>
      {children}
    </th>
  ),
  td: ({ node: _node, children, className, ..._props }) => (
    <td className={cn('border border-border px-3 py-2', className)} {..._props}>
      {children}
    </td>
  ),
  hr: ({ node: _node, className, ..._props }) => (
    <hr className={cn('my-6 border-border', className)} {..._props} />
  ),
};

export const AIResponse = memo(
  ({ className, options, children, ..._props }: AIResponseProps) => (
    <div
      className={cn(
        'size-full prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        'prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground',
        'prose-code:text-foreground prose-pre:text-foreground prose-blockquote:text-muted-foreground',
        'prose-th:text-foreground prose-td:text-foreground prose-li:text-foreground',
        className
      )}
      {..._props}
    >
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm]}
        {...options}
      >
        {children}
      </ReactMarkdown>
    </div>
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

AIResponse.displayName = 'AIResponse';