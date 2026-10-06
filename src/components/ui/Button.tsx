import React from 'react';
import { ButtonVariant } from '@/common/enums';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: `${ButtonVariant}`;
    children: React.ReactNode;
}

// Generic reusable button — style variants to be added as needed.
export default function Button({ variant = ButtonVariant.Primary, children, ...props }: ButtonProps) {
    return (
        <button data-variant={variant} {...props}>
            {children}
        </button>
    );
}
