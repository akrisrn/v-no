const prefix = 'v-no<%= VUE_APP_PUBLIC_PATH %>';
const isDark = localStorage.getItem(prefix + 'dark');
const isZen = localStorage.getItem(prefix + 'zen');
const themeColor = isDark ? (isZen ? '#2b2b2b' : '#3b3b3b') : (isZen ? '#efefef' : '#ffffff');
document.querySelector('meta[name=theme-color]')!.setAttribute('content', themeColor);
const classList = document.body.classList;
if (isDark) {
  classList.add('dark');
} else {
  classList.remove('dark');
}
if (isZen) {
  classList.add('zen');
} else {
  classList.remove('zen');
}
