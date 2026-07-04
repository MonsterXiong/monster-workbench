import { createImagePlaceholderSrc } from "../../utils/image-placeholder";

export function useImageWorkbenchImageFallback() {
  function handleImageLoad(event: Event) {
    const image = event.currentTarget as HTMLImageElement | null;
    const currentSrc = image?.currentSrc || image?.src || "";
    if (!image || currentSrc.startsWith("data:image/svg+xml")) {
      return;
    }

    delete image.dataset.fallbackImage;
    delete image.dataset.fallbackSource;
  }

  function handleImageLoadError(event: Event, sourcePath?: string | null) {
    const image = event.currentTarget as HTMLImageElement | null;
    if (!image) {
      return;
    }

    const failedSource = image.currentSrc || image.src || image.getAttribute("src") || "";
    if (image.dataset.fallbackImage === "true" && image.dataset.fallbackSource === failedSource) {
      return;
    }
    image.dataset.fallbackImage = "true";
    image.dataset.fallbackSource = failedSource;
    image.src = createImagePlaceholderSrc(sourcePath || image.getAttribute("src") || "");
  }

  return { handleImageLoad, handleImageLoadError };
}
