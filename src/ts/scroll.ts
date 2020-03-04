import SmoothScroll from 'smooth-scroll';

const smoothScroll = new SmoothScroll(undefined, {
    speed: 100,
});

export function scroll(height: number, isSmooth = true) {
    if (isSmooth) {
        smoothScroll.animateScroll(height);
    } else {
        scrollTo(0, height);
    }
}
