import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-primary-600 text-white hover:bg-primary-500 dark:bg-primary-600 dark:hover:bg-primary-500',
        secondary:
          'bg-surface-800 text-white hover:bg-surface-700 dark:bg-surface-800 dark:hover:bg-surface-700 border border-surface-700',
        outline:
          'border border-surface-700 bg-transparent hover:bg-surface-800 dark:border-surface-600 dark:hover:bg-surface-800',
        ghost: 'hover:bg-surface-800 dark:hover:bg-surface-800',
        destructive: 'bg-red-600 text-white hover:bg-red-500 dark:bg-red-600 dark:hover:bg-red-500',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-12 rounded-xl px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
