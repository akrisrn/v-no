export default function scroll(height: number, isSmooth = true) {
  document.documentElement.style.scrollBehavior = !isSmooth ? 'auto' : 'smooth';
  setTimeout(() => {
    scrollTo(0, height);
  }, 0);
}
