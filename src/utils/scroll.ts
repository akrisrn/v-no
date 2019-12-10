import SmoothScroll from 'smooth-scroll';

const smoothScroll = new SmoothScroll();

export function scroll(height: number, isSmooth = true) {
    if (isSmooth) {
        smoothScroll.animateScroll(height);
    } else {
        scrollTo(0, height);
    }
}
