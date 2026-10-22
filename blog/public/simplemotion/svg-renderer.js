const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/// Renders evaluated SimpleMotion commands as SVG image elements.
export class SvgAnimationRenderer {
  /// Creates an SVG renderer with optional blank space around the Motion canvas.
  constructor(svg, { width, height, leftExtension = 0, rightExtension = 0 }) {
    this.svg = svg;
    this.leftExtension = leftExtension;
    this.images = document.createElementNS(SVG_NAMESPACE, "g");
    this.definitions = document.createElementNS(SVG_NAMESPACE, "defs");
    this.interaction = null;
    this.interactivePath = null;
    this.interactiveClipPath = null;
    this.interactiveClipShape = null;

    svg.setAttribute("viewBox", `0 0 ${width + leftExtension + rightExtension} ${height}`);
    svg.setAttribute("width", width + leftExtension + rightExtension);
    svg.setAttribute("height", height);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.style.pointerEvents = "none";
    this.images.setAttribute("transform", `translate(${leftExtension} 0)`);
    svg.replaceChildren(this.definitions, this.images);
  }

  /// Updates the SVG images in the supplied back-to-front command order.
  render(commands, imageUrls) {
    while (this.images.childElementCount > commands.length) {
      this.images.lastElementChild.remove();
    }

    commands.forEach((command, index) => {
      let image = this.images.children[index];
      if (!image) {
        image = document.createElementNS(SVG_NAMESPACE, "image");
        image.setAttribute("pointer-events", "none");
        image.setAttribute("x", "0");
        image.setAttribute("y", "0");
        image.setAttribute("width", "1");
        image.setAttribute("height", "1");
        // Matches Canvas2D's deliberate source-image stretch into the unit quad.
        image.setAttribute("preserveAspectRatio", "none");
        this.images.append(image);
      }

      image.setAttribute("href", imageUrls.get(command.icon));
      image.setAttribute("opacity", command.opacity);
      image.setAttribute("transform", matrix(command.matrix));
    });

    this.updateInteractivePath(commands);
  }

  /// Makes one vector outline clickable using the transform of a matching icon command.
  setInteractivePath({ icon, path, onClick }) {
    this.interaction = { icon, path, onClick };
    if (!this.interactivePath) {
      this.interactiveClipPath = document.createElementNS(SVG_NAMESPACE, "clipPath");
      this.interactiveClipPath.id = `simplemotion-hit-${crypto.randomUUID()}`;
      this.interactiveClipShape = document.createElementNS(SVG_NAMESPACE, "path");
      this.interactiveClipPath.append(this.interactiveClipShape);
      this.definitions.append(this.interactiveClipPath);

      this.interactivePath = document.createElementNS(SVG_NAMESPACE, "rect");
      this.interactivePath.setAttribute("x", "0");
      this.interactivePath.setAttribute("y", "0");
      this.interactivePath.setAttribute("width", "1");
      this.interactivePath.setAttribute("height", "1");
      this.interactivePath.setAttribute("fill", "transparent");
      this.interactivePath.setAttribute("pointer-events", "all");
      this.interactivePath.setAttribute("clip-path", `url(#${this.interactiveClipPath.id})`);
      this.interactivePath.style.cursor = "pointer";
      this.interactivePath.addEventListener("click", (event) => {
        event.stopPropagation();
        this.interaction?.onClick();
      });
      this.svg.append(this.interactivePath);
    }
    this.interactiveClipShape.setAttribute("d", path);
  }

  /// Makes the non-transparent pixels of one source image clickable.
  async setInteractiveImage({ icon, imageUrl, onClick }) {
    const path = await alphaClipPath(imageUrl);
    this.setInteractivePath({ icon, path, onClick });
  }

  /// Removes the optional SVG hit area.
  clearInteractivePath() {
    this.interaction = null;
    this.interactivePath?.remove();
    this.interactiveClipPath?.remove();
    this.interactivePath = null;
    this.interactiveClipPath = null;
    this.interactiveClipShape = null;
  }

  /// Aligns the hit outline with its source image's current affine transform.
  updateInteractivePath(commands) {
    if (!this.interaction || !this.interactivePath) return;

    const command = commands.find(({ icon }) => icon === this.interaction.icon);
    if (!command) {
      this.interactivePath.setAttribute("display", "none");
      return;
    }

    this.interactivePath.setAttribute("display", "");
    this.interactivePath.setAttribute(
      "transform",
      `translate(${this.leftExtension} 0) ${matrix(command.matrix)}`,
    );
  }
}

/// Converts SimpleMotion's column array into SVG's affine matrix syntax.
function matrix(values) {
  return `matrix(${values.join(" ")})`;
}

/// Converts a PNG's alpha channel into horizontal SVG path segments.
async function alphaClipPath(imageUrl) {
  const image = new Image();
  image.src = imageUrl;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const segments = [];

  for (let y = 0; y < canvas.height; y += 1) {
    let start = null;
    for (let x = 0; x <= canvas.width; x += 1) {
      const opaque = x < canvas.width && pixels[(y * canvas.width + x) * 4 + 3] > 0;
      if (opaque && start === null) start = x;
      if (!opaque && start !== null) {
        segments.push(rectanglePath(start, y, x, y + 1, canvas.width, canvas.height));
        start = null;
      }
    }
  }

  return segments.join("");
}

/// Creates one normalized SVG rectangle path for an opaque horizontal pixel run.
function rectanglePath(left, top, right, bottom, width, height) {
  const x1 = left / width;
  const y1 = top / height;
  const x2 = right / width;
  const y2 = bottom / height;
  return `M${x1} ${y1}H${x2}V${y2}H${x1}Z`;
}
