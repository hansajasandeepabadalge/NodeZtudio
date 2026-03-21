import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'ghost' | 'danger';
    children: React.ReactNode;
}

// Generic reusable button — style variants to be added as needed.
export default function Button({ variant = 'primary', children, ...props }: ButtonProps) {
    return (
        <button data-variant={variant} {...props}>
            {children}
        </button>
    );
}
