// Samples the average color of an image (a local object URL — same-origin,
// so canvas pixel reads are safe) for use as a 3D-viewer backdrop color.
export function getAverageColor(imageSrc) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const size = 32;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 10) continue;
          r += data[i]; g += data[i + 1]; b += data[i + 2];
          count++;
        }
        if (!count) return resolve("#171012");
        const darken = (c) => Math.round((c / count) * 0.5);
        const hex = "#" + [darken(r), darken(g), darken(b)].map((c) => c.toString(16).padStart(2, "0")).join("");
        resolve(hex);
      } catch {
        resolve("#171012");
      }
    };
    img.onerror = () => resolve("#171012");
    img.src = imageSrc;
  });
}
