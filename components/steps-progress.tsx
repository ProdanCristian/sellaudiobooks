"use client"

interface Step {
  number: number
  label: string
}

interface StepsProgressProps {
  currentStep: number
  showScrollHint?: boolean
  steps?: Step[]
  className?: string
}

interface StepBadgeProps {
  stepNumber: number
  currentStep: number
  className?: string
}

const defaultSteps: Step[] = [
  { number: 1, label: "Script" },
  { number: 2, label: "Voice" },
  { number: 3, label: "Images" },
  { number: 4, label: "Video" }
]

export const StepsProgress = ({ 
  currentStep, 
  showScrollHint = false, 
  steps = defaultSteps,
  className = ""
}: StepsProgressProps) => {
  return (
    <div className={`sticky top-[64px] sm:top-[80px] z-40 bg-background/80 backdrop-blur-md border-b border-border py-3 sm:py-4 ${className}`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-1 sm:gap-2 md:gap-4 mb-3 sm:mb-4 px-2 sm:px-4">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              {/* Step */}
              <div className="flex items-center gap-1 sm:gap-2">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border-2 transition-all duration-300 shadow-lg ${
                  currentStep >= step.number - 1
                    ? 'bg-green-500/20 border-green-500 text-green-600 dark:text-green-300 shadow-green-500/20' 
                    : 'bg-muted border-border text-muted-foreground'
                }`}>
                  {step.number}
                </div>
                <span className={`text-xs sm:text-sm font-medium transition-all duration-300 hidden sm:inline ${
                  currentStep >= step.number - 1 ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.label}
                </span>
              </div>

              {/* Connection Line (don't show after last step) */}
              {index < steps.length - 1 && (
                <div className={`w-4 sm:w-8 md:w-16 h-0.5 sm:h-1 rounded-full transition-all duration-500 ml-1 sm:ml-2 md:ml-4 ${
                  currentStep >= step.number ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-border'
                }`}></div>
              )}
            </div>
          ))}
        </div>

        {/* Scroll Hint */}
        {showScrollHint && (
          <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-300 text-sm animate-pulse">
            <div className="w-4 h-4 border-2 border-green-600 dark:border-green-300 border-t-transparent rounded-full animate-spin"></div>
            <span>Continue to next step below ↓</span>
          </div>
        )}
      </div>
    </div>
  )
}

export const StepBadge = ({ 
  stepNumber, 
  currentStep,
  className = ""
}: StepBadgeProps) => {
  return (
    <div className={`absolute -top-2 -left-2 z-10 ${className}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 shadow-lg ${
        currentStep >= stepNumber - 1
          ? 'bg-green-500/20 border-green-500 text-green-600 dark:text-green-300 shadow-green-500/20' 
          : 'bg-muted border-border text-muted-foreground'
      }`}>
        {stepNumber}
      </div>
    </div>
  )
}