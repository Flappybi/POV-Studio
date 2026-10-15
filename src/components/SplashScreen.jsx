export default function SplashScreen() {
  return <div className="splash-screen" role="status" aria-label="Opening POV Studio" aria-live="polite">
    <div className="splash-content">
      <span className="splash-mark" aria-hidden="true"><span className="pov-symbol"/></span>
      <div className="splash-wordmark">POV <span>Studio</span></div>
      <p>Advertising From Your POV</p>
      <span className="splash-loader" aria-hidden="true"><span/></span>
    </div>
  </div>;
}
