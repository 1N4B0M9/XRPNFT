export default function StepIndicator({ steps, currentStep, onStepClick }) {
  return (
    <div className="flex items-center gap-1 w-full">
      {steps.map((step, idx) => {
        const isCurrent = idx === currentStep;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <button
              onClick={() => onStepClick?.(idx)}
              className="flex items-center gap-2.5 shrink-0 transition-all cursor-pointer group"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                  isCurrent
                    ? 'bg-primary-600 text-white ring-4 ring-primary-600/20'
                    : 'bg-surface-800 text-surface-500 group-hover:bg-surface-700 group-hover:text-white'
                }`}
              >
                {Icon ? (
                  <Icon className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-bold">{idx + 1}</span>
                )}
              </div>
              <div className="hidden sm:block">
                <p
                  className={`text-xs font-semibold transition-colors ${
                    isCurrent ? 'text-primary-400' : 'text-surface-500 group-hover:text-white'
                  }`}
                >
                  {step.label}
                </p>
              </div>
            </button>

            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div className="flex-1 mx-3">
                <div className="h-0.5 rounded-full bg-surface-800" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
