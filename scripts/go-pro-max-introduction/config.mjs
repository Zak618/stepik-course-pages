export const course = 305734;
export const lesson = 2700348;
export const unit = 2740161;
export const version = 'go-max-intro-20261120-2';
export const folder = 'courses/305734-go-pro-max/introduction';
export const base = 'https://zak618.github.io/stepik-course-pages/';
export const privateDir = '.local-publication/go-pro-max-intro-release-20261120';

// Stepik allows height calculations, but removes positioning and padding-bottom.
// Native samples include Stepik's sidebar and margins at each viewport width.
export function heightFor(samples) {
  let expression = String(samples[0].height) + 'px';
  for (let index = 1; index < samples.length; index++) {
    const previous = samples[index - 1], current = samples[index];
    const difference = current.height - previous.height;
    if (!difference) continue;
    const slope = Math.abs(difference) / (current.width - previous.width);
    expression += (difference > 0 ? ' + ' : ' - ') + `clamp(0px, calc(${Number((slope * 100).toFixed(6))}vw - ${Number((slope * previous.width).toFixed(6))}px), ${Math.abs(difference)}px)`;
  }
  return 'calc(' + expression + ')';
}

export function frameText(page) {
  const samples = page.nativeSamples || page.samples;
  return `<div style="font-size:0;margin:0;"><iframe height="${Math.max(...samples.map(sample => sample.height))}" src="${base}${folder}/${page.file}?embed=1&amp;v=${version}" style="border:0;width:100%;height:${heightFor(samples)};margin:0;background:#fff;" width="100%"></iframe></div>`;
}
