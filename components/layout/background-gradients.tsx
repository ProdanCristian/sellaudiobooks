export default function BackgroundGradients() {
  return (
    <>
      {/* Top-left gradient */}
      <div className="fixed top-0 left-0 w-96 h-96 bg-gradient-to-br from-primary/30 via-primary/20 to-transparent rounded-full blur-3xl pointer-events-none z-0" />
      
      {/* Bottom-right gradient */}
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-primary/25 via-primary/15 to-transparent rounded-full blur-3xl pointer-events-none z-0" />
    </>
  )
}