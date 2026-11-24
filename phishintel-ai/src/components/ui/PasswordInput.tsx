"use client";

import React, { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  leftIcon?: React.ReactNode;
  containerClassName?: string;
  toggleButtonAriaLabel?: string;
}

/**
 * Animated Password Input with smooth Show/Hide eye icon toggle.
 * Maintains independent visibility state for each instance.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      leftIcon,
      containerClassName = "",
      className = "",
      id,
      name,
      value,
      onChange,
      placeholder = "••••••••••••",
      required = false,
      disabled = false,
      autoComplete = "current-password",
      minLength,
      toggleButtonAriaLabel,
      ...rest
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);

    const toggleVisibility = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setShowPassword((prev) => !prev);
    };

    const ariaLabel =
      toggleButtonAriaLabel ||
      (showPassword ? "Hide password" : "Show password");

    return (
      <div className={`relative w-full ${containerClassName}`}>
        {leftIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#6f796e] dark:text-[#a0aaa0] flex items-center justify-center z-10">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          minLength={minLength}
          className={`${leftIcon ? "pl-10" : "pl-4"} pr-11 ${className}`}
          {...rest}
        />

        <button
          type="button"
          onClick={toggleVisibility}
          disabled={disabled}
          aria-label={ariaLabel}
          title={ariaLabel}
          tabIndex={0}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#6f796e] hover:text-[#17211b] dark:text-[#889588] dark:hover:text-[#e5e7d7] hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#f8761b] focus:ring-offset-1 transition-colors z-10 disabled:opacity-40 disabled:cursor-not-allowed select-none flex items-center justify-center cursor-pointer"
        >
          <AnimatePresence mode="wait" initial={false}>
            {showPassword ? (
              <motion.span
                key="visible-eye"
                initial={{ opacity: 0, scale: 0.65, rotate: -25 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.65, rotate: 25 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.88 }}
                className="flex items-center justify-center"
              >
                <Eye className="w-4 h-4" />
              </motion.span>
            ) : (
              <motion.span
                key="hidden-eye"
                initial={{ opacity: 0, scale: 0.65, rotate: 25 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.65, rotate: -25 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.88 }}
                className="flex items-center justify-center"
              >
                <EyeOff className="w-4 h-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
export default PasswordInput;
