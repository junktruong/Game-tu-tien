import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
  children: ReactNode;
};

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={`btn btn-${variant}`} {...rest}>
      {children}
    </button>
  );
}
