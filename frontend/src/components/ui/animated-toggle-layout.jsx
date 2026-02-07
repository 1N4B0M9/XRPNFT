"use client";

import * as React from "react";
import { LayoutGroup, motion } from "motion/react";
import { List, Columns2, Columns4 } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";

const LAYOUT_CONFIGS = [
  { mode: "list", className: "flex flex-col space-y-4", label: "list view", icon: List },
  { mode: "2col", className: "grid grid-cols-2 gap-4", label: "2 column view", icon: Columns2 },
  {
    mode: "4col",
    className: "grid grid-cols-2 md:grid-cols-4 gap-4",
    label: "4 column view",
    icon: Columns4,
  },
];

const ANIMATION_VARIANTS = {
  container: {
    list: { transition: { staggerChildren: 0.02 } },
    "2col": { transition: { staggerChildren: 0.1 } },
    "4col": { transition: { staggerChildren: 0.15 } },
  },
  card: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    hover: {
      scale: 1.02,
      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.15)",
    },
  },
};

function LayoutButton({ isSelected, onClick, isMiddle, label, icon: Icon }) {
  return (
    <div className="relative">
      {isSelected && (
        <motion.div
          className="absolute inset-0 rounded-sm bg-surface-800"
          layoutId="layout-toggle-buttons"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <Button
        type="button"
        onClick={onClick}
        variant="ghost"
        size="icon"
        aria-label={label}
        className={cn(
          "relative h-9 w-9 rounded-none bg-transparent hover:bg-surface-800/40 hover:text-white",
          isMiddle && "border-x border-surface-600",
          label === "4 column view"
            ? "cursor-not-allowed opacity-50 md:cursor-pointer md:opacity-100"
            : "",
          isSelected ? "text-white" : "text-surface-400"
        )}
      >
        <Icon className="h-4 w-4" />
      </Button>
    </div>
  );
}

export const ContainerToggle = React.forwardRef(
  ({ children, className, defaultMode = 2, ...props }, ref) => {
    const [modeIndex, setModeIndex] = React.useState(defaultMode);
    const currentConfig = LAYOUT_CONFIGS[modeIndex];

    return (
      <div ref={ref} className={cn(className)} {...props}>
        <div className="mb-6 flex w-fit rounded-sm border border-surface-700">
          {LAYOUT_CONFIGS.map((config, idx) => (
            <LayoutButton
              key={config.mode}
              isSelected={modeIndex === idx}
              onClick={() => setModeIndex(idx)}
              isMiddle={idx > 0 && idx < LAYOUT_CONFIGS.length - 1}
              label={config.label}
              icon={config.icon}
            />
          ))}
        </div>
        <LayoutGroup>
          <motion.div
            layout
            variants={ANIMATION_VARIANTS.container}
            initial={currentConfig.mode}
            animate={currentConfig.mode}
            className={currentConfig.className}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          >
            {children}
          </motion.div>
        </LayoutGroup>
      </div>
    );
  }
);
ContainerToggle.displayName = "ContainerToggle";

export const CellToggle = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <motion.div
      layout
      variants={ANIMATION_VARIANTS.card}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      exit="hidden"
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      className={cn(className)}
      ref={ref}
      {...props}
    >
      {children}
    </motion.div>
  );
});
CellToggle.displayName = "CellToggle";
